# 🪪 PNS — Portaldot Name Service

## Basic Info

- **Project Name:** PNS — Portaldot Name Service
- **Team:** Solo builder — Ashar (`@Ashar20`)
- **Repository:** https://github.com/Ashar20/PNS
- **Demo Video:** _[YouTube unlisted link — add after recording]_
- **Live Frontend:** _[Vercel URL — add after `pnpm run deploy:mainnet`]_
- **License:** Apache License 2.0
- **One-liner:** ENS-shaped naming for Portaldot — six ink! 5 contracts that compose `identity`, `multisig`, `proxy`, `bounties`, and `utility` pallets into one human-readable name, so a single signed extrinsic registers a name, mirrors it into every Substrate wallet as a sub-identity, and grants its holder a scoped native proxy all at once.

---

## Overview

On Portaldot, a user's display name lives in `pallet_identity`, their roles live in `pallet_proxy` delegations, their multisig membership is a derived account address, and their contribution history is scattered across bounty IDs in `pallet_bounties`. There is no human-readable layer that ties these together and no canonical permissionless way to register a name and bind these primitives to it. Wallets show raw SS58 addresses; communities have no shared addressable identity.

PNS is the name service for Portaldot. It is an ENS-shaped naming system rebuilt clean-room on ink! 5 and **composed with Portaldot's native Substrate pallets** rather than re-implementing them in smart contracts.

> *On Ethereum, ENS is one contract suite plus a dozen third-party contracts to coordinate around it. On Portaldot, PNS is one contract suite that talks to the chain's native coordination pallets directly.*

A user claims `silas.pot`, sets their profile, and has it appear in **every Polkadot.js-compatible wallet automatically** through the identity pallet — without those wallets needing to integrate PNS. A parent name like `bandit-dao.pot` becomes a **community**: owned by a native multisig, with subnames (`alice.bandit-dao.pot`) that are simultaneously a Substrate sub-identity, a scoped Substrate proxy (role = proxy type), and a PNS contract membership record — written in **one signed extrinsic**.

---

## The Signature Moment

Minting a subname fires one batched extrinsic that does three things atomically:

```
utility.batchAll([
  contracts.call  →  CommunityRegistrar.issue_subname   // writes the name graph
  identity.setSubs                                        // sub-identity appears in every wallet
  proxy.addProxy(NonTransfer / Governance / …)            // scoped role, native RBAC
])  // outer tx wrapped in multisig.asMulti
```

One user signature. Three native primitives composed. All three, or none.

---

## How It Uses Portaldot

- **POT is gas.** Every live extrinsic signed and paid in POT. Token: POT, 14 decimals, SS58 prefix 42.
- **6 ink! 5 smart contracts** deployed on a Portaldot-compatible `pallet_contracts` runtime — Registry, PublicResolver, ReverseRegistrar, Registrar, CommunityRegistrar, Attestation.
- **5 native pallets composed** via `utility.batchAll` rather than re-implemented: `pallet_identity` (sub-identities, judgements), `pallet_multisig` (community accounts), `pallet_proxy` (RBAC roles), `pallet_bounties` (contribution records), `pallet_utility` (atomic batching).
- **ENS-compatible namehash.** Node identifier = `keccak256`-based namehash, identical to ENS — composable, deterministic, portable.

---

## Technical Architecture

```
User
  │
  ▼
Next.js dApp ──────► @pns/sdk ──────► @polkadot/api · @polkadot/api-contract
  │                                         │
  │  signs extrinsics, batches via          ▼
  │  utility.batchAll          Portaldot node (Substrate · POT · ss58=42 · 14 dec)
  │                            ┌────────────────────────────────────────────┐
  │                            │  pallet_contracts  (ink! 5 Wasm)          │
  │                            │   Registry            name graph          │
  │                            │   PublicResolver      addr + text         │
  │                            │   ReverseRegistrar    primary name        │
  │                            │   Registrar           .pot TLD, FCFS      │
  │                            │   CommunityRegistrar  subnames + roles    │
  │                            │   Attestation         peer claims         │
  │                            ├────────────────────────────────────────────┤
  │                            │  native pallets (composed in batchAll)    │
  │                            │   identity   sub-identities, judgements   │
  │                            │   multisig   community accounts           │
  │                            │   proxy      roles as scoped delegates    │
  │                            │   bounties   contribution records         │
  │                            │   utility    batchAll atomicity           │
  │                            └────────────────────────────────────────────┘
  ▼
Trust boundary: contracts own the name graph; pallets own account state;
the SDK composes both into single utility.batchAll units.
```

