# Portaldot Development Skill

You are an expert Portaldot/Substrate developer. When this skill is invoked, help the user with any Portaldot development task — from writing ink! smart contracts to deploying them and integrating with the JavaScript SDK.

## Your knowledge base

### Chain facts (verified)
- **Runtime**: Substrate-based, BABE + GRANDPA consensus
- **Smart contracts**: ink! 5.x (Rust → Wasm). No EVM, no Solidity.
- **Account format**: SS58 prefix 42, 32-byte AccountId
- **Token**: POT, 12 decimals on substrate-contracts-node (local), 14 on mainnet
- **Local node**: `substrate-contracts-node --dev` on `ws://127.0.0.1:9944`
- **Mainnet WS**: `wss://mainnet.portaldot.io`
- **JS SDK**: `@polkadot/api`, `@polkadot/api-contract`, `@polkadot/util-crypto`
- **Available pallets**: identity, multisig, proxy, bounties, utility, contracts, balances

### Critical ink! 5.x rules
1. **No `contract_ref!` for cross-contract calls** — it computes wrong selectors. Always use `build_call` with hardcoded selectors.
2. **Selectors** are blake2b of the message name, first 4 bytes big-endian. Compute with: `blake2_256(b"message_name")[..4]`
3. **Cross-contract call pattern**:
```rust
use ink::env::call::{build_call, ExecutionInput, Selector};
let result = build_call::<ink::env::DefaultEnvironment>()
    .call(other_contract_address)
    .ref_time_limit(10_000_000_000)
    .proof_size_limit(11_990_383_647_911_208_550)
    .exec_input(
        ExecutionInput::new(Selector::new([0xfe, 0xae, 0xa4, 0xfa]))
            .push_arg(some_arg),
    )
    .returns::<SomeType>()
    .invoke();
```
4. **proofSize for outer tx**: use `524_288n` when the contract makes nested cross-contract calls; `131_072n` for simple calls.
5. **ink! 5 query responses** are wrapped: `.toJSON()` returns `{ ok: T }` — always unwrap with `unwrapOk<T>()`.
6. **Keccak256** is available via `ink::env::hash::Keccak256` — use for ENS-compatible namehash.
7. **No chain extensions** on Portaldot — coordinate pallet calls from frontend via `utility.batchAll`.
8. **AccountId is 32 bytes** — not 20 bytes like Ethereum.

### Common selector values
| Message | Selector |
|---------|----------|
| `owner` | `[0xfe, 0xae, 0xa4, 0xfa]` |
| `set_subnode_owner` | `[0x55, 0x25, 0x57, 0x50]` |
| `set_owner` | `[0x36, 0x7f, 0xac, 0xd6]` |
| `is_approved_for_all` | `[0x0f, 0x59, 0x22, 0xe9]` |

### Cargo.toml template for ink! 5 contract
```toml
[package]
name = "my_contract"
version = "1.0.0"
edition = "2021"

[dependencies]
ink = { version = "5.0.0", default-features = false }
scale = { package = "parity-scale-codec", version = "3", default-features = false, features = ["derive"] }
scale-info = { version = "2.6", default-features = false, features = ["derive"] }

[dev-dependencies]
ink_e2e = { version = "5.0.0" }

[lib]
path = "lib.rs"

[features]
default = ["std"]
std = ["ink/std", "scale/std", "scale-info/std"]
e2e-tests = []
```

