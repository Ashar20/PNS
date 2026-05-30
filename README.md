# PNS — Portaldot Name Service

> **A name is a community.**

ENS-shaped naming, ported faithfully to Portaldot's Substrate + ink! environment, composed with the chain's native pallets (identity, multisig, proxy, bounties, utility) to deliver a coordination primitive that Ethereum cannot natively express.

**Track:** Onchain Identity & Coordination (Portaldot Mini Hackathon Online S1)

---

## Demo video

_[link to be added after recording]_

## Live deployment

| Contract | Address |
|----------|---------|
| Registry | _[deploy first]_ |
| PublicResolver | _[deploy first]_ |
| ReverseRegistrar | _[deploy first]_ |
| Registrar | _[deploy first]_ |
| Attestation | _[deploy first]_ |

Frontend: _[Vercel URL after deploy]_

---

## Why it wins

| Criterion | How PNS satisfies it |
|-----------|---------------------|
| Clear identity problem | Web3 identity is fragmented. PNS unifies identity, roles, reputation, contributions under one name. |
| Simple product flow | Claim a name → join a community → roles, reputation, contributions on your profile. Five demo beats, five minutes. |
| Real onchain value | Live deployment, real subnames, real proxies, real bounties. |
| Native capabilities | We compose with identity, multisig, proxy, bounties, utility pallets rather than reimplementing them. |

**The key moment:** When a subname is minted, a single `utility.batchAll` does three things atomically — writes the name in our Registry contract, sets a Substrate sub-identity (name appears in every wallet immediately), and grants a scoped proxy (native RBAC). One transaction, three native primitives.

---

## Architecture

```
+----------------------------+         +----------------------------+
|         Frontend           |         |     TypeScript SDK         |
|  (Next.js + polkadot.js)   |<------->|  (@pns/sdk)                |
+--------------+-------------+         +---------+------------------+
               |                                  |
               v                                  v
+--------------------------------------------------------------+
|                 Portaldot node (substrate)                   |
|   +-----------------+      +------------------------------+  |
|   |  ink! contracts |      |        native pallets        |  |
|   |  Registry       |      |   identity   (sub-ids)       |  |
|   |  PublicResolver |      |   multisig   (community)     |  |
|   |  ReverseReg.    |      |   proxy      (RBAC)          |  |
|   |  Registrar      |      |   bounties   (contributions) |  |
|   |  CommunityReg.  |      |   utility    (batching)      |  |
|   |  Attestation    |      +------------------------------+  |
|   +-----------------+                                        |
+--------------------------------------------------------------+
```

---

## Quick start (local dev)

```bash
# Prerequisites
# 1. Rust + cargo-contract
cargo install --force --locked cargo-contract

# 2. Node 20 + pnpm
npm install -g pnpm

# 3. Portaldot dev node
# Download from github.com/portaldotVolunteer/Portaldot-node
./portaldot --dev --tmp --rpc-port 9944 --rpc-cors all

# Install deps
pnpm install

# Verify chain compatibility (outputs docs/chain-verified.md)
pnpm chain:verify

# Build contracts
cd contracts/registry && cargo contract build --release && cd ../..
cd contracts/resolver && cargo contract build --release && cd ../..
# ... repeat for all 6 contracts

# Deploy
pnpm run deploy:local

# Seed demo state
pnpm demo:seed

# Start frontend
pnpm --filter @pns/web dev
```

### Mainnet deployment

```bash
# 1. Funded deployer (never use //Alice on mainnet)
export DEPLOYER_SEED='your mnemonic or dev URI'

# 2. Build contracts, verify chain, deploy
pnpm chain:verify -- --mainnet
pnpm run deploy:mainnet

# 3. Copy addresses from packages/sdk/src/constants/mainnet.ts into apps/web/.env.local
#    See apps/web/.env.example (NEXT_PUBLIC_WS_ENDPOINT + five contract addresses)

# 4. Server-side community registrar deploy (optional, for Subnames tab)
#    Set PNS_DEPLOYER_SEED to a funded account on the same chain

pnpm --filter @pns/web build && pnpm --filter @pns/web start
```

Wallet flows (claim, edit profile, attest, subnames) sign via the Polkadot.js extension or a dev keypair.

---

## Pallets used

| Pallet | Why |
|--------|-----|
| `pallet_identity` | Sub-identities mirror PNS subnames natively in wallets; judgements become verifiable badges |
| `pallet_multisig` | Community accounts are native M-of-N multisigs — supported everywhere, no custom code |
| `pallet_proxy` | Scoped delegations implement role-based access control natively (treasurer → NonTransfer, voter → Governance, etc.) |
| `pallet_bounties` | Community treasury bounties create verifiable contribution records bound to subnames |
| `pallet_utility` | `batchAll` gives atomic "register + set identity + grant proxy" semantics |

---

## Demo flow (section 9)

1. Search for `leo.pot` — available
2. Claim `leo.pot` — extension shows the signed extrinsic; name appears in wallet UI
3. Edit profile — set `com.twitter`, `description`, `avatar`
4. Create `bandit-dao.pot` community — wizard, two signers, threshold 2
5. Invite Alice as `treasurer` — one batchAll: contract + setSubs + addProxy
6. Verify natively: `alice.bandit-dao` in Alice's wallet, NonTransfer proxy on the community account in explorer
7. Post 100 POT bounty; Alice claims it; `contribution.7` text record appears on her profile
8. Community provides `Reasonable` judgement — verified badge appears
9. Peer attestation: `endorsement.skill` → `"backend rust"`
10. Pitch close

---

## Limitations (roadmap)

- No commit/reveal registrar (FCFS only for MVP)
- No NameWrapper-style fuses or locked subnames
- No multi-coin address support (only SS58 AccountId)
- No ZKP-based selective disclosure for attestations
- `identity.addRegistrar` may require sudo on mainnet — fallback: attestation-only reputation
- Bounties pallet may require council approval on mainnet — fallback: treasury transfer

---

## Team

[Team info here]
