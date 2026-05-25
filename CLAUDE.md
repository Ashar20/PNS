# PNS — Portaldot Name Service

> **A name is a community.** ENS-shaped naming, ported faithfully to Portaldot's Substrate + ink! environment, composed with the chain's native pallets (identity, multisig, proxy, bounties, utility) to deliver a coordination primitive that Ethereum cannot natively express.

This document is the complete specification for the hackathon project. It is also the operating manual for any Claude instance working in this repo. Read it top to bottom before writing a single line of code. Re-read sections 3, 5, 6, and 12 whenever you're about to make an assumption.

---

## 0. How to use this document

- This is the source of truth. If a Claude session, a teammate, or a memory says something that contradicts this doc, this doc wins.
- Drop this file at the repo root as `CLAUDE.md`. Claude Code and most agentic setups pick it up automatically.
- Every section that says "verify" or "do not assume" is non-negotiable. Many of Portaldot's behaviours are not in the public docs and must be confirmed against the local node, not guessed.
- **No mocking.** Every test in this project runs against a real Portaldot dev node with real contracts deployed and real extrinsics signed. If you find yourself stubbing a chain call or fabricating a return value, stop and write the integration test instead.

---

## 1. Project pitch

**One-liner:** PNS is the name service for Portaldot. Every name is a programmable identity bundle, and every parent name is a fully functional onchain community — multisig treasury, proxy-based roles, native reputation, and an attestation graph, all bound to a single human-readable name.

**Track:** Onchain Identity & Coordination (Portaldot Mini Hackathon Online S1).

**Why it wins, per track criteria:**

| Criterion | How PNS satisfies it |
| --- | --- |
| Clear identity or coordination problem | Web3 identity is fragmented across chains, formats, and registries. PNS unifies identity, membership, roles, and reputation under one name. |
| Simple and convincing product flow | Claim a name → claim a subname under a community → roles, reputation, and contributions all show up on your profile. Five demo beats, five minutes. |
| Runnable MVP with real onchain value | Live deployment on Portaldot mainnet or testnet, real subnames issued, real proxies granted, real bounties paid. |
| Meaningful use of native capabilities | We deliberately compose with the identity, multisig, proxy, bounties, and utility pallets rather than reimplementing them. The pitch is "ENS-shaped, Substrate-powered." |

**What makes the demo memorable:**

When a subname is minted, a single batched extrinsic does three things atomically: it writes the name in our Registry contract, it sets a Substrate sub-identity on the recipient's account (so the name appears in Polkadot.js apps natively without our UI), and it grants the recipient a scoped proxy on the community account (native onchain RBAC). One transaction, three native primitives composed. That moment is the project.

---

## 2. Concept

### Mental model

- A **name** is an account-bound identity record.
- A **parent name** (e.g. `bandit-dao.pot`) is a community. It is owned by a Substrate multisig account, not a contract.
- A **subname** (e.g. `alice.bandit-dao.pot`) is a membership credential.
- A **role** is a scoped Substrate proxy granted by the parent name's multisig to a subname holder.
- **Reputation** comes from the identity pallet's registrar/judgement system. The community's main account registers as a registrar, and issues judgements on its members' sub-identities.
- **Contributions** come from the bounties pallet. The DAO posts bounties; on claim, the bounty ID is written as a text record on the contributor's subname.
- **Attestations** are peer-level claims any name can make about any other name, stored in our `Attestation` contract.

### Comparison to ENS

| Concept | ENS on Ethereum | PNS on Portaldot |
| --- | --- | --- |
| Registry | `ENSRegistry.sol` | `Registry` ink! contract |
| Resolver | `PublicResolver.sol` | `PublicResolver` ink! contract |
| Reverse resolution | `ReverseRegistrar.sol` | `ReverseRegistrar` ink! contract |
| TLD registrar | `BaseRegistrarImplementation` + `ETHRegistrarController` | `Registrar` ink! contract (FCFS for `.pot`) |
| Subname issuance | Off-chain (CCIP-Read) or NameWrapper | `CommunityRegistrar` + `utility.batch_all` against pallets |
| Profile fields | Text records on resolver | Text records on resolver + native Substrate identity fields |
| Multisig ownership | Gnosis Safe contract | Native `pallet_multisig` account |
| Permissions | Contract-level access control | Native `pallet_proxy` scoped delegations |
| Verified status | Off-chain attestations (EAS, etc.) | Native `pallet_identity::provide_judgement` |
| Contributions / bounties | Custom contracts | Native `pallet_bounties` |
| Attestations | EAS contracts | Our `Attestation` ink! contract |

The pitch line that captures all of this: **"On Ethereum, ENS is one contract suite plus a dozen third-party contracts to coordinate around it. On Portaldot, PNS is one contract suite that talks to the chain's native coordination pallets directly."**

---

## 3. Portaldot chain context — verify everything

**This is the section to revisit when you're not sure if something is supported. Do not assume Ethereum semantics. Do not assume EVM tooling works. Do not assume Polkadot semantics are identical to Portaldot's.**

### Stack

- **Runtime:** Substrate-based. Consensus is BABE + GRANDPA. Branded as "LAO NPoS." Treat it as standard Substrate NPoS.
- **Smart contracts:** ink! (Rust-based, compiles to Wasm). **No EVM.** No Solidity, no Hardhat, no viem, no ethers.
- **SDK:** Python SDK is documented (substrate-interface flavor). For our frontend and SDK we use the standard **JavaScript ecosystem**: `@polkadot/api`, `@polkadot/api-contract`, `@polkadot/extension-dapp`, `@polkadot/util`, `@polkadot/util-crypto`.
- **Account format:** SS58, prefix `42` (the default Substrate development prefix). Accounts are 32 bytes, encoded as ~48-character SS58 strings.

### Chain info

| Key | Value |
| --- | --- |
| Mainnet WS endpoint | `wss://mainnet.portaldot.io` |
| Token | POT, 14 decimals |
| SS58 format | 42 |
| Local dev node binaries | Available from `github.com/portaldotVolunteer/Portaldot-node` (Ubuntu and macOS prebuilt) |

