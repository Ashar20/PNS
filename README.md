# PNS — Portaldot Name Service

> **A name is a community.**

ENS-shaped naming, ported faithfully to Portaldot's Substrate + ink! environment and composed with the chain's **native pallets** (identity, multisig, proxy, bounties, utility) to deliver a coordination primitive Ethereum cannot natively express.

**Track:** Onchain Identity & Coordination · **Portaldot Mini Hackathon S1**
**Built on Portaldot · gas paid in POT · contracts open source**

| | |
|---|---|
| 🎥 Demo video | _[link after recording]_ |
| 🌐 Live frontend | _[Vercel URL]_ |
| 📚 In-app SDK docs | `/docs` |
| 🪧 Pitch deck | `/deck` |

---

## The problem

Web3 identity is **fragmented**. Your name, your reputation, your roles in a DAO, and your contribution history all live in separate systems — different chains, formats, and registries that don't talk to each other. Coordinating a community means stitching a dozen disconnected tools together.

## The solution

PNS unifies them under **one human-readable name**.

- A **name** (`leo.pot`) is a programmable identity bundle.
- A **parent name** (`bandit-dao.pot`) is a fully functional onchain **community**, owned by a native multisig.
- A **subname** (`alice.bandit-dao.pot`) is a **membership credential**.
- A **role** is a scoped native **proxy** (RBAC). **Reputation** comes from the identity pallet's judgements. **Contributions** come from the bounties pallet. **Attestations** are peer claims in our `Attestation` contract.

### The signature moment

Minting a subname fires a **single batched extrinsic** that does three things atomically — all three, or none:

```
utility.batchAll([
  contracts.call  → CommunityRegistrar.issue_subname   // 1 · writes the name graph
  identity.setSubs                                      // 2 · sub-identity shows in every wallet
  proxy.addProxy                                        // 3 · scoped role, native RBAC
])  // signed via multisig.asMulti
```

One transaction, three native primitives composed. That moment is the project.

### One name → every chain

A PNS name's node is a **deterministic keccak256 namehash** — the *same 32 bytes*, computed identically by anyone, anywhere (ENS-compatible). That cryptographic sameness makes the name **composable**: it already shows natively in any Substrate wallet (including **Portaldot Wallet**), and multi-coin address records (roadmap) make it resolvable by **iBridge** for cross-chain transfers to a name instead of a raw `0x`.

---

## How it maps to the judging criteria

| Criterion | How PNS satisfies it |
|---|---|
| **Portaldot Native Deployment** (mandatory) | Deployed on Portaldot, gas paid in **POT**. Composes 5 native pallets via `utility.batchAll` — not portable to any other chain. |
| **Demo Completion** | Runnable MVP: 6 ink! contracts, a TypeScript SDK, and a full Next.js app. A scripted five-beat flow a reviewer can reproduce live. |
| **Application Value** | A composable, cryptographically-portable identity — the resolution layer the Portaldot Wallet and iBridge plug into. |
| **Presentation Quality** | An ENS-shaped surface every reviewer recognises; one clear idea — fragmented identity, unified under one name. |

---

## Architecture

```
+----------------------+        +----------------------+
|      Next.js app     |<------>|   @pns/sdk (TS SDK)  |
|  (polkadot.js + UI)  |        |  namehash · flows    |
+----------+-----------+        +----------+-----------+
           |  signs extrinsics, batches via utility.batchAll
           v
+--------------------------------------------------------+
|              Portaldot node (Substrate)                |
|  ink! contracts (name graph)  |  native pallets        |
|  Registry · Resolver ·        |  identity · multisig · |
|  Reverse · Registrar ·        |  proxy · bounties ·    |
|  CommunityRegistrar ·         |  utility               |
|  Attestation                  |                        |
+--------------------------------------------------------+
```

- **Contracts** hold the *name graph* (who owns what, what records point where).
- **Pallets** hold the *account state* (sub-identities, proxies, bounties).
- **The SDK** is the orchestration layer — composing a contract call with pallet extrinsics into one atomic `utility.batchAll`.

---

## Quick start (local dev)

### Prerequisites

- **Rust** + `cargo-contract` — `cargo install --force --locked cargo-contract`
- **Node 20+** and **pnpm**
- A Portaldot dev node binary, or `substrate-contracts-node`

```bash
git clone <repo-url> && cd PNS
pnpm install
```

### 1. Run the node

PNS needs a running Substrate node with the `contracts` pallet, RPC open on `127.0.0.1:9944`:

```bash
# option A — substrate-contracts-node
substrate-contracts-node --dev --rpc-cors all

# option B — Portaldot dev binary (github.com/portaldotVolunteer/Portaldot-node)
./portaldot --dev --tmp --rpc-port 9944 --rpc-cors all
```

> `--rpc-cors all` is required so the browser (and the tunnel below) can connect.

Sanity-check that the chain matches our assumptions (writes `docs/chain-verified.md`):

```bash
pnpm chain:verify
```

### 2. Build & deploy the contracts

```bash
# build all six ink! contracts
for c in registry resolver reverse registrar community attestation; do
  (cd contracts/$c && cargo contract build --release)
done

# deploy them, wire up the .pot TLD, write addresses + ABIs into the SDK/app
pnpm deploy:local
```