---

## Smart Contracts (6 × ink! 5)

All contracts compiled with ink! 5.x, SS58 AccountId (32 bytes), ENS-compatible `keccak256` namehash via `ink::env::hash::Keccak256`. Cross-contract calls use `build_call` with hardcoded 4-byte selectors — never `contract_ref!` (computes wrong selectors in ink! 5).

| Contract | Lines | Responsibility |
|---|---|---|
| `Registry` | 324 | Source-of-truth name graph: owner, resolver, TTL, operator approvals |
| `PublicResolver` | 177 | addr, text records (arbitrary key→value), contenthash |
| `ReverseRegistrar` | 162 | Primary name per account, `.addr.reverse` namespace |
| `Registrar` | 242 | FCFS `.pot` TLD issuer, payable in POT, expiry-based availability |
| `CommunityRegistrar` | 283 | Issues subnames with role strings, open/gated membership |
| `Attestation` | 185 | Peer-to-peer claim graph (issuer_node → subject_node, typed schema) |
| **Total** | **1,373** | |

### Cross-contract authorization chain

Every mutating resolver/attestation call crosses into the Registry — no duplicated ownership logic:

```
Registrar.register               → Registry.set_subnode_owner   (writes new .pot subnode)
PublicResolver.set_text/set_addr → Registry.owner               (auth on every write)
ReverseRegistrar.set_name        → Registry.is_approved_for_all (auth check)
CommunityRegistrar.issue_subname → Registry.set_subnode_owner   (mints subnode)
Attestation.attest               → Registry.owner               (verifies issuer ownership)
```

Selectors: `owner = [0xfe, 0xae, 0xa4, 0xfa]`, `set_subnode_owner = [0x55, 0x25, 0x57, 0x50]` — `blake2b("message_name")[..4]`, big-endian.

Inner `build_call` uses `proof_size_limit(11_990_383_647_911_208_550)` (near-u64::MAX) for nested calls; outer transaction uses `proofSize: 524_288n` — matching the contracts pallet's accounting model.

### Registrar payable pattern (POT flows)

```rust
#[ink(message, payable)]
pub fn register(&mut self, label: String, owner: AccountId) -> Result<[u8; 32]> {
    let paid = self.env().transferred_value();
    if paid < self.price { return Err(Error::InsufficientPayment); }
    // cross-contract: Registry.set_subnode_owner
    let excess = paid.saturating_sub(self.price);
    if excess > 0 { self.env().transfer(self.env().caller(), excess).ok(); }
    Ok(subnode)
}
```

---

## TypeScript SDK (`@pns/sdk`)

**3,209 lines** of strict TypeScript. All flows return **unsigned** `SubmittableExtrinsic`s — the signer layer stays decoupled from the orchestration layer.

### Surface

| Module | Responsibility |
|---|---|
| `namehash.ts` | `namehash`, `normaliseName` (UTS46 fold + ASCII guard), `labelHash`, `namehashHex` |
| `client.ts` | `PNSClient` — connect, resolve name → owner + records + addr, reverse lookup |
| `flows/register.ts` | Unsigned batch: `Registrar.register` + optional `identity.setIdentity` mirror |
| `flows/save-profile.ts` | Unsigned batch: N × `resolver.set_text` + `set_addr` + `identity.setIdentity` + `ReverseRegistrar.set_name` |
| `flows/claim-subname.ts` | Unsigned batch: `community.issue_subname` + `identity.setSubs` + `proxy.addProxy`, wrapped in `multisig.asMulti` |
| `flows/issue-subname-owner.ts` | Single-signer fast-path for parent-name owner (skips the multisig wrap) |
| `flows/attest.ts` | Attest, revoke, list-by-subject, list-by-issuer |
| `pallets/identity.ts` | `hasIdentityPallet` — runtime detection, gracefully skips if absent |
| `pallets/proxy.ts` | `roleToProxyType`: `admin→Any`, `treasurer→NonTransfer`, `voter→Governance`, `staker→Staking`, `judge→IdentityJudgement` |
| `utils.ts` | `isZeroAccount`, `unwrapOk` (ink! 5 `{ ok: T }` unwrapper), `extractBatchError`, full `DispatchError` decoding, `signAndSend` |

### Runtime-aware identity mirror

```typescript
// pallets/identity.ts
export async function hasIdentityPallet(api: ApiPromise): Promise<boolean> {
  return typeof api.tx.identity?.setIdentity === "function";
}

// flows/register.ts
if (await hasIdentityPallet(api)) {
  calls.push(api.tx.identity.setIdentity({ display: { Raw: name }, ... }));
}
```