### Pallets available (from official module-interface docs)

`assets`, `authorship`, `babe`, `balances`, `bounties`, **`contracts`**, `electionProviderMultiPhase`, `grandpa`, **`identity`**, `imOnline`, `indices`, `lottery`, `mmr`, **`multisig`**, `offences`, **`proxy`**, `randomnessCollectiveFlip`, `scheduler`, `session`, `staking`, `substrate`, `system`, `timestamp`, `transactionPayment`, `transactionStorage`, **`treasury`**, **`utility`**, `vesting`.

Pallets we depend on are bolded. Section 6 details how we use each.

### Things to verify on the local node before assuming

Before writing the integration code, the teammate must spin up the local dev node and confirm the following. **Do not skip this.**

1. **ink! contract version compatibility.** Confirm which ink! version (likely 4.x or 5.x) the `contracts` pallet on Portaldot accepts. Run `cargo contract upload` with a hello-world contract and confirm it instantiates.
2. **Whether chain extensions exist for calling pallets from ink! contracts.** The docs do not mention chain extensions. If they don't exist, we coordinate pallet calls **from the frontend via `utility.batch_all`** rather than from inside the contract. Plan around this.
3. **Identity pallet field set.** The exact identity fields Portaldot supports (display, legal, web, riot, email, image, twitter, pgp_fingerprint, additional). Confirm by inspecting the pallet metadata via `api.tx.identity.setIdentity` in a Polkadot.js Apps session connected to `wss://mainnet.portaldot.io` or to your local node.
4. **Proxy types available.** Standard Substrate proxies are `Any`, `NonTransfer`, `Governance`, `Staking`, `IdentityJudgement`, `CancelProxy`. Confirm Portaldot's enum matches by inspecting `api.tx.proxy.addProxy` metadata.
5. **Multisig deposit and threshold rules.** Check `pallet_multisig` constants (`DepositBase`, `DepositFactor`) so we can document the cost of creating a community account.
6. **Bounty proposal deposit and curator deposit.** Same drill.
7. **Whether `utility.batchAll` is available** (it usually is, but confirm).
8. **Existential deposit on `balances`.** Determines minimum POT to keep an account alive.

Capture all of the above in a `docs/chain-verified.md` file in the repo, with the actual values, dated, with the local node version used. Anything we ship depends on these.

---

## 4. System architecture

```
+----------------------------+         +----------------------------+
|         Frontend           |         |     TypeScript SDK         |
|  (Next.js + polkadot.js)   |<------->|  (@pns/sdk)                |
+--------------+-------------+         +---------+------------------+
               |                                  |
               |  signs extrinsics, calls         |  wraps api, api-contract,
               |  contract messages, batches      |  api-extension, namehash,
               |  via utility.batchAll            |  UTS46, contract ABIs
               v                                  v
+--------------------------------------------------------------+
|                 Portaldot node (substrate)                   |
|                                                              |
|   +-----------------+      +------------------------------+ |
|   |  ink! contracts |      |        native pallets        | |
|   |                 |      |                              | |
|   |  Registry       |      |   identity   (sub-ids,       | |
|   |  PublicResolver |      |               judgements)    | |
|   |  ReverseReg.    |      |   multisig   (community      | |
|   |  Registrar      |      |               accounts)      | |
|   |  CommunityReg.  |      |   proxy      (RBAC,          | |
|   |  Attestation    |      |               liquid democ.) | |
|   |                 |      |   bounties   (contributions) | |
|   +-----------------+      |   utility    (batching)      | |
|                            +------------------------------+ |
+--------------------------------------------------------------+
```

### Trust boundaries

- Contracts hold the **name graph** (who owns what, what records point where).
- Pallets hold the **account state** (sub-identities, proxies, bounties, treasury balances).
- The SDK is the **orchestration layer** — it knows how to compose a contract call with pallet extrinsics into a single `utility.batchAll`.
- The frontend never trusts the contract for permission checks that are enforced by pallets, and vice versa. Each side enforces its own invariants.

---

## 5. ink! contracts — full specification

All contracts use ink! 5.x conventions unless local node verification dictates otherwise. AccountId is 32 bytes. Hashing uses `ink::env::hash::Keccak256` for ENS-compatible namehash semantics. Node identifiers are `[u8; 32]`.

### 5.0 Namehash and label hashing

```rust
use ink::env::hash::{CryptoHash, Keccak256};

pub fn keccak256(input: &[u8]) -> [u8; 32] {
    let mut out = [0u8; 32];
    Keccak256::hash(input, &mut out);
    out
}

/// ENS-style namehash. Labels are lowercased, dot-separated, processed right-to-left.
/// Empty name returns zero. UTS46 normalization is performed off-chain (in the SDK).
pub fn namehash(name: &str) -> [u8; 32] {
    if name.is_empty() {
        return [0u8; 32];
    }
    let labels: Vec<&str> = name.split('.').collect();
    let mut node = [0u8; 32];
    for label in labels.iter().rev() {
        let label_hash = keccak256(label.as_bytes());
        let mut combined = [0u8; 64];
        combined[..32].copy_from_slice(&node);
        combined[32..].copy_from_slice(&label_hash);
        node = keccak256(&combined);
    }
    node
}
```

The SDK performs UTS46 normalization before calling. Contracts assume input labels are already normalized lowercase ASCII; reject anything else.

### 5.1 `Registry`

The source of truth for ownership and resolver pointers. Mirrors `ENSRegistry`.

**Storage:**

```rust
#[ink(storage)]
pub struct Registry {
    /// node => owner account
    owners: Mapping<[u8; 32], AccountId>,
    /// node => resolver contract address
    resolvers: Mapping<[u8; 32], AccountId>,
    /// node => TTL in seconds
    ttls: Mapping<[u8; 32], u64>,
    /// node => operator approvals (operator account => bool)
    operators: Mapping<([u8; 32], AccountId), bool>,
    /// the root owner (constructor caller), used to bootstrap TLDs
    root: AccountId,
}
```

