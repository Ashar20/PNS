# PNS — Portaldot Name Service

**Track:** Onchain Identity & Coordination — Portaldot Mini Hackathon Online S1

---

## Project Overview

### Problem Statement

Web3 identity on Substrate is fragmented across the chain's native primitives.
A user's display name lives in `pallet_identity`, their roles live in `pallet_proxy`
delegations, their multisig membership is a derived account address, and their
contribution history is scattered across bounty IDs in `pallet_bounties`.
There is no human-readable layer that ties these together, and no canonical
permissionless mechanism for a user to register a name and bind these primitives
to it. Wallets show raw SS58 addresses; communities have no shared addressable
identity.

### Solution

**PNS is the name service for Portaldot.** It is an ENS-shaped naming system,
rebuilt clean-room on ink! 5 and composed with Portaldot's native Substrate
pallets (`identity`, `multisig`, `proxy`, `bounties`, `utility`) rather than
re-implementing them in smart contracts.

The pitch in one sentence:
> *PNS is one contract suite that talks to the chain's native coordination pallets directly.*

A user can claim `silas.pot`, set their profile, and have it appear in **every
Polkadot.js-compatible wallet automatically** through the identity pallet —
without those wallets needing to integrate PNS. A parent name like
`bandit-dao.pot` becomes a **community**: owned by a native multisig, with
subnames (`alice.bandit-dao.pot`) that are simultaneously a Substrate
sub-identity, a scoped Substrate proxy (role = proxy type), and a PNS contract
membership record — all written in a single signed extrinsic.

### Blockchain Relevance

- **6 ink! 5 smart contracts** deployed on a Portaldot-compatible local dev node, mirroring the ENS contract topology (`Registry`, `PublicResolver`, `ReverseRegistrar`, `Registrar`, `CommunityRegistrar`, `Attestation`).
- **5 native Substrate pallets composed** via the SDK rather than re-implemented (`pallet_identity`, `pallet_multisig`, `pallet_proxy`, `pallet_bounties`, `pallet_utility`).
- **The signature moment**: registering a subname runs `contracts.call(CommunityRegistrar.issue_subname) + identity.setSubs + proxy.addProxy` inside one `utility.batchAll`. All-or-nothing, one user signature, three native primitives composed.

---

## Technical Architecture

### Flow

```
User
 │
 ▼
Next.js dApp ──────► @pns/sdk ──────► @polkadot/api / api-contract
 │                                       │
 │                                       ▼
 │                            Portaldot / Substrate node
 │                            ┌─────────────────────────────────────┐
 │                            │  ink! contracts (pallet_contracts)  │
 │                            │   Registry         (name graph)     │
 │                            │   PublicResolver   (text + addr)    │
 │                            │   ReverseRegistrar (primary name)   │
 │                            │   Registrar        (.pot TLD FCFS)  │
 │                            │   CommunityRegistrar (subnames)     │
 │                            │   Attestation      (peer claims)    │
 │                            ├─────────────────────────────────────┤
 │                            │  native pallets (composed in batch) │
 │                            │   identity   sub-identities, badges │
 │                            │   multisig   community accounts     │
 │                            │   proxy      roles as scoped proxy  │
 │                            │   bounties   contribution records   │
 │                            │   utility    batchAll atomicity     │
 │                            └─────────────────────────────────────┘
 ▼
Trust boundaries: contracts own the name graph; pallets own the account state;
the SDK is the orchestration layer that composes contract calls with pallet
extrinsics into single utility.batchAll units.
```

### Core stack

| Layer | Choice |
| --- | --- |
| Blockchain | Portaldot (Substrate-based, BABE + GRANDPA), `pallet_contracts` runtime |
| Contracts | Rust + ink! 5.x, Wasm bytecode, namehash via `ink::env::hash::Keccak256` |
| SDK | TypeScript strict, `@polkadot/api`, `@polkadot/api-contract`, `@polkadot/util-crypto` |
| Frontend | Next.js 14 (App Router), React 18, Tailwind, React Query |
| Wallet | `@polkadot/extension-dapp` (Polkadot.js / Talisman / SubWallet) + dev keypairs |
| Token / fees | POT, 14 decimals, SS58 prefix `42` |
| CI | GitHub Actions — `cargo contract build` × 6, off-chain `#[ink::test]`, SDK integration tests against a real substrate-contracts-node service container |

### Repo layout