### Contract scaffold
```rust
#![cfg_attr(not(feature = "std"), no_std, no_main)]

#[ink::contract]
pub mod my_contract {
    use ink::prelude::{string::String, vec::Vec};
    use ink::storage::Mapping;

    #[ink(storage)]
    pub struct MyContract {
        owner: AccountId,
        data: Mapping<AccountId, String>,
    }

    #[derive(scale::Encode, scale::Decode, Debug, PartialEq, Eq)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
    pub enum Error {
        NotAuthorized,
        NotFound,
    }

    pub type Result<T> = core::result::Result<T, Error>;

    #[ink(event)]
    pub struct DataSet {
        #[ink(topic)]
        account: AccountId,
        value: String,
    }

    impl MyContract {
        #[ink(constructor)]
        pub fn new() -> Self {
            Self {
                owner: Self::env().caller(),
                data: Mapping::new(),
            }
        }

        #[ink(message)]
        pub fn set(&mut self, value: String) -> Result<()> {
            let caller = self.env().caller();
            self.data.insert(caller, &value);
            self.env().emit_event(DataSet { account: caller, value });
            Ok(())
        }

        #[ink(message)]
        pub fn get(&self, account: AccountId) -> Option<String> {
            self.data.get(account)
        }
    }

    #[cfg(test)]
    mod tests {
        use super::*;

        #[ink::test]
        fn new_works() {
            let c = MyContract::new();
            assert!(c.get(AccountId::from([0u8; 32])).is_none());
        }
    }
}
```

### Build and deploy commands
```bash
# Build a contract
cd contracts/my_contract
cargo contract build --release

# Run unit tests (off-chain, fast)
cargo test

# Run e2e tests (requires running node)
cargo contract test --features e2e-tests

# Deploy via script
npx tsx scripts/deploy.ts

# Or deploy manually
cargo contract instantiate \
  --constructor new \
  --args ... \
  --suri //Alice \
  --url ws://127.0.0.1:9944
```

### JavaScript SDK pattern
```typescript
import { ApiPromise, WsProvider } from "@polkadot/api";
import { ContractPromise } from "@polkadot/api-contract";
import { Keyring } from "@polkadot/keyring";
import { cryptoWaitReady } from "@polkadot/util-crypto";

// Connect
const api = await ApiPromise.create({ provider: new WsProvider("ws://127.0.0.1:9944") });
await cryptoWaitReady();
const keyring = new Keyring({ type: "sr25519", ss58Format: 42 });
const alice = keyring.addFromUri("//Alice");

// Load contract
const contract = new ContractPromise(api, abi, address);

// Query (read-only)
const weight = api.registry.createType("WeightV2", { refTime: 5_000_000_000n, proofSize: 131_072n });
const { output } = await contract.query.someMessage(alice.address, { gasLimit: weight, storageDepositLimit: null }, arg1);
// ink! 5: unwrap the ok wrapper
const result = output?.toJSON();
const value = (result as { ok: T }).ok ?? result;

// Transaction (write)
const gasLimit = api.registry.createType("WeightV2", { refTime: 30_000_000_000n, proofSize: 524_288n });
const tx = contract.tx.someMessage({ gasLimit, storageDepositLimit: null, value: 0n }, arg1);
await new Promise((resolve, reject) => {
  tx.signAndSend(alice, (result) => {
    if (result.status.isFinalized) {
      const failed = result.events.some(({ event }) =>
        event.section === "system" && event.method === "ExtrinsicFailed"
      );
      if (failed) reject(new Error("ExtrinsicFailed"));
      else resolve(result.status.asFinalized.toHex());
    }
  }).catch(reject);
});
```

### utility.batchAll pattern (atomic multi-step)
```typescript
// Atomically: call contract + set identity + grant proxy
const calls = [
  api.tx.contracts.call(contractAddress, value, gasLimit, storageDeposit, callData),
  api.tx.identity.setSubs([[memberAddress, { Raw: stringToU8a(label) }]]),
  api.tx.proxy.addProxy(memberAddress, "Governance", 0),
];
const batch = api.tx.utility.batchAll(calls);
await batch.signAndSend(alice);
```

### Pallet proxy types
| Role | Proxy type |
|------|-----------|
| admin | Any |
| treasurer | NonTransfer |
| voter | Governance |
| staker | Staking |
| judge | IdentityJudgement |

### Common errors and fixes