**Messages:**

- `new() -> Self` — caller becomes root, owns the zero node.
- `set_owner(node, new_owner)` — only current owner.
- `set_subnode_owner(node, label_hash, new_owner) -> [u8; 32]` — only owner of parent node. Returns the new child node.
- `set_resolver(node, resolver)` — only owner.
- `set_ttl(node, ttl)` — only owner.
- `set_approval_for_all(operator, approved)` — caller approves an operator over all their nodes.
- `owner(node) -> AccountId`
- `resolver(node) -> AccountId`
- `ttl(node) -> u64`
- `is_approved_for_all(owner, operator) -> bool`
- `record_exists(node) -> bool`

**Events:**

- `Transfer { node, owner }`
- `NewOwner { node, label, owner }`
- `NewResolver { node, resolver }`
- `NewTTL { node, ttl }`
- `ApprovalForAll { owner, operator, approved }`

**Errors:**

- `NotAuthorized`
- `NodeNotFound`

### 5.2 `PublicResolver`

Stores the actual addressable data for a name. Multiple resolvers may exist; users point their `Registry.resolver` at whichever they trust.

**Storage:**

```rust
#[ink(storage)]
pub struct PublicResolver {
    registry: AccountId,
    /// node => account address record
    addr: Mapping<[u8; 32], AccountId>,
    /// (node, key) => text value
    text: Mapping<([u8; 32], String), String>,
    /// node => contenthash bytes (CIDv1, etc.)
    contenthash: Mapping<[u8; 32], Vec<u8>>,
}
```

**Messages:**

- `new(registry: AccountId) -> Self`
- `set_addr(node, addr)` — caller must be the node's owner per the Registry (cross-contract call).
- `addr(node) -> Option<AccountId>`
- `set_text(node, key, value)`
- `text(node, key) -> Option<String>`
- `set_contenthash(node, hash)`
- `contenthash(node) -> Option<Vec<u8>>`
- `multicall(calls: Vec<Vec<u8>>) -> Vec<Vec<u8>>` — batch reads, useful for the frontend.

**Events:**

- `AddrChanged { node, addr }`
- `TextChanged { node, key, value_hash }` (emit hash of value, not value itself, to keep events cheap)
- `ContenthashChanged { node, hash }`

**Authorization model:**

Every `set_*` message calls `Registry::owner(node)` cross-contract and checks the caller. If `Registry::is_approved_for_all(owner, caller)` returns true, the call is also allowed.

### 5.3 `ReverseRegistrar`

Implements the `.reverse` namespace so any account can have a canonical primary name.

**Storage:**

```rust
#[ink(storage)]
pub struct ReverseRegistrar {
    registry: AccountId,
    default_resolver: AccountId,
    /// AccountId => primary name (e.g. "alice.pot")
    primary_names: Mapping<AccountId, String>,
}
```

**Messages:**

- `new(registry, default_resolver)`
- `claim_for(account, name)` — caller proves they own `account` (i.e. caller equals `account`, or caller has approval). Writes `primary_names[account] = name`, sets the `name` text record on `<account-hex>.addr.reverse` node, and registers the reverse node owner.
- `set_name(name)` — convenience for self-reverse.
- `name_of(account) -> Option<String>`
- `node_for_account(account) -> [u8; 32]` — pure helper, returns `namehash(<hex(account)>.addr.reverse)`.

**Important:** The reverse name registration also writes a `name` text record on the reverse node, so any standard ENS-style reverse lookup pattern works.

### 5.4 `Registrar`

Owns the `.pot` TLD node in the Registry. Issues second-level names FCFS for the demo (no auctions, no commit/reveal). Pricing is a flat fee in POT (use existential deposit + a fixed multiplier for the demo).

**Storage:**

```rust
#[ink(storage)]
pub struct Registrar {
    registry: AccountId,
    /// the namehash of "pot"
    base_node: [u8; 32],
    /// label_hash => expiry block number
    expiries: Mapping<[u8; 32], BlockNumber>,
    /// flat price in plancks (POT smallest unit)
    price: Balance,
    /// registration period (blocks)
    period: BlockNumber,
    /// admin (for emergency price changes, etc.)
    admin: AccountId,
}
```

**Messages:**

- `new(registry, base_node, price, period, admin)`
- `register(label: String, owner: AccountId) -> [u8; 32]` — payable. Requires `transferred_value() >= price`. Computes `label_hash = keccak256(label)`, checks `expiries[label_hash] < current_block`, writes new expiry, calls `Registry::set_subnode_owner(base_node, label_hash, owner)`. Refunds excess.
- `renew(label, periods: u32)` — payable, extends expiry.
- `available(label) -> bool`
- `expiry_of(label) -> BlockNumber`
- `withdraw()` — admin only.
- `set_price(new_price)` — admin only.

**Events:**

- `NameRegistered { label, owner, expires }`
- `NameRenewed { label, expires }`

**Invariant:** the `Registrar` contract account is the owner of `base_node` in the `Registry`. The constructor takes a separate setup step where root calls `Registry::set_subnode_owner(0, keccak256("pot"), <registrar>)` after deploying both. Document this in the deployment script.

### 5.5 `CommunityRegistrar`

Anyone who owns a `.pot` name can deploy a `CommunityRegistrar` for that name and use it to issue subnames. The contract is what makes a name a community.

**Storage:**

```rust
#[ink(storage)]
pub struct CommunityRegistrar {
    registry: AccountId,
    /// parent node, e.g. namehash("bandit-dao.pot")
    parent_node: [u8; 32],
    /// the multisig account that owns this community
    community_account: AccountId,
    /// label_hash => member account
    members: Mapping<[u8; 32], AccountId>,
    /// label_hash => role string (e.g. "treasurer", "marketing")
    roles: Mapping<[u8; 32], String>,
    /// reverse index: member account => list of label_hashes they own here
    member_labels: Mapping<AccountId, Vec<[u8; 32]>>,
    /// open membership flag
    open_membership: bool,
}
```

**Messages:**