```
pns/
  contracts/             6 × ink! 5 contracts (registry, resolver, reverse,
                         registrar, community, attestation)
  packages/sdk/          @pns/sdk — typed wrappers, namehash, flows
  apps/web/              Next.js dApp
  scripts/
    chain-verify.ts      Probes connected node for pallet availability
    deploy.ts            Deploys all 6 contracts + wires the .pot TLD
    demo-seed.ts         Idempotent demo state seeder
  docs/
    chain-verified.md    Output of chain-verify against the current node
    portaldot-vs-pns.md  Co-existence with the identity pallet
```

---

## Smart Contracts

### Contract directory

```
contracts/
  registry/         Source-of-truth name graph (owner, resolver, ttl, operators)
  resolver/         PublicResolver — addr, text, contenthash records
  reverse/          ReverseRegistrar — primary name per account
  registrar/        FCFS issuer of <label>.pot, payable in POT
  community/        CommunityRegistrar — issues subnames with role mapping
  attestation/      Peer attestation graph (issuer_node → subject_node, schema)
```

### Functions exposed

| Contract | Key messages |
| --- | --- |
| `Registry` | `set_owner`, `set_subnode_owner`, `set_resolver`, `set_ttl`, `set_approval_for_all`, `owner`, `resolver`, `record_exists`, `is_approved_for_all` |
| `PublicResolver` | `set_addr` / `addr`, `set_text` / `text`, `set_contenthash` / `contenthash` |
| `ReverseRegistrar` | `claim_for(account, name)`, `set_name(name)`, `name_of(account)`, `node_for_account_msg(account)` |
| `Registrar` | `register(label, owner)` (payable), `renew`, `available`, `expiry_of`, `withdraw`, `set_price` |
| `CommunityRegistrar` | `issue_subname(label, member, role)`, `revoke_subname`, `set_role`, `role_of`, `is_member`, `members_count` |
| `Attestation` | `attest(issuer_node, subject_node, schema, payload)`, `revoke`, `get`, `list_by_subject`, `list_by_issuer` |

### Cross-contract composition

- `Registrar.register` → `Registry.set_subnode_owner` (writes ownership in same extrinsic as POT payment).
- `PublicResolver.set_text` / `set_addr` → `Registry.owner` for authorization on every write.
- `ReverseRegistrar.set_name` → `Registry.is_approved_for_all` for authorization.
- `CommunityRegistrar.issue_subname` → `Registry.set_subnode_owner` (mints the subnode).
- `Attestation.attest` → `Registry.owner` to verify issuer-node ownership.

### Live deployment (local dev node)

Deployed via `scripts/deploy.ts` against a `substrate-contracts-node` running at `ws://127.0.0.1:9944`. Addresses are auto-written into `packages/sdk/src/constants/local.ts` by the deploy script:

| Contract | Address |
| --- | --- |
| Registry | `5FqvNKsocSYRJpXZrLnbgJ68un3sGMT5VTL8dYoC213J42qe` |
| PublicResolver | `5EtzyTnLJy4aX8tprrk5mZsejyYVHxcqNt7jfgyJUyt48yFM` |
| ReverseRegistrar | `5EaJbgnUPKYvCDCsGP5tmiiAZgH43AkwnxehCm7qmUg5xNWv` |
| Registrar (`.pot` TLD) | `5FwogEHsySG6g4smJzqvG7yWs64UwUsTTzGy1hfZ3Dkjuz9z` |
| Attestation | `5EnPAE6pFKz4EaYNHwZDWWCx9SnpXat1xrUB9PgUDZDerbUY` |

`CommunityRegistrar` is deployed per-community via the server-side API route at `apps/web/src/app/api/community-registrar/route.ts` when a user clicks "Enable subnames" on a parent name.

Mainnet deployment is configured via `apps/web/.env.example` (`NEXT_PUBLIC_WS_ENDPOINT`, plus the 5 contract addresses); the same deploy script with `pnpm run deploy:mainnet` writes `packages/sdk/src/constants/mainnet.ts`.

> **Mainnet status:** Pending — deploy script (`pnpm run deploy:mainnet`) targets `wss://mainnet.portaldot.io`. Local deployment fully verified against `substrate-contracts-node`.

---

## SDK (`@pns/sdk`)

Typed orchestration layer between the contracts and the frontend.

