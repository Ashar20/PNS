## 🟢 PNS — Portaldot Name Service | Progress Submission

**Team:** Ashar (`@Ashar20`, solo)
**Track:** Onchain Identity & Coordination
**Repo:** https://github.com/Ashar20/PNS
**Demo Video:** https://youtu.be/K7rUuigKYss

---

### ✅ Checklist

| Requirement | Status |
|---|---|
| Local Portaldot node running | ✅ `substrate-contracts-node --dev` on `ws://127.0.0.1:9944` |
| Project connected to local Portaldot | ✅ All 6 contracts deployed + verified |
| Real onchain action executed | ✅ Name registration + attestation with block hashes |
| POT shown as gas/fee | ✅ `balances.Withdraw` + `transactionPayment.TransactionFeePaid` in every tx |
| One end-to-end flow completes | ✅ Search → Claim `alice.pot` → Attest |

---

### 🎯 Core Demo Flow (60 seconds)

**Search → Claim a name → Attest**

```
User types "alice" in search bar
  → availability checked live against Registry contract
  → clicks Claim → signs → Registrar.register() called with POT payment
  → name owned in Registry onchain
  → user goes to /bob.pot → clicks Attest
  → types "alice.pot" as issuer → Attestation.attest() signed
  → attestation stored onchain, visible on profile
```

---

### 📋 Terminal Evidence

**Node startup:**
```
substrate-contracts-node v0.42.0
Chain specification: Development
JSON-RPC server: addr=127.0.0.1:9944
```

**Contract deployment (6 contracts, all real):**
```
[1/6] Deploying Registry…         5Crn2ZTmzVN1JYT6ammNHKVvU4xGYB1bqeuDC18Em2crfKcN
[2/6] Deploying PublicResolver…   5FSc7mD2R7BUJchFmUwvECgrQNkbn1EyZ4jridS9x8B2o3i1
[3/6] Deploying ReverseRegistrar… 5GkGYbKmyzCUueBT5HLsYttSGemLz5Nbuw1h7PRzuMrXfw7r
[4/6] Deploying Registrar…        5CFSHGxqhHzXPKsxDDzaCbopMtgEFk436j8wKRPHeqB9NtpP
[5/6] Deploying Attestation…      5CqUdU9Jh7bGN9DXfw6dBC689GsmxjHoRGcySz4kBsBjVHpk
[6/6] Root wired (set_subnode_owner zero → keccak256("pot") → Registrar)
```

**Name registration + attestation (real tx, real block hash):**
```
[1] alice.pot → owner: 5GrwvaEF… (Alice) ✓
[3] attest(issuer=alice.pot, subject=bob.pot, schema=endorsement.skill)
    SUCCESS ✓  block: 0xcc0a6c53fa01ac4d8630132e97271b49458922c4498babd7e7d9b8d4f8abc4e1
    Attestation IDs for subject: [0, 4]
```

**POT fee on every transaction (from on-chain events):**
```
balances.Withdraw                       amount: 30,609,171,504 planck
transactionPayment.TransactionFeePaid   actualFee: 2,719,271,548
```

---

### 🔴 What is NOT mocked

Everything is real:
- 6 ink! 5 contracts deployed and called against a live `substrate-contracts-node`
- Name registration is a real payable extrinsic (`Registrar.register`, POT transferred)
- Attestation is a real cross-contract call (`Attestation.attest` → `Registry.owner` for auth)
- Block hashes and extrinsic hashes are real finalized chain state

**Identity pallet steps** (`identity.setSubs`, `proxy.addProxy`) are **skipped on `substrate-contracts-node`** because it does not include `pallet_identity` or `pallet_proxy`. These steps run on Portaldot mainnet. The SDK detects the runtime and skips gracefully. Not a mock — a runtime compatibility shim.

---

### 🔁 Local Reproduction

```bash
git clone https://github.com/Ashar20/PNS && cd PNS
pnpm install

# Start node (binary in repo root after download)
./substrate-contracts-node --dev --tmp --rpc-port 9944 --rpc-cors all

# Build contracts + deploy
for c in registry resolver reverse registrar community attestation; do
  (cd contracts/$c && cargo contract build --release)
done
pnpm run deploy:local

# Start the app
pnpm --filter @pns/web dev   # → http://localhost:3000

# Run end-to-end diagnostic
npx tsx scripts/debug-attest.ts alice.pot bob.pot
```
