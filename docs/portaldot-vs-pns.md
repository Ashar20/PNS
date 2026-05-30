# Portaldot Native vs PNS — What We're Building and Why

## What Portaldot Already Has Natively

Portaldot is a Substrate-based chain. It ships the full standard Substrate pallet suite out of the box.

| Native Primitive | What It Does | Pallet |
|-----------------|--------------|--------|
| Accounts | 32-byte SS58 accounts, balances, transfers | `pallet_balances` |
| Username system | Authority-gated flat usernames (`alice`) | `pallet_identity` (`setUsernameFor`, `setPrimaryUsername`) |
| Identity fields | Display name, email, Twitter, web, legal name, etc. | `pallet_identity` (`setIdentity`) |
| Identity judgement | Registrars can stamp accounts as `Reasonable` / `KnownGood` | `pallet_identity` (`provideJudgement`) |
| Sub-identities | Named children attached to a parent account | `pallet_identity` (`setSubs`) |
| Proxies | Scoped delegations — `Governance`, `NonTransfer`, `Staking`, etc. | `pallet_proxy` |
| Multisig accounts | M-of-N shared accounts, deterministic address | `pallet_multisig` |
| Bounties | Treasury-funded task boards | `pallet_bounties` |
| Treasury | On-chain fund management | `pallet_treasury` |
| Governance | Referenda, voting | (standard Substrate gov pallets) |
| ink! smart contracts | Wasm contracts via `pallet_contracts` | `pallet_contracts` |

### The native username system specifically

Portaldot has `identity.setUsernameFor` / `setPrimaryUsername` / `usernameOf`. This looks like a name service at first glance. It is not:

- **Authority-gated**: only approved authorities can assign usernames, users cannot self-register
- **Flat**: `alice`, not `alice.dao` or `alice.bandit-dao.pot` — no hierarchy, no subnames
- **No resolver**: no forward resolution to addresses, no text records, no contenthash
- **No reverse resolution**: cannot look up a name given an address in a standard way
- **No programmability**: no contracts, no hooks, no open schema for data

---

## What PNS Adds

PNS is not a replacement for these primitives. It is an **addressing and coordination layer on top of them**. The pallets are load-bearing infrastructure; PNS gives them a human-readable surface.

| Problem | Portaldot Native | PNS Solution |
|---------|-----------------|--------------|
| Look up an address by name | No forward resolution | `Registry` + `PublicResolver` — `silas.pot` → SS58 address |
| Look up a name by address | No reverse lookup | `ReverseRegistrar` — address → `silas.pot` |
| Self-register a name permissionlessly | Authority must assign | `Registrar` FCFS — pay POT, get `<label>.pot` instantly |
| Hierarchical names / subnames | Flat only | `CommunityRegistrar` — `alice.bandit-dao.pot` issued by the community |
| Attach open data to a name | No text records | `PublicResolver` — arbitrary key/value text records (`com.twitter`, `avatar`, `description`, etc.) |
| Make a name a community | No concept | Parent name + multisig + `CommunityRegistrar` = treasury, roles, membership |
| Peer attestations | Only authority judgement | `Attestation` contract — any name can attest any other name with any schema |
| Name-to-name social graph | Not possible | Attestation graph queryable by subject, issuer, schema |
| Wallet UX using names | Raw SS58 addresses only | PNS wallet — send to `silas.pot` instead of `5GrwvaEF...` |
| Composable identity bundle | Fragmented (identity pallet + proxies + bounties are separate) | PNS composes them under one name via `utility.batchAll` |

---

## How PNS Uses the Native Pallets (Not Replaces Them)

This is the core pitch. PNS doesn't reimplement what Portaldot has — it **orchestrates** it.

### Claiming a top-level name (`silas.pot`)

One `utility.batchAll` does:
1. `contracts.call(Registrar::register)` — writes the name into the PNS registry on-chain
2. `identity.setIdentity(info)` — sets the native Substrate identity so `silas.pot` appears in **every Polkadot.js wallet automatically**, with zero PNS integration required

### Issuing a subname (`alice.bandit-dao.pot`)

One `utility.batchAll` does:
1. `contracts.call(CommunityRegistrar::issue_subname)` — canonical membership record in the contract
2. `identity.setSubs([(alice, "alice")])` — alice appears under bandit-dao's account as a native sub-identity in all wallets
3. `proxy.addProxy(alice, NonTransfer, 0)` — alice gets a scoped native proxy on the community account (real on-chain RBAC)

### Contribution history

When a bounty is claimed:
1. `bounties.claimBounty(id)` — native pallet call, real POT paid out
2. `contracts.call(PublicResolver::set_text(node, "contribution.7", "..."))` — contribution permanently recorded on the PNS name

### Verified membership badge

Community acts as registrar → calls `identity.provideJudgement(Reasonable)` on the member → native `KnownGood` badge appears on the member's account in all wallets AND on their PNS profile.

---

## The Comparison in One Sentence

> On Portaldot, the identity/proxy/bounty/multisig pallets exist but they have no shared addressing layer. PNS is that layer: a permissionless, hierarchical, composable name service that ties everything together under a single human-readable name.

---

## What PNS Is NOT Competing With

- We are not replacing `pallet_identity` — we call it
- We are not replacing `pallet_proxy` — we call it  
- We are not replacing `pallet_multisig` — communities are real multisig accounts
- We are not replacing `pallet_bounties` — we record bounty IDs as text records

We are filling the gap between "these primitives exist" and "a user can actually navigate and use them with a human-readable name."

---

## Analogous to ENS on Ethereum

| Ethereum | Portaldot |
|----------|-----------|
| ERC-20 transfers to raw addresses | Balance transfers to raw SS58 addresses |
| Gnosis Safe for multisig | `pallet_multisig` |
| Off-chain attestations (EAS) | `pallet_identity` judgement (native) |
| Role-based access via contract | `pallet_proxy` scoped delegations (native) |
| ENS adds: `vitalik.eth` → address, text records, subnames | PNS adds: `silas.pot` → address, text records, subnames, communities |

ENS didn't replace Ethereum's native capabilities — it gave them a human-readable surface. PNS does the same for Portaldot, except Portaldot's native capabilities are **significantly richer** than Ethereum's (native multisig, native RBAC, native bounties, native identity) — making the PNS layer **more powerful**, not less.
