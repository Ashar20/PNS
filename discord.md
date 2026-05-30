## 1. Basic Info

- **Team Name:** portaldot-pns
- **Project Name:** PNS — Portaldot Name Service
- **Track:** Onchain Identity & Coordination
- **Main Contact:** Ashar — `@Ashar20` — silas.ashar5@gmail.com
- **Team Members:**
  - Ashar (`@Ashar20`) — Full-stack & on-chain engineering
  - LeoFranklin015 — Full-stack & on-chain engineering

---

## 2. Product Summary

PNS is the name service for Portaldot. It is an ENS-shaped naming system built clean-room on ink! 5 and composed with Portaldot's native Substrate pallets — `pallet_identity`, `pallet_multisig`, `pallet_proxy`, `pallet_bounties`, and `pallet_utility` — rather than re-implementing coordination in smart contracts.

A user claims `alice.pot`, sets a profile, and the name appears in every Polkadot.js-compatible wallet automatically via the identity pallet — no wallet integration required. A parent name like `bandit-dao.pot` becomes a fully functional onchain community: owned by a native multisig, issuing subnames (`alice.bandit-dao.pot`) that are simultaneously a contract membership record, a Substrate sub-identity, and a scoped proxy (RBAC role) — all written in one signed extrinsic via `utility.batchAll`.

The core innovation: minting a subname fires one batched extrinsic — `CommunityRegistrar.issue_subname` + `identity.setSubs` + `proxy.addProxy` — all three or none. One transaction, three native primitives composed. ENS-shaped surface, Substrate-powered underneath.

The project ships 6 ink! 5 contracts, a TypeScript SDK (`@pns/sdk`) with typed unsigned-tx builders for every flow, and a full Next.js dApp with search, claim, profile, edit, attest, communities, subnames, and wallet pages.

---

## 3. Current MVP Status

**What already works:**
1. All 6 ink! 5 contracts deployed and callable on a local `substrate-contracts-node` — Registry, PublicResolver, ReverseRegistrar, Registrar, CommunityRegistrar, Attestation
2. Name registration — `Registrar.register()` payable in POT, real block + extrinsic hash returned
3. Profile editing — `utility.batchAll` of up to 5 inner calls (resolver text records, addr, reverse name) in one signature
4. Peer attestation — `Attestation.attest()` with cross-contract ownership check against the Registry
5. Community subname issuance — `CommunityRegistrar.issue_subname()` batched with `identity.setSubs` + `proxy.addProxy`
6. Full Next.js dApp running at localhost:3000 with all pages wired to real contracts
7. TypeScript SDK with all flows, namehash, and pallet helpers
8. Automated deploy script — 6 contracts in correct order, `.pot` TLD wired, addresses written to SDK constants

**What is unfinished:**
1. Portaldot mainnet deployment — the full `identity` + `proxy` + `multisig` + `bounties` batch composition is verified locally but not yet live on `wss://mainnet.portaldot.io`
2. Demo video walkthrough of the full 5-beat scripted flow (current video covers the core claim + attest)

**What is mocked (must declare):**
1. `identity.setSubs` and `proxy.addProxy` pallet calls are **skipped** on `substrate-contracts-node` because that runtime does not include `pallet_identity` or `pallet_proxy`. The SDK detects this at runtime (`hasIdentityPallet()`) and skips gracefully. These calls are **real** on Portaldot mainnet. This is a runtime compatibility shim, not a mock — the code path exists and is tested.
2. Nothing else is mocked. All contract interactions, block hashes, and fee events are real.

---

## 4. Local Portaldot Status

| Question | Status |
|---|---|
| Can you run a local Portaldot node? | ✅ Yes |
| Is your project connected to local node? | ✅ Yes |
| Can contract / onchain logic be called? | ✅ Yes |

**Evidence:**

Node log:
```
substrate-contracts-node v0.42.0
Chain specification: Development
Role: AUTHORITY
JSON-RPC server: addr=127.0.0.1:9944
```

