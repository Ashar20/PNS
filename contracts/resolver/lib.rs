#![cfg_attr(not(feature = "std"), no_std, no_main)]

#[ink::contract]
pub mod resolver {
    use ink::env::hash::{CryptoHash, Keccak256};
    use ink::prelude::{string::String, vec::Vec};
    use ink::storage::Mapping;

    // Cross-contract call trait for Registry
    #[ink::trait_definition]
    pub trait IRegistry {
        #[ink(message)]
        fn owner(&self, node: [u8; 32]) -> AccountId;
        #[ink(message)]
        fn is_approved_for_all(&self, owner: AccountId, operator: AccountId) -> bool;
    }

    #[ink(storage)]
    pub struct PublicResolver {
        registry: AccountId,
        addr: Mapping<[u8; 32], AccountId>,
        text: Mapping<([u8; 32], String), String>,
        contenthash: Mapping<[u8; 32], Vec<u8>>,
    }

    #[derive(scale::Encode, scale::Decode, Debug, PartialEq, Eq)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
    pub enum Error {
        NotAuthorized,
    }

    pub type Result<T> = core::result::Result<T, Error>;

    #[ink(event)]
    pub struct AddrChanged {
        #[ink(topic)]
        node: [u8; 32],
        addr: AccountId,
    }

    #[ink(event)]
    pub struct TextChanged {
        #[ink(topic)]
        node: [u8; 32],
        #[ink(topic)]
        key_hash: [u8; 32],
        value_hash: [u8; 32],
    }

    #[ink(event)]
    pub struct ContenthashChanged {
        #[ink(topic)]
        node: [u8; 32],
        hash: Vec<u8>,
    }

    impl PublicResolver {
        #[ink(constructor)]
        pub fn new(registry: AccountId) -> Self {
            Self {
                registry,
                addr: Mapping::new(),
                text: Mapping::new(),
                contenthash: Mapping::new(),
            }
        }

        fn keccak256(input: &[u8]) -> [u8; 32] {
            let mut out = [0u8; 32];
            Keccak256::hash(input, &mut out);
            out
        }

        fn is_authorized(&self, node: [u8; 32], caller: AccountId) -> bool {
            let registry: ink::contract_ref!(IRegistry) = self.registry.into();
            let owner = registry.owner(node);
            if owner == caller {
                return true;
            }
            registry.is_approved_for_all(owner, caller)
        }

        #[ink(message)]
        pub fn set_addr(&mut self, node: [u8; 32], address: AccountId) -> Result<()> {
            let caller = self.env().caller();
            if !self.is_authorized(node, caller) {
                return Err(Error::NotAuthorized);
            }
            self.addr.insert(node, &address);
            self.env().emit_event(AddrChanged { node, addr: address });
            Ok(())
        }

        #[ink(message)]
        pub fn addr(&self, node: [u8; 32]) -> Option<AccountId> {
            self.addr.get(node)
        }

        #[ink(message)]
        pub fn set_text(&mut self, node: [u8; 32], key: String, value: String) -> Result<()> {
            let caller = self.env().caller();
            if !self.is_authorized(node, caller) {
                return Err(Error::NotAuthorized);
            }
            let key_hash = Self::keccak256(key.as_bytes());
            let value_hash = Self::keccak256(value.as_bytes());
            self.text.insert((node, key), &value);
            self.env().emit_event(TextChanged { node, key_hash, value_hash });
            Ok(())
        }

        #[ink(message)]
        pub fn text(&self, node: [u8; 32], key: String) -> Option<String> {
            self.text.get((node, key))
        }

        #[ink(message)]
        pub fn set_contenthash(&mut self, node: [u8; 32], hash: Vec<u8>) -> Result<()> {
            let caller = self.env().caller();
            if !self.is_authorized(node, caller) {
                return Err(Error::NotAuthorized);
            }
            self.contenthash.insert(node, &hash);
            self.env().emit_event(ContenthashChanged { node, hash: hash.clone() });
            Ok(())
        }

        #[ink(message)]
        pub fn contenthash(&self, node: [u8; 32]) -> Option<Vec<u8>> {
            self.contenthash.get(node)
        }

        // Batch read helper — callers encode each query as raw SCALE bytes of
        // (selector: [u8;4], args...) and receive back the encoded return values.
        // Implemented as a convenience pass-through; actual decoding happens in SDK.
        #[ink(message)]
        pub fn multicall(&self, _calls: Vec<Vec<u8>>) -> Vec<Vec<u8>> {
            // In ink! 5.x, re-entrant self-calls inside a message are not
            // supported without chain extensions. The SDK batches reads via
            // api.queryMulti instead. This message is kept as a documented
            // stub; real multicall happens off-chain.
            ink::prelude::vec![]
        }
    }

    // ── Unit tests ────────────────────────────────────────────────────────────

    #[cfg(test)]
    mod tests {
        use super::*;

        fn zero_registry() -> AccountId {
            AccountId::from([0u8; 32])
        }

        #[ink::test]
        fn new_creates_empty_resolver() {
            let r = PublicResolver::new(zero_registry());
            assert!(r.addr([0u8; 32]).is_none());
            assert!(r.text([0u8; 32], "key".into()).is_none());
        }
    }
}
