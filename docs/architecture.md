# PNS Architecture

See CLAUDE.md section 4 for the full architecture diagram and trust boundaries.

## Key design decisions

### Why batchAll instead of chain extensions?
Portaldot's contracts pallet does not expose chain extensions for calling pallets from ink! contracts (unconfirmed — verify per CLAUDE.md section 3 step 2). We compose cross-domain operations via `utility.batchAll` from the frontend. This is the right default: it keeps contracts simple and pallet calls explicit.

### Why multisig accounts instead of a multisig contract?
Native `pallet_multisig` accounts are supported by every Substrate wallet. They are cheaper (no contract storage), revocable at the pallet level, and require no custom contract logic to implement M-of-N approval. This also means community treasuries are natively visible in block explorers.

### Why store roles in the contract instead of on-chain only?
The contract is the system of record for "who is a member of what community." The native sub-identity and proxy are *mirror* artifacts that show up in wallets. The contract's `roles` mapping lets any third party query membership and role without needing to parse proxy storage.

### Namehash compatibility
PNS uses ENS-style keccak256 namehash (section 5.0). This means PNS names can be resolved by any ENS-compatible tool that supports custom registries. UTS46 normalization happens in the SDK before any contract call.