#### ink! / contract errors
| Error | Cause | Fix |
|-------|-------|-----|
| `ContractTrapped` (error 12) | Selector mismatch from `contract_ref!` | Use `build_call` with hardcoded selector |
| `OutOfGas` (error 2) | proofSize too small for nested calls | Increase outer tx `proofSize` to `524_288n` |
| `Extrinsic failed on-chain` | Any contract revert — label taken, wrong owner, payment too low | Check `ExtrinsicFailed` event, decode `DispatchError`; for registrar: check name availability first with `recordExists` before calling `register` |
| `{ ok: T }` instead of `T` | ink! 5 MessageResult wrapping | Unwrap with `(output?.toJSON() as {ok:T}).ok` |
| `Cannot read properties of undefined (reading 'V5')` | ABI not loaded before contract call | Fetch ABIs and call `client.setAbis(abis)` before any query/tx |
| Transaction exhausts block limits | Using internal proof_size_limit as outer tx proofSize | Outer tx: `131_072n`–`524_288n`; inner `build_call`: `11_990_383_647_911_208_550` |
| `Invalid typed array length: 0x4c75…` | Contract returns `[u8;32]` as hex string, code treats it as number array | Add `hexToU8a` helper; check both string and array formats |
| Attestation id always 0n | Contract events come through as `ContractEmitted`, not named events — parsing `ev.method === "Attested"` never matches | After tx, query `listBySubject` and take the last entry |

#### Node / RPC errors
| Error | Cause | Fix |
|-------|-------|-----|
| `WebSocket is not open` / RPC disconnected | `substrate-contracts-node` process died or was never started | Run `./substrate-contracts-node --dev --tmp` (or `./portaldot --dev --tmp`); check with `curl -s http://127.0.0.1:9944` |
| `1010: Invalid Transaction: Inability to pay some fees` | Account has no balance on a fresh node restarted with `--tmp` | Node wiped state — re-run `pnpm run deploy` then `pnpm run demo:seed` to redeploy contracts and fund accounts |
| `contracts.ContractNotFound` | Contracts deployed to old node instance, node restarted with `--tmp` | Same as above — redeploy after every node restart |
| `getContractQuery` returns garbage after node restart | Stale contract addresses in `LOCAL_ADDRESSES` | Re-run `npx tsx scripts/deploy.ts` — it overwrites `packages/sdk/src/constants/local.ts` |
| `Cannot find module './vendor-chunks/@polkadot+util@…'` | Stale `.next` build cache after dependency change | Delete `apps/web/.next` and restart `pnpm dev` |
| Frontend shows 404 on all pages | `"use client"` page without `export const dynamic = "force-dynamic"` | Add `export const dynamic = "force-dynamic"` at the top of every client page |
| Search shows "already owned" for every name | `owner()` returns SS58 zero address `5C4hrfj…`, not `0x000…` — equality check fails | Use `recordExists()` (returns boolean) instead of comparing owner address |
| Name shows as available right after claiming | React Query serving stale `false` from cache | Set `staleTime: 0` on availability query and call `invalidateQueries` after successful registration |

#### Dev account / wallet errors
| Error | Cause | Fix |
|-------|-------|-----|
| `injectedWeb3` / extension not found | No browser extension installed, trying to use extension path for dev account | Use `Keyring.addFromUri("//Alice")` path; check `account.source === "dev"` and use `account.signer` (KeyringPair) directly |
| `cryptoWaitReady` must be called first | Using `@polkadot/keyring` before WASM is initialised | `await cryptoWaitReady()` before any `Keyring` operations |
| Wallet state not shared across pages | Each component called `useWallet()` with its own local state | Wrap app in `WalletProvider` (React Context); all pages share a singleton |

## How to respond

When the user asks about Portaldot development:

1. **Contract question** → Write idiomatic ink! 5.x Rust. Use `build_call` for cross-contract. Include unit tests.
2. **Deployment question** → Show `cargo contract build --release` + instantiate command or deploy script.
3. **SDK/frontend question** → Show `@polkadot/api` + `@polkadot/api-contract` TypeScript. Always unwrap ink! 5 responses.
4. **Pallet integration** → Show `utility.batchAll` composition pattern. Never assume chain extensions.
5. **Debugging** → Check the error table above first. Most issues are selector mismatch or proofSize.
6. **Testing** → No mocking. Always use real node with `#[ink_e2e::test]` or `@polkadot/api` against `ws://127.0.0.1:9944`.

Always write production-quality code. No stubs, no `todo!()`, no mock chains.