| Surface | What it does |
| --- | --- |
| `namehash`, `normaliseName`, `labelHash` | ENS-compatible namehash; UTS46 fold + ASCII validation |
| `PNSClient` | Connect, resolve name → owner + records + addr, reverse lookup, batch reads |
| `flows/register.ts` (`buildRegisterNameTx`) | Unsigned batch: `Registrar.register` + `identity.setIdentity` mirror |
| `flows/save-profile.ts` (`buildSaveProfileTx`) | Unsigned batch: N × `resolver.set_text` + optional `set_addr` + optional `identity.setIdentity` + optional `ReverseRegistrar.set_name` |
| `flows/claim-subname.ts` | Unsigned batch: `community.issue_subname` + `identity.setSubs` + `proxy.addProxy`, wrapped in `multisig.asMulti` |
| `flows/issue-subname-owner.ts` | Single-signer fast path for the parent name's owner (skips the multisig wrap) |
| `flows/attest.ts` | Attestation issuance + listing |
| `pallets/identity.ts` (`hasIdentityPallet`) | Runtime detection — gracefully skips the identity mirror on runtimes without `pallet_identity` (e.g. `substrate-contracts-node`) |
| `pallets/proxy.ts` (`roleToProxyType`) | Role string → Substrate proxy type: `admin→Any`, `treasurer→NonTransfer`, `voter→Governance`, `staker→Staking`, `judge→IdentityJudgement` |

All flows return **unsigned** `SubmittableExtrinsic`s. The frontend (`apps/web/src/lib/signer.ts`) wraps signing for both dev `KeyringPair`s and extension-injected signers from `@polkadot/extension-dapp` — same code path works for `//Alice` and a real Polkadot.js extension account.

---

## Installation & Setup

### Requirements

- Node.js 20+ and `pnpm`
- Rust + `cargo-contract` (`cargo install --force --locked cargo-contract`)
- A Substrate node with `pallet_contracts` — either:
  - `substrate-contracts-node` for local dev (contracts-only runtime; identity-pallet sync is auto-skipped), or
  - Portaldot dev node / mainnet (full FRAME runtime — enables the identity / proxy / multisig / bounties batch composition)
- Polkadot.js extension (Chrome / Brave / Firefox) for browser signing, or any `//Alice` style dev seed

### Local dev — full path

```bash
# 1. Start a Substrate dev node with pallet_contracts
./substrate-contracts-node --dev --tmp --rpc-port 9944 --rpc-cors all

# 2. Install JS deps
pnpm install

# 3. Probe what the connected runtime exposes
pnpm chain:verify
# → writes docs/chain-verified.md (lists pallets, identity availability, ED, SS58)

# 4. Build all 6 ink! contracts
for c in registry resolver reverse registrar community attestation; do
  (cd contracts/$c && cargo contract build --release)
done

# 5. Deploy contracts + wire the .pot TLD on Registry
pnpm run deploy:local
# → writes packages/sdk/src/constants/local.ts

# 6. (Optional) Seed demo accounts and pre-register leo.pot + bandit-dao.pot
pnpm demo:seed

# 7. Start the dApp
pnpm --filter @pns/web dev
# → http://localhost:3000
```

### Mainnet deployment

```bash
# 1. Funded deployer seed (do NOT commit)
export DEPLOYER_SEED='your mnemonic'

# 2. Verify the target chain
pnpm chain:verify -- --mainnet

# 3. Build + deploy
pnpm run deploy:mainnet

# 4. Wire the frontend to mainnet via env (see apps/web/.env.example)
#    NEXT_PUBLIC_WS_ENDPOINT=wss://mainnet.portaldot.io
#    NEXT_PUBLIC_REGISTRY_ADDRESS=...
#    + four more

# 5. Build + serve
pnpm --filter @pns/web build && pnpm --filter @pns/web start
```

### Tests

```bash
# Off-chain contract unit tests (cargo test, all 6 crates)
for c in registry resolver reverse registrar community attestation; do
  (cd contracts/$c && cargo test --lib)
done

# SDK unit + integration tests (real node, no mocks)
pnpm --filter @pns/sdk test
```

---

## Demo

### Repository

`https://github.com/Ashar20/PNS`

### Demo video

https://youtu.be/K7rUuigKYss

### Transactions demo