- `new(registry, parent_node, community_account, open_membership)`
- `issue_subname(label, member, role) -> [u8; 32]` — only the `community_account` (multisig) may call, unless `open_membership` is true and the caller is `member`. Writes Registry, records role, returns child node.
- `revoke_subname(label)` — only `community_account`. Removes ownership in the Registry, clears role, drops resolver.
- `set_role(label, role)` — only `community_account`.
- `role_of(label) -> Option<String>`
- `is_member(account) -> bool`
- `members_count() -> u32`

**Events:**

- `SubnameIssued { label, member, role }`
- `SubnameRevoked { label }`
- `RoleChanged { label, role }`

**Why this is on-contract and not a pallet call:** the contract is the canonical source of "who is a member of what community" and "what role do they hold," queryable by anyone. The native sub-identity and proxy are convenience native artifacts that show up in wallets but the contract's view is the system of record.

### 5.6 `Attestation`

Lightweight onchain attestation graph. Any name can attest to facts about any other name. Pairs with the identity pallet's judgement system: judgement = official seal, attestation = peer claim.

**Storage:**

```rust
#[ink(storage)]
pub struct Attestation {
    registry: AccountId,
    /// counter for attestation IDs
    next_id: u64,
    /// id => Attestation record
    attestations: Mapping<u64, AttestationRecord>,
    /// (subject_node, schema) => Vec<id>
    by_subject_schema: Mapping<([u8; 32], String), Vec<u64>>,
    /// (issuer_node) => Vec<id>
    by_issuer: Mapping<[u8; 32], Vec<u64>>,
}

#[derive(scale::Encode, scale::Decode, Debug, Clone)]
pub struct AttestationRecord {
    pub id: u64,
    pub issuer_node: [u8; 32],
    pub subject_node: [u8; 32],
    pub schema: String,
    pub payload: Vec<u8>,
    pub issued_at: u64,
    pub revoked: bool,
}
```

**Messages:**

- `new(registry)`
- `attest(issuer_node, subject_node, schema, payload) -> u64` — caller must own `issuer_node` per the Registry. Returns attestation id.
- `revoke(id)` — caller must own the original issuer node.
- `get(id) -> Option<AttestationRecord>`
- `list_by_subject(subject_node, schema) -> Vec<u64>`
- `list_by_issuer(issuer_node) -> Vec<u64>`

**Schemas to demo:** `endorsement.skill`, `endorsement.contribution`, `verified.kyc`, `verified.email`. Schemas are just strings, anyone can invent them. UI knows how to render a few well-known ones.

**Events:**

- `Attested { id, issuer_node, subject_node, schema }`
- `Revoked { id }`

---

## 6. Native pallet integrations

Section 5 is the contract surface. Section 6 is what makes this project win. **Pallet calls are signed by the user from the frontend**, batched via `utility.batchAll` so contract writes and pallet writes succeed or fail together. We do not assume chain extensions exist (verify in section 3 step 2).

### 6.1 `pallet_identity`

**Why we use it:** the identity pallet gives every account a first-class on-chain identity record, sub-identities (subnames at the protocol layer), and a registrar-based judgement system. We mirror PNS names into it so PNS subnames appear in every Polkadot.js wallet automatically with zero integration work on our side.

**Calls used:**

| Extrinsic | When we call it | Notes |
| --- | --- | --- |
| `identity.setIdentity(info)` | When a user claims a top-level `.pot` name. Populate `display` with the full name, `web` with the user's homepage if set, etc. | Charges identity deposit. Document this in the UI. |
| `identity.setSubs(subs)` | When a community account adds or removes members. `subs` is a vector of `(AccountId, Data)` pairs, where Data is the subname label. | One call replaces the full sub list. Read first, modify, write. |
| `identity.requestJudgement(reg_index, max_fee)` | When a member wants their identity verified by a registrar. | Out of scope for the demo, but document in the README as a roadmap item. |
| `identity.provideJudgement(reg_index, target, judgement, identity_hash)` | When a community account, acting as a registrar, marks a subname as `Reasonable` or `KnownGood`. | This is the "verified contributor" badge mechanic. |
| `identity.addRegistrar(account)` | One-time setup so the community's multisig is recognised as a registrar. | Requires sudo or council approval depending on chain config — **verify locally** whether this needs sudo. |

**Composition pattern:**

When issuing a subname via `CommunityRegistrar::issue_subname`, the frontend builds a `utility.batchAll` with:

1. `contracts.call(community_registrar.issue_subname(label, member, role))`
2. `identity.setSubs([(member, Data::Raw(label.as_bytes()))])` — signed by the community multisig
3. `proxy.addProxy(member, proxy_type, 0)` — signed by the community multisig, granting `member` a scoped proxy on the community account

All three or none. The frontend signs as the multisig (`multisig.asMulti`).

### 6.2 `pallet_multisig`

**Why we use it:** community accounts are native multisigs, no contract needed. Cheaper, more secure, supported by every Substrate wallet.

**Calls used:**

- `multisig.asMulti(threshold, other_signatories, maybe_timepoint, call, max_weight)` — main entry point for multisig-signed calls.
- `multisig.approveAsMulti(...)` — for the second-through-nth signers.

**Setup flow for a new community:**

1. Frontend asks the founder for N signer addresses and threshold M.
2. Frontend computes the deterministic multisig account address (`util-crypto.createKeyMulti(signers, threshold)`).
3. Founder funds the multisig account with the existential deposit + name registration cost.
4. Founder calls `Registrar::register("bandit-dao", multisig_account)`. Registration emits `NameRegistered`.
5. Founder deploys a `CommunityRegistrar` for that name, configured with `community_account = multisig`.
6. Founder calls `Registry::set_owner(parent_node, community_registrar_address)` so the contract can manage subnames.

### 6.3 `pallet_proxy`

**Why we use it:** Substrate proxies are scoped delegations of authority. Granting `Governance` proxy to a member means they can vote on referenda on behalf of the granter. Granting `NonTransfer` means they can do everything except move funds. This is RBAC, native, revocable in one extrinsic.