Same SDK and same dApp work against `substrate-contracts-node` (no `pallet_identity` — identity steps silently skipped) and Portaldot mainnet (full FRAME — steps run atomically in the batch).

### Defensive batch error reporting

`signAndSend` in `utils.ts` decodes `DispatchError` through runtime metadata, locates `BatchInterrupted`, counts `ItemCompleted` events for the failing call index, and surfaces:

```
contracts.ContractReverted · batchAll halted at call #03 (after 2 successful)
```

---

## Frontend (Next.js 14 App Router)

### Pages

| Route | Purpose |
|---|---|
| `/` | Landing + centred search, live availability as-you-type |
| `/search` | Search results with availability and claim CTA |
| `/<name>` | ENS-style profile: banner, avatar, social chips, text records, attestations, ownership sidebar |
| `/<name>/edit` | Batched profile editor — right-rail summarises every contract message + pallet call the save will run |
| `/<name>/attest` | Peer attestation form with pre-flight Registry ownership check |
| `/communities` | Directory of deployed CommunityRegistrar instances |
| `/c/<name>` | Community page: members list, roles, treasury balance, open bounties |
| `/c/<name>/invite` | Subname issuance wizard (community owner only) |
| `/communities/new` | Create-community wizard: signers, threshold, parent name |
| `/my-names` | Names owned by the connected wallet |
| `/wallet` | POT balance, fund + transfer |
| `/deck` | Full-screen pitch deck |
| `/docs` | In-app SDK + API documentation |

### Key components

`WalletConnect` · `NameInput` (live UTS46 normalisation) · `RecordEditor` · `RoleBadge` (proxy-type tooltip) · `JudgementBadge` · `AttestationFeed` · `SubnamesPanel` · `BountyCard`

### Signer

`apps/web/src/lib/signer.ts` — one `signAndSendTx` handles both dev `KeyringPair`s (`//Alice`) and extension-injected signers (`@polkadot/extension-dapp`). Full `DispatchError` decoding on failure; no generic "Extrinsic failed on-chain."

### Custom server (`server.mjs`)

Raw TCP WebSocket proxy on `/chain` path — forwards the browser's WebSocket connection to the local Substrate node at `NODE_WS`. Single ngrok tunnel exposes both the dApp and the node's RPC port without needing a second public domain.

---

## Scripts & Tooling

| Script | What it does |
|---|---|
| `scripts/chain-verify.ts` | Probes the runtime: pallet availability, identity field set, proxy types, deposit constants, `utility.batchAll`. Writes dated `docs/chain-verified.md`. |
| `scripts/deploy.ts` | Deploys 6 contracts in dependency order, wires `.pot` TLD (`Registry.set_subnode_owner(zero, keccak256("pot"), registrar)`), writes addresses to SDK constants. |
| `scripts/demo-seed.ts` | Idempotent demo state: funds dev accounts, registers demo names, builds a sample community. |
| `scripts/debug-attest.ts` | Attestation diagnostic: checks Registry ownership, auto-registers missing names, attempts the full attest flow, decodes every on-chain event. |

---

## Installation & Quickstart

### Requirements

- Node.js 20+, `pnpm`
- Rust + `cargo-contract` (`cargo install --force --locked cargo-contract`)
- `substrate-contracts-node` (local dev) or Portaldot dev/mainnet node
- Polkadot.js / Talisman / SubWallet browser extension, or `//Alice` dev seed

### Local dev

```bash
# 1. Start dev node
/path/to/substrate-contracts-node --dev --tmp --rpc-port 9944 --rpc-cors all

# 2. Install JS deps
pnpm install

# 3. Build all 6 contracts
for c in registry resolver reverse registrar community attestation; do
  (cd contracts/$c && cargo contract build --release)
done

# 4. Deploy + wire .pot TLD
pnpm run deploy:local            # writes packages/sdk/src/constants/local.ts

# 5. (Optional) seed demo state
pnpm demo:seed

# 6. Start the app
pnpm --filter @pns/web dev       # → http://localhost:3000
```

### Mainnet

```bash
export DEPLOYER_SEED="your funded mnemonic"
pnpm run deploy:mainnet          # writes packages/sdk/src/constants/mainnet.ts
# Set NEXT_PUBLIC_WS_ENDPOINT + 5 NEXT_PUBLIC_*_ADDRESS in apps/web/.env.local
pnpm --filter @pns/web build && pnpm --filter @pns/web start
```