`deploy:local` writes live addresses into `packages/sdk/src/constants/local.ts` and copies ABIs into `apps/web/public/abis`.
Optional: `pnpm demo:seed` pre-creates Alice/Bob, a sample community, a bounty, and an attestation — idempotent, safe to re-run between demo takes.

### 3. Run the web app

The app uses a custom server (`apps/web/server.mjs`) that serves Next.js **and** proxies a WebSocket at **`/chain`** to your local node — so the whole app (frontend + node RPC) is reachable through a **single origin** (handy for one ngrok tunnel).

```bash
cd apps/web
cp .env.example .env      # then edit (see below)
pnpm dev                  # → http://localhost:3000   ( /chain → ws://127.0.0.1:9944 )
```

`.env`:

```bash
# Browser → connects to /chain on the same origin (proxied to the node)
NEXT_PUBLIC_WS_ENDPOINT=ws://localhost:3000/chain
# server.mjs → where the /chain proxy forwards
NODE_WS=ws://127.0.0.1:9944
HOST=0.0.0.0
PORT=3000
```

**Sharing over ngrok** (to demo with a remote wallet) — point one tunnel at port 3000; the WebSocket rides the same tunnel, no second tunnel needed:

```bash
ngrok http 3000
# then in .env:
NEXT_PUBLIC_WS_ENDPOINT=wss://<your-subdomain>.ngrok-free.dev/chain
```

> Free-plan ngrok URLs rotate per session — regenerate `.env` when the URL changes.

Open **http://localhost:3000**, connect a wallet (Polkadot.js / Talisman / SubWallet), and claim a name.

---

## Demo flow (≈5 minutes)

1. **Claim** — search `leo`, register `leo.pot`. It appears under your account in the wallet as a native identity.
2. **Profile** — set `com.twitter`, `description`, `avatar` text records.
3. **Community** — create `bandit-dao.pot` as a 2-of-2 native multisig.
4. **Invite** — issue `alice.bandit-dao` with role `treasurer`. **One `batchAll`** writes the subname, sets Alice's sub-identity, and grants her a `NonTransfer` proxy.
5. **Coordinate** — post a bounty + claim it (contribution record), issue a `Reasonable` judgement (verified badge), and attest peer-to-peer.

---

## Deploying to Portaldot mainnet

```bash
export DEPLOYER_SEED='your funded mnemonic'   # never //Alice on mainnet
pnpm chain:verify                              # against mainnet target
pnpm deploy:mainnet                            # writes packages/sdk/src/constants/mainnet.ts
# copy the five NEXT_PUBLIC_*_ADDRESS values + NEXT_PUBLIC_WS_ENDPOINT into apps/web/.env
pnpm --filter @pns/web build && pnpm --filter @pns/web start
```

---

## Repo structure

```
contracts/        six ink! 5 contracts (+ unit tests)
packages/sdk/     @pns/sdk — typed client, namehash, flows
apps/web/         Next.js app · in-app /docs · /deck pitch · server.mjs proxy
scripts/          deploy.ts · demo-seed.ts · chain-verify.ts
docs/             chain-verified.md, architecture notes
```

## Native pallets we depend on

| Pallet | Why |
|---|---|
| `pallet_identity` | Sub-identities (names in every wallet) + registrar judgements (verified badges). |
| `pallet_multisig` | Community accounts are native multisigs — no Safe contract. |
| `pallet_proxy` | Scoped delegations = revocable, native RBAC per role. |
| `pallet_bounties` | Treasury bounties become onchain contribution history. |
| `pallet_utility` | `batchAll` makes contract + pallet writes atomic. |

## Limitations & roadmap

Cut for the hackathon, on the roadmap: multi-coin address records (→ iBridge cross-chain resolution), commit/reveal registrar + auctions, NameWrapper-style fuses, ZK selective disclosure. `identity.addRegistrar` may require sudo on mainnet (fallback: attestation-only reputation); bounties may require council approval (fallback: treasury transfer). We deliberately built on **standard Substrate pallets only** — nothing that relies on marketing-tier chain features.

## Live deployment (local dev node)

Addresses written by `pnpm deploy:local` (replace with mainnet addresses for submission):

| Contract | Address |
|---|---|
| Registry | `5DPE5vFxfff7PjFZar4E6coKd8ur4UvJ4H148VeKUi7i1B9f` |
| PublicResolver | `5FJT8M55SEukMjkWrJgrdn9USCHn5khFPTiVaKFaunXUY3Ga` |
| ReverseRegistrar | `5FjU7Q94E5P7ZD1nTbSKg8yHAqCh3k4XXKsuQuoJmL2tyL6Z` |
| Registrar | `5FfRpv61ESbEZK764cXJ2Uy47DWx5nobfM4h5bSZsYuA2r59` |
| Attestation | `5HhGwE3F5TkGAwFNxCYnDpbqpmZxGZFMpR3LrfU2o4RhB4Se` |

## Team

_[names + contact]_

---

_ENS-shaped surface, Substrate-powered underneath. Built on Portaldot._