**Proxy types (verify against node):** `Any`, `NonTransfer`, `Governance`, `Staking`, `IdentityJudgement`, `CancelProxy`.

**Calls used:**

- `proxy.addProxy(delegate, proxy_type, delay)` — multisig signs, adds a scoped proxy on the multisig account itself.
- `proxy.removeProxy(...)` — for revocation.
- `proxy.proxy(real, force_proxy_type, call)` — used by the delegate when they want to act on behalf of `real`.

**Role mapping for the demo:**

| Role string | Proxy type granted |
| --- | --- |
| `admin` | `Any` |
| `treasurer` | `NonTransfer` |
| `voter` | `Governance` |
| `staker` | `Staking` |
| `judge` | `IdentityJudgement` |

The `CommunityRegistrar::roles` mapping records the role string. The actual proxy is granted in the same `utility.batchAll` that creates the subname.

**Liquid democracy demo beat:** the recipient of a `Governance` proxy can themselves `proxy.addProxy(<another_account>, Governance, 0)` on their own account, effectively delegating their voting power further. Show this in 20 seconds during the demo.

### 6.4 `pallet_bounties`

**Why we use it:** community treasury runs onchain bounties natively. When a member claims a bounty, we record the bounty ID as a text record on their subname, creating a verifiable contribution history bound to the name.

**Calls used:**

- `bounties.proposeBounty(value, description)` — proposes a new bounty.
- `bounties.approveBounty(bounty_id)` — typically requires governance / council. **Verify** whether Portaldot has council, or whether the treasury approves directly.
- `bounties.proposeCurator(bounty_id, curator, fee)`
- `bounties.acceptCurator(bounty_id)`
- `bounties.awardBounty(bounty_id, beneficiary)`
- `bounties.claimBounty(bounty_id)`

**Composition pattern:**

When a bounty is claimed, the frontend builds a batch with:

1. `bounties.claimBounty(bounty_id)`
2. `contracts.call(public_resolver.set_text(<subname_node>, "contribution." + bounty_id, <description_or_link>))`

The text record key convention is `contribution.<bounty_id>`. The UI iterates over all `contribution.*` keys when rendering a profile.

### 6.5 `pallet_utility`

**Why we use it:** the linchpin. `utility.batchAll(calls)` runs a sequence of calls and reverts everything if any fails. This is how we get atomic "register subname + set sub-identity + grant proxy" semantics without needing chain extensions.

**Calls used:**

- `utility.batchAll(calls)` — primary tool.
- `utility.batch(calls)` — softer variant, used when partial success is acceptable (rare for us).

**Failure mode to test:** if any inner call exceeds its declared weight, `batchAll` aborts. Build the frontend to surface batch dispatch errors clearly, mapping the index of the failing inner call back to the user-visible action.

---

## 7. TypeScript SDK (`@pns/sdk`)

A small package consumed by the frontend, demos, and external integrators.

### Package layout

```
packages/sdk/
  src/
    index.ts
    namehash.ts          // keccak256, UTS46 normalization, namehash
    client.ts            // PNSClient class
    contracts/
      registry.ts        // typed wrapper around Registry ABI
      resolver.ts
      reverse.ts
      registrar.ts
      community.ts
      attestation.ts
    pallets/
      identity.ts        // helpers for setIdentity, setSubs, judgement
      multisig.ts        // multisig account derivation, asMulti
      proxy.ts           // role -> proxy_type mapping
      bounties.ts        // bounty helpers
      utility.ts         // batchAll builder
    flows/
      register.ts        // top-level name registration flow
      claim-subname.ts   // batched subname + sub-identity + proxy
      attest.ts          // peer attestation flow
    types.ts
    constants.ts         // chain endpoints, contract addresses, schemas
```

### Public API surface

```typescript
export class PNSClient {
  constructor(opts: { wsEndpoint: string; addresses: ContractAddresses });

  // Resolution
  resolveName(name: string): Promise<ResolvedName>;
  resolveAddress(addr: string): Promise<string | null>; // reverse lookup
  getTextRecords(name: string): Promise<Record<string, string>>;
  getContenthash(name: string): Promise<string | null>;

  // Top-level registration
  registerName(name: string, owner: AccountId, signer: Signer): Promise<TxResult>;

  // Communities
  createCommunity(opts: CreateCommunityOpts): Promise<CommunityHandle>;
  issueSubname(opts: IssueSubnameOpts): Promise<TxResult>;
  revokeSubname(opts: RevokeSubnameOpts): Promise<TxResult>;
  listMembers(parentName: string): Promise<Member[]>;

  // Attestations
  attest(opts: AttestOpts): Promise<{ id: bigint } & TxResult>;
  listAttestationsForSubject(name: string, schema?: string): Promise<AttestationRecord[]>;

  // Identity
  setProfile(name: string, fields: ProfileFields, signer: Signer): Promise<TxResult>;
  requestJudgement(name: string, regIndex: number, maxFee: bigint, signer: Signer): Promise<TxResult>;

  // Bounties
  postBounty(opts: PostBountyOpts): Promise<TxResult>;
  claimBounty(opts: ClaimBountyOpts): Promise<TxResult>; // includes the resolver.set_text batch step
}
```

`flows/claim-subname.ts` is the most important file. It is the SDK's killer feature:

```typescript
export async function claimSubname(client: PNSClient, opts: IssueSubnameOpts) {
  const api = client.api;
  const calls = [
    api.tx.contracts.call(/* community_registrar.issue_subname */),
    api.tx.identity.setSubs([[opts.member, { Raw: stringToU8a(opts.label) }]]),
    api.tx.proxy.addProxy(opts.member, roleToProxyType(opts.role), 0),
  ];
  const batch = api.tx.utility.batchAll(calls);
  const wrapped = api.tx.multisig.asMulti(
    opts.threshold, opts.otherSignatories, null, batch, weightOf(batch),
  );
  return signAndSend(wrapped, opts.firstSigner);
}
```

### Namehash and normalization