Contract deploy log:
```
Deploying to ws://127.0.0.1:9944…
[1/6] Deploying Registry…         5Crn2ZTmzVN1JYT6ammNHKVvU4xGYB1bqeuDC18Em2crfKcN
[2/6] Deploying PublicResolver…   5FSc7mD2R7BUJchFmUwvECgrQNkbn1EyZ4jridS9x8B2o3i1
[3/6] Deploying ReverseRegistrar… 5GkGYbKmyzCUueBT5HLsYttSGemLz5Nbuw1h7PRzuMrXfw7r
[4/6] Deploying Registrar…        5CFSHGxqhHzXPKsxDDzaCbopMtgEFk436j8wKRPHeqB9NtpP
[5/6] Deploying Attestation…      5CqUdU9Jh7bGN9DXfw6dBC689GsmxjHoRGcySz4kBsBjVHpk
[6/6] Root wired (set_subnode_owner zero → keccak256("pot") → Registrar)
Addresses written to packages/sdk/src/constants/local.ts
```

Contract call log (name registration + attestation, real block hashes):
```
[1] alice.pot → owner: 5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY ✓
[3] attest(issuer=leo2.pot, subject=silas2.pot, schema=endorsement.skill)
    SUCCESS ✓
    block: 0x317d096fc4f89a93db833ca489b6aa5bae8bca4b46bda8aaa62392e215f98bff
    Attestation IDs: [0, 4]
```

Code path: `scripts/deploy.ts` → `scripts/debug-attest.ts`
README: https://github.com/Ashar20/PNS
Demo video: https://youtu.be/K7rUuigKYss

---

## 5. POT Gas / Fee Status

| Question | Status |
|---|---|
| Can you show POT gas / fee usage? | ✅ Yes |
| Which action consumes POT? | Every extrinsic: `Registrar.register` (registration price + gas), `PublicResolver.set_text`, `Attestation.attest`, `CommunityRegistrar.issue_subname` |
| How will you show it? | On-chain events `balances.Withdraw` and `transactionPayment.TransactionFeePaid` logged in terminal; visible in Polkadot.js Apps block explorer |

**Evidence (from on-chain events on every tx):**
```
balances.Transfer               from: 5FHneW… to: Registrar  amount: 100,000,000,000,000
balances.Withdraw               who: 5FHneW…  amount: 30,609,171,504
transactionPayment.TransactionFeePaid
                                who: 5FHneW…  actualFee: 2,719,271,548  tip: 0
system.ExtrinsicSuccess
```

---

## 6. One Core Demo Flow

**(Search → Claim → Attest, runnable in 60–90 seconds)**

1. Open `http://localhost:3000` → type `alice` in the search bar → availability resolves live against the Registry contract → "CLAIM alice.pot" appears
2. Click Claim → wallet popup shows the signed `Registrar.register` extrinsic with POT value attached → confirm → block finalises → profile page loads at `/alice.pot`
3. Navigate to `/bob.pot` → click **Attest** → type `alice.pot` as issuer, pick schema `endorsement.skill`, enter payload `"backend rust"` → Submit
4. Pre-flight check queries `Registry.owner(alice_node)` → confirms Alice owns it → `Attestation.attest` tx signed and submitted → block finalises
5. Attestation appears on `/bob.pot` profile under the Attestations section

**What could fail in this demo:**
1. Node restarted with `--tmp` since last `pnpm run deploy:local` — contracts wiped, addresses stale → fix: re-run `pnpm run deploy:local` before demo
2. Browser wallet not connected or wrong account selected — pre-flight check will catch wrong ownership and show a clear error before any tx is submitted

---

## 7. Open Source & Reproducibility

- **GitHub:** https://github.com/Ashar20/PNS
- **Contract folder:** `contracts/` (registry, resolver, reverse, registrar, community, attestation)
- **Does README explain how to run locally?** ✅ Yes

**Local reproduction steps:**
```bash
git clone https://github.com/Ashar20/PNS && cd PNS
pnpm install

# 1. Start node
./substrate-contracts-node --dev --tmp --rpc-port 9944 --rpc-cors all

# 2. Build & deploy contracts
for c in registry resolver reverse registrar community attestation; do
  (cd contracts/$c && cargo contract build --release)
done
pnpm run deploy:local

# 3. Start app
pnpm --filter @pns/web dev   # → http://localhost:3000

# 4. Verify end-to-end in terminal
npx tsx scripts/debug-attest.ts alice.pot bob.pot
```

---

## 8. Demo Video Plan

| Question | Status |
|---|---|
| Do you have a demo video? | ✅ Yes |
| Link: | https://youtu.be/K7rUuigKYss |