[![Transactions demo](https://img.youtube.com/vi/-gWMLetXq38/maxresdefault.jpg)](https://youtu.be/-gWMLetXq38)

### Live demo

https://pns-web.vercel.app

### Demo scene description

A user lands on `/` (no AI-slop marketing — just **search**) and types `silas`
into the centered pill input. Availability resolves live as they type (no
second page), and an inline "**CLAIM `silas.pot` →**" pill renders below the
input. One signature later, the registration is confirmed in a block. The user
is redirected to `/silas.pot` — an ENS-style profile page with a gradient
banner, an overlapping 128px avatar (real GitHub avatar if the user set
`avatar = https://github.com/<handle>.png`), a monospace name heading, a social
chip row, a records list, and an ownership sidebar. Clicking **Edit Profile**
opens a single form: the right-rail summary itemizes every contract message
and pallet call the save will execute (`PublicResolver.set_text(com.twitter)`,
`set_addr`, `identity.setIdentity` if available, `ReverseRegistrar.set_name`),
all running inside one `utility.batchAll`. One click → one signature → 4-5
writes land atomically. On the **Subnames** tab of a parent name, the owner
issues `alice.<parent>.pot` and the same batch wires a Substrate sub-identity
and a scoped `Governance` / `NonTransfer` proxy on the multisig account.

### Technical highlights

- **6 ink! 5 contracts, single-responsibility, deployed clean from `scripts/deploy.ts`** — Registry, PublicResolver, ReverseRegistrar, Registrar, CommunityRegistrar, Attestation.
- **ENS-compatible namehash** (ASCII vector tests against `namehash("eth")` and `namehash("foo.eth")` pass byte-for-byte).
- **One signature, batched everything.** Profile save composes up to 5 inner calls; subname issuance composes 3. All inside `utility.batchAll`. Atomic by construction.
- **Runtime-aware identity mirror.** The SDK detects whether the connected node has `pallet_identity` and either runs the identity step or gracefully skips it — same code works against `substrate-contracts-node` (no identity) and Portaldot mainnet (full FRAME).
- **Role mapping → native Substrate proxies.** `treasurer = NonTransfer`, `voter = Governance`, `staker = Staking`, `judge = IdentityJudgement`. The contract records the role string; the proxy pallet enforces authority.
- **Defensive batch error reporting.** The SDK decodes `BatchInterrupted`, counts `ItemCompleted` events, and prints a human-readable error like `batchAll halted at call #04: contracts.ContractTrapped — Contract trapped during execution`.
- **22 SDK tests pass** (15 unit + 7 integration) against a real running node. Contracts: 24 unit tests pass across all 6 crates.

---

## Roadmap

### Completed

- Public repo (open-source)
- 6 ink! 5 contracts: Registry, PublicResolver, ReverseRegistrar, Registrar, CommunityRegistrar, Attestation
- ENS-compatible namehash (matches reference vectors)
- Typed SDK with unsigned-tx builders for every flow
- Next.js dApp with: landing search, live availability, inline claim, ENS-style profile with banner + avatar + records + ownership sidebar, batched edit page, attest page, subnames panel, wallet page
- Runtime-aware identity-pallet detection + graceful skip
- Polkadot.js extension and dev-seed signing both wired through one `signAndSendTx` helper
- CI: build all contracts, run unit tests, spin up a real node, run SDK integration tests
- Chain compatibility probe (`pnpm chain:verify`) writing dated `docs/chain-verified.md`
- Local deployment with addresses auto-written to SDK constants
- Server-side per-community `CommunityRegistrar` deploy via `/api/community-registrar`

### Next phase

- Mainnet deployment to Portaldot once the runtime exposes the full FRAME suite (`pallet_identity`, `pallet_multisig`, `pallet_proxy`, `pallet_bounties`) we depend on for the batch composition.
- Demo video walkthrough recorded to the scripted 5-beat flow.
- Live frontend on Vercel pointed at mainnet via `NEXT_PUBLIC_*` env.
- Commit/reveal registrar to mitigate front-running on contested labels.
- Multi-coin address support on the resolver (currently SS58 `AccountId` only).
- Playwright end-to-end tests driving a real wallet extension.
- Pre-seeded demo state in `scripts/demo-seed.ts` extended to deploy a `CommunityRegistrar` and issue `alice.bandit-dao.pot` automatically.

---

## Team

**Team name:** 3sha
**Members:** Ashar — GitHub `@Ashar20` , Leo - Github 'Leofranklin015'
**Contact:** `silas.ashar5@gmail.com`