UTS46 normalization is done in the SDK before any contract call. Use the `@ensdomains/eth-ens-namehash` package if its dependency footprint is acceptable, or implement a minimal UTS46 (lowercase, NFKC, strip emoji at v1 — document the simplification in the README). Keccak256 via `@polkadot/util-crypto` (`keccakAsU8a`).

---

## 8. Frontend

### Stack

- Next.js 14, app router, TypeScript.
- Tailwind CSS for styling.
- `@polkadot/extension-dapp` for wallet connection (Polkadot.js extension, Talisman, SubWallet).
- `@polkadot/api` and `@polkadot/api-contract` underneath, accessed via `@pns/sdk`.
- React Query for chain reads.

### Pages

1. **Landing (`/`)** — what is PNS, search input, recent registrations feed.
2. **Search (`/search?q=`)** — type a name, see if it's available.
3. **Claim (`/claim/[label]`)** — pay POT, register `<label>.pot`.
4. **Profile (`/[name]`)** — view a name's record. Shows addr, text records, badges (judgements), contributions, attestations (in and out), roles.
5. **Edit profile (`/[name]/edit`)** — owner-only, set text records, set addr, set primary reverse.
6. **Communities (`/communities`)** — directory of all `CommunityRegistrar` deployments.
7. **Community page (`/c/[name]`)** — members list, treasury balance, open bounties, governance status.
8. **Create community (`/communities/new`)** — wizard: parent name, signers, threshold, roles config.
9. **Issue subname (`/c/[name]/invite`)** — community owner UI for batched subname issuance.
10. **Attest (`/[name]/attest`)** — pick a subject name, schema, payload.

### Critical components

- `WalletConnect` — connects to extension, surfaces selected account.
- `NameInput` — handles UTS46 normalization on the fly, shows availability.
- `RecordEditor` — generic text-record key/value editor with well-known key suggestions (`com.twitter`, `com.github`, `url`, `avatar`, `description`).
- `RoleBadge` — renders role with proxy-type tooltip.
- `JudgementBadge` — renders the identity pallet judgement.
- `AttestationFeed` — paginated list of attestations for or by a name.
- `BountyCard` — bounty status + claim/award button.

### Visual identity

Mirror `app.ens.domains` structurally — sidebar with sections, central content. Judges who know ENS recognise the layout instantly. That recognition is part of the pitch.

---

## 9. Demo script

Five minutes. Scripted. Run it ten times before recording. **Do not improvise.**

| Time | Beat | What the screen shows |
| --- | --- | --- |
| 0:00 | Title card | "PNS — A name is a community." Logo, the team name, tagline. |
| 0:10 | Problem | One slide: "Web3 identity is fragmented. Names, reputation, roles, contributions all live in separate systems." |
| 0:25 | Solution | "On Portaldot, we unified them under one name. Watch." |
| 0:35 | Claim a name | Type `leo` in the search bar. `leo.pot` is available. Click claim. Sign. Confirm. The Polkadot.js extension shows the signed extrinsic. **Cut to the wallet view of the account — `leo.pot` appears under the account name in the wallet UI itself.** This is the moneyshot. |
| 1:15 | Set profile | One click into edit. Set `com.twitter`, `description`, `avatar`. Save. Reload the profile. |
| 1:40 | Create a community | Click "New community." Wizard: parent name `bandit-dao`, two signers, threshold 2. Sign and confirm. The community account is now a multisig, visible on Subscan. |
| 2:20 | Add a member | Click "Invite." Type `alice`, role `treasurer`. Sign as the multisig (one approval, one final). **One transaction does three things: `CommunityRegistrar.issue_subname`, `identity.setSubs`, `proxy.addProxy(NonTransfer)`. Show the batchAll in the wallet popup.** |
| 3:00 | Verify natively | Cut to a fresh wallet view of Alice's account. `alice.bandit-dao` appears under her account as a sub-identity. Then open the chain explorer and show the `Proxies` storage for the community account: Alice has `NonTransfer` proxy. |
| 3:30 | Post a bounty, claim it | Community posts a 100 POT bounty. Alice claims it. Her PNS profile updates: `contribution.7` text record appears. |
| 4:00 | Issue a judgement | Community account (as registrar) provides a `Reasonable` judgement on `alice.bandit-dao`. Her profile gets a verified badge. |
| 4:20 | Attest peer-to-peer | A second community attests `alice.bandit-dao` with schema `endorsement.skill` payload `"backend rust"`. Her profile shows the attestation from the other community. |
| 4:40 | The pitch | "ENS-shaped surface, Substrate-powered underneath. One name, every coordination primitive. Built in 6 days on Portaldot." End card with repo URL and team. |

Build a `scripts/demo-seed.ts` that pre-creates the accounts (Alice, Bob, Charlie, the community multisig), pre-funds them, and is idempotent so you can re-run between takes.

---

## 10. Repo structure

```
pns/
  CLAUDE.md                       # this file
  README.md                       # public-facing
  package.json                    # workspaces root
  pnpm-workspace.yaml
  contracts/
    registry/
      Cargo.toml
      lib.rs
      tests/
    resolver/
    reverse/
    registrar/
    community/
    attestation/
    workspace.Cargo.toml
  packages/
    sdk/
      package.json
      src/
      tests/
  apps/
    web/
      package.json
      src/
      public/
  scripts/
    deploy.ts                     # deploys all contracts, wires them up
    demo-seed.ts                  # seeds demo accounts and a sample community
    chain-verify.ts               # runs the section 3 verification probes
  docs/
    chain-verified.md             # output of chain-verify.ts, dated
    architecture.md
    demo-script.md
  .github/
    workflows/
      ci.yml                      # runs cargo contract check, e2e against local node
```

---

## 11. Development workflow

### One-time setup