### Tests

```bash
# Contract unit tests (all 6 crates, off-chain)
for c in registry resolver reverse registrar community attestation; do
  (cd contracts/$c && cargo test --lib)
done

# SDK integration tests (real node, no mocks)
pnpm --filter @pns/sdk test
```

---

## Demo Walkthrough

Five beats, five minutes:

| # | Beat | On-screen |
|---|---|---|
| 1 | **Claim** | Type `leo` → `leo.pot` available → sign → block confirms. Wallet shows `leo.pot` as a sub-identity — no wallet integration required. |
| 2 | **Profile** | Edit → set `com.twitter`, `description`, `avatar` → Save. One signature, up to 5 inner calls in one `batchAll`. Reload: gradient banner, real avatar, social chips. |
| 3 | **Community** | New community: `bandit-dao`, 2 signers, threshold 2. Multisig address computed client-side. `bandit-dao.pot` registered to the multisig account. |
| 4 | **Subname** | Invite → `alice`, role `treasurer` → sign as multisig. One `batchAll`: `issue_subname` + `setSubs` + `addProxy(NonTransfer)`. Alice's wallet shows the sub-identity. Chain explorer shows `NonTransfer` proxy. |
| 5 | **Attest** | A second community attests `alice.bandit-dao` with schema `endorsement.skill`, payload `"backend rust"`. Her profile shows the cross-community attestation. |

---

## Technical Highlights

- **6 ink! 5 contracts, 1,373 lines** — single-responsibility, deployed in dependency order, cross-contract calls via `build_call` with hardcoded selectors.
- **ENS-compatible namehash** — verified against published ENS test vectors byte-for-byte.
- **Atomic batching everywhere** — profile save (≤ 5 calls), subname issuance (3 calls), all inside `utility.batchAll`. Failure of any inner call reverts all.
- **Runtime-aware pallet detection** — same code runs on `substrate-contracts-node` (no identity pallet) and Portaldot mainnet (full FRAME); identity/proxy steps silently skipped when absent.
- **Role → native Substrate proxy** — `roleToProxyType` maps contract strings to pallet enum variants. The contract is the canonical record; the pallet enforces the authority.
- **Full `multisig.asMulti` composition** — subname batches are wrapped in `multisig.asMulti` so a community's M-of-N threshold is enforced natively on every membership action.
- **Defensive error decoding** — `BatchInterrupted` decoded to exact call index + pallet error; `ContractReverted` explained with context (e.g., "Register it first at /claim/leopard").
- **Pre-flight ownership checks** — attest page queries `Registry.owner(issuerNode)` before building the tx; clear UX error before any signature prompt.

---

## Repo Structure

```
pns/
  contracts/
    registry/        324 lines  — name graph
    resolver/        177 lines  — addr + text records
    reverse/         162 lines  — primary name
    registrar/       242 lines  — .pot TLD FCFS
    community/       283 lines  — subnames + roles
    attestation/     185 lines  — peer claim graph
  packages/sdk/      3,209 lines — namehash · flows · pallet helpers · utils
  apps/web/          Next.js 14, 13 pages, 16 components
  scripts/           chain-verify · deploy · demo-seed · debug-attest
  docs/              chain-verified.md
  vercel.json        Monorepo build config (builds SDK before web app)
```

---

## Stack

| Layer | Choice |
|---|---|
| Blockchain | Portaldot (Substrate, BABE + GRANDPA), `pallet_contracts` |
| Contracts | Rust + ink! 5.x → Wasm |
| SDK | TypeScript strict, `@polkadot/api`, `@polkadot/api-contract`, `@polkadot/util-crypto` |
| Frontend | Next.js 14 App Router, React 18, Tailwind CSS, React Query |
| Wallet | `@polkadot/extension-dapp` + dev keypairs |
| Token / fees | POT, 14 decimals, SS58 prefix 42 |

---

## Roadmap

- Mainnet deployment to Portaldot once full FRAME runtime is confirmed.
- Commit/reveal registrar (prevent front-running on contested labels).
- Multi-coin address support on the resolver.
- Playwright e2e tests driving a real browser extension.
- NameWrapper-style fuses for irrevocable subname delegation.

---

## Declaration

I confirm that:
1. All code was independently developed during this hackathon or legally modified from official Substrate / ink! templates.
2. All delivery requirements have been met.
3. I agree that the organizing committee may publicly review and technically reproduce the code.

**Team:** Ashar (`@Ashar20`, solo) · `silas.ashar5@gmail.com`