1. Install Rust (rustup), `cargo-contract` (`cargo install --force --locked cargo-contract`), and `substrate-contracts-node` (or the Portaldot dev node binary).
2. Install Node 20+, pnpm.
3. Download the Portaldot dev node from `github.com/portaldotVolunteer/Portaldot-node`. Extract. Run: `./portaldot --dev --tmp --rpc-port 9944 --rpc-cors all`.
4. Install the Polkadot.js extension in a clean browser profile. Import Alice's dev seed (`//Alice`) and Bob's (`//Bob`).
5. Open Polkadot.js Apps (`polkadot.js.org/apps`) and point it at `ws://127.0.0.1:9944`. Confirm the node connects and you can see Alice's balance.
6. Run `pnpm install` at repo root, then `pnpm chain:verify`. This runs `scripts/chain-verify.ts` which confirms section 3's eight verification points and writes `docs/chain-verified.md`. **If any probe fails, stop and fix before proceeding.**

### Per-feature loop

1. Write or modify an ink! contract under `contracts/<name>`.
2. `cargo contract build --release` in that contract directory.
3. `cargo test` for off-chain `#[ink::test]` unit tests.
4. `cargo contract test --features e2e-tests` for `#[ink_e2e::test]` tests that spin up a real node and exercise the contract end-to-end. **This is where the "no mocking" rule is enforced — these tests run against a real Substrate node, not a simulation.**
5. Update the SDK wrapper in `packages/sdk/src/contracts/<name>.ts` to match any ABI changes.
6. Update the frontend page that consumes it.
7. Run `pnpm test` in `packages/sdk` for SDK integration tests (also against the local node).
8. Run `pnpm test:e2e` in `apps/web` for Playwright tests that drive a real browser against the local node.
9. Manually walk the demo flow in the browser once per feature.

### Deployment to Portaldot mainnet (for the submission)

1. Generate or import a deployer keypair. Fund it with enough POT to cover all contract deposits.
2. Run `pnpm run deploy:mainnet` — `scripts/deploy.ts` deploys contracts in the correct order and writes addresses to `packages/sdk/src/constants/mainnet.ts`.
3. Wire up the root setup: deployer (root) calls `Registry::set_subnode_owner(0, keccak256("pot"), <Registrar>)`.
4. Smoke test: claim one name, verify it resolves.
5. Tag the release: `git tag submission-v1 && git push --tags`.

---

## 12. Testing — no mocking, ever

This section is the constitution. Re-read before writing tests.

### Principle

A test that mocks the chain is not a test. It is a check that the code matches our assumptions about the chain. The whole project's value depends on those assumptions being correct, so every test must actually exercise them. There is one exception: pure functions (namehash, UTS46 normalization, role-to-proxy-type mapping) can be tested with standard unit tests because they touch nothing external.

### Layers

| Layer | Tool | What's real |
| --- | --- | --- |
| Pure logic | `cargo test` / `vitest` | Inputs only. No chain. Limited to genuinely pure functions. |
| Contract integration | `#[ink_e2e::test]` | A real substrate node is spun up by the test harness. Contracts are deployed for real. Calls are signed and dispatched. |
| SDK integration | `vitest` + `@polkadot/api` against local node | Real local Portaldot node. Real keypairs. Real deployed contracts. |
| Frontend integration | Playwright against the running app + local node | Real browser, real wallet (via mock extension that signs with `//Alice`), real chain. |
| Demo dry run | Manual | Run the section 9 script start to finish, twice in a row, with a fresh node each time. |

### Critical test scenarios — must all pass before submission

**Contract layer (`#[ink_e2e::test]`):**

1. Registry: root deploys, claims a TLD, transfers it, subnodes inherit correctly.
2. PublicResolver: only the node owner can set records; approved operator can set; unrelated account cannot.
3. ReverseRegistrar: setting a primary name updates both the mapping and the reverse node's `name` text record.
4. Registrar: registering `.pot` charges the right amount, refunds excess, fails when label is taken, fails when payment is below price.
5. CommunityRegistrar: only the community multisig can issue/revoke; open membership flag works.
6. Attestation: issuer-only revoke, schema and subject indexes return correct ids.

**SDK + pallet integration tests:**

7. Full happy path: deploy all contracts, register `leo.pot`, set profile, set primary reverse, look up by name, look up by address.
8. Community creation: derive multisig address client-side, fund it, register `bandit-dao.pot` to it, deploy `CommunityRegistrar`, transfer ownership of the parent node to the registrar.
9. Subname batchAll: call `claimSubname` flow. After the transaction, separately query: (a) the contract for member status, (b) `identity.subsOf` for the sub-identity, (c) `proxy.proxies` for the granted proxy. **All three must be present.** If any one is missing, the test fails.
10. Bounty claim batch: post bounty, accept curator, award, claim. After the claim, the resolver's text record for `contribution.<id>` is set. Verify both the bounty status and the text record.
11. Judgement: community account provides `Reasonable` judgement on `alice.bandit-dao`. After, `identity.identityOf(alice)` shows the judgement. Frontend renders the badge.
12. Attestation: issuer name attests subject with a schema. `Attestation::list_by_subject` returns the id. SDK helper returns the parsed payload.
13. Revocation cascade: community revokes Alice's subname. After the batched revoke, the contract no longer lists her as a member, `identity.setSubs` removes the sub-identity, `proxy.removeProxy` strips her proxy.

**Frontend tests (Playwright):**

14. End-to-end demo flow: page-by-page automation of the section 9 demo. Must complete without manual intervention.
15. Wallet popup interception: assert that the batched extrinsic shown in the wallet contains exactly 3 inner calls when issuing a subname (`contracts.call`, `identity.setSubs`, `proxy.addProxy`).

### Test data

Use the standard Substrate dev accounts (`//Alice`, `//Bob`, `//Charlie`, `//Dave`, `//Eve`, `//Ferdie`). All have funded balances on `--dev`. Document any additional pre-seeded accounts in `scripts/demo-seed.ts`.

### CI

`.github/workflows/ci.yml` runs on every push:

1. Build all ink! contracts.
2. Run all `#[ink::test]` (off-chain unit tests). Fast.
3. Spin up a substrate-contracts-node or Portaldot dev node in a service container.
4. Run all `#[ink_e2e::test]`.
5. Build the SDK, run SDK integration tests against the running node.
6. Build the frontend.

If any step fails, no merging. There is no exception for "the chain test is flaky." If it's flaky, fix the test.

---

## 13. Verification checklist (pre-submission)

Run through this list 24 hours before the submission deadline.

- [ ] `scripts/chain-verify.ts` has been run against the deployment target (mainnet or whichever chain we target) and `docs/chain-verified.md` is up to date.
- [ ] All six ink! contracts compile in release mode without warnings.
- [ ] All `#[ink_e2e::test]` tests pass on a fresh local node.
- [ ] All SDK integration tests pass on a fresh local node.
- [ ] All Playwright tests pass.
- [ ] `scripts/deploy.ts` deploys cleanly from a fresh deployer account and writes correct addresses to the SDK constants file.
- [ ] `scripts/demo-seed.ts` is idempotent: run it twice in a row, second run is a no-op or refreshes state cleanly.
- [ ] The demo script (section 9) has been executed twice end-to-end without intervention.
- [ ] The video walkthrough has been recorded with screen + voice, under 5 minutes.
- [ ] README is complete (section 14).
- [ ] All contract addresses are documented in the README.
- [ ] At least one canonical demo community exists on the deployment target, with at least 2 members, 1 active bounty, 1 issued judgement, 1 cross-community attestation.
- [ ] The repo is public on GitHub.
- [ ] The DoraHacks submission form is filled out with: repo URL, video URL, contract addresses, brief description, team.

---

## 14. Submission requirements

**Required by the hackathon:** GitHub repo, README, demo video.

**README must contain:**

1. One-line pitch and the tagline ("A name is a community.").
2. Demo video link (YouTube unlisted is fine).
3. Live deployment: contract addresses + a link to the running frontend (Vercel deploy).
4. The pitch in long form (the section 1 table).
5. Architecture diagram (section 4).
6. Quick-start: how to clone, install, run locally against a dev node.
7. The exact section 9 demo flow as steps a reviewer can reproduce.
8. Pallets we depend on, with one-line rationale each (section 6).
9. Honest limitations: things we cut for time (commit/reveal registrar, NameWrapper-style fuses, multi-coin addresses, ZKP-based selective disclosure). Frame as roadmap.
10. Team and contact info.

**Demo video:**

- Maximum 5 minutes.
- Recorded screen + voiceover.
- Follow section 9 beats exactly.
- Captions strongly recommended given international judging.
- Upload to YouTube unlisted, link in README and on the DoraHacks submission.

---

## 15. Risk register

| Risk | Likelihood | Impact | Mitigation |
| --- | --- | --- | --- |
| Portaldot dev node binary is broken on our OS | Medium | High | Build from source as fallback. If the source repo is incomplete, fall back to `substrate-contracts-node` for development and only deploy to Portaldot mainnet at the end. |
| ink! version mismatch with Portaldot's `contracts` pallet | Medium | High | Verify with hello-world deploy on day 1. If a specific version is required, lock it in `Cargo.toml`. |
| Chain extensions for calling pallets from contracts don't exist | High | Medium | Already planned for. We compose via frontend `utility.batchAll` instead. Document the trade-off in README. |
| `identity.addRegistrar` requires sudo and we don't have access on mainnet | Medium | Medium | Demo the judgement flow on the local dev node where we have sudo. On mainnet, fall back to attestation-only and note in README. |
| Bounties pallet requires council approval | Medium | Low | If true, demo bounties on local node. Mainnet demo skips the bounties beat and substitutes a treasury transfer. |
| Frontend wallet integration is finicky with multisig | High | Medium | Build with one signer first, add the second signer in a later iteration. Demo can show two browser profiles, two extensions, two signatures. |
| Submission deadline slips because of last-minute deployment issue | Medium | Critical | Deploy a working version to mainnet 48 hours before the deadline. Polish on a separate branch. |
| Marketing copy on Portaldot's docs is overpromised and the chain underdelivers in subtle ways | Medium | Medium | We've already designed around this by relying on standard Substrate pallets only. Do not rely on anything the docs mention only in marketing language ("AI-driven contract optimization," "quantum encryption," "10,000 TPS"). |

---

## 16. Claude operating notes

For any Claude session working in this repo:

1. **This document is canonical.** If a memory, search result, or external doc disagrees with this file, this file wins. If you believe this file is wrong, propose an update via a commit, do not silently work around it.

2. **No mocking, no stubs, no fake data in tests.** If you cannot write a real integration test for a piece of code, that code does not get merged. The chain is the source of truth; pretend you have access to it via the local dev node at all times.

3. **Verify Substrate-specific behavior against the local node, not against general Polkadot knowledge.** Portaldot is Substrate-based but not Polkadot. Pallet parameters (deposits, fees, periods) may differ. When in doubt, query `api.consts` or `api.tx.<pallet>.<call>.meta` directly.

4. **ink! is not Solidity.** Storage layout, cross-contract calls, payable patterns, and error handling all differ. When porting ENS patterns, write idiomatic ink!, do not translate Solidity line by line.

5. **AccountId is 32 bytes.** Many ENS reference implementations assume 20-byte addresses. Adapt.

6. **Keccak256 is available in ink!** via `ink::env::hash::Keccak256`. Use it for namehash compatibility.

7. **Always prefer batching via `utility.batchAll` over multi-step transactions.** Atomicity is part of the product.

8. **When implementing a flow, write the integration test first.** This forces the integration to be testable, which forces it to be deterministic.

9. **When stuck, run the actual extrinsic in Polkadot.js Apps against the local node.** It is the fastest debugger.

10. **Style.** Idiomatic Rust for contracts (clippy clean, no allow attributes added casually). TypeScript with strict mode for SDK and frontend. No `any`, no `// @ts-ignore`. Two-space indent in TS, four in Rust.

11. **Commits should be small and atomic.** A commit either compiles or it doesn't ship.

12. **Do not invent new schemas, role names, or proxy mappings without updating this file.** The mappings in section 6.3 are part of the spec.

13. **If you find yourself adding a feature that's not in this doc, stop.** Ask whether it's in scope. The deadline is the deadline; scope creep is the primary loss condition.

--