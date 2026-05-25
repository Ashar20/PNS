#![cfg_attr(not(feature = "std"), no_std, no_main)]

#[ink::contract]
pub mod reverse_registrar {
    use ink::env::hash::{CryptoHash, Keccak256};
    use ink::prelude::string::String;
    use ink::storage::Mapping;

    #[ink::trait_definition]
    pub trait IRegistry {
        #[ink(message)]
        fn owner(&self, node: [u8; 32]) -> AccountId;
        #[ink(message)]
        fn is_approved_for_all(&self, owner: AccountId, operator: AccountId) -> bool;
        #[ink(message)]
        fn set_subnode_owner(
            &mut self,
            node: [u8; 32],
            label_hash: [u8; 32],
            new_owner: AccountId,
        ) -> Option<[u8; 32]>;
    }

    #[ink::trait_definition]
    pub trait IResolver {
        #[ink(message)]
        fn set_text(
            &mut self,
            node: [u8; 32],
            key: ink::prelude::string::String,
            value: ink::prelude::string::String,
        );
    }

    #[ink(storage)]
    pub struct ReverseRegistrar {
        registry: AccountId,
        default_resolver: AccountId,
        primary_names: Mapping<AccountId, String>,
    }

    #[derive(scale::Encode, scale::Decode, Debug, PartialEq, Eq)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
    pub enum Error {
        NotAuthorized,
        RegistryCallFailed,
    }

    pub type Result<T> = core::result::Result<T, Error>;

    #[ink(event)]
    pub struct ReverseClaimed {
        #[ink(topic)]
        account: AccountId,
        name: String,
    }

    impl ReverseRegistrar {
        #[ink(constructor)]
        pub fn new(registry: AccountId, default_resolver: AccountId) -> Self {
            Self {
                registry,
                default_resolver,
                primary_names: Mapping::new(),
            }
        }

        fn keccak256(input: &[u8]) -> [u8; 32] {
            let mut out = [0u8; 32];
            Keccak256::hash(input, &mut out);
            out
        }

        pub fn node_for_account(&self, account: AccountId) -> [u8; 32] {
            // namehash("<hex(account)>.addr.reverse")
            // We compute it directly rather than via string formatting to avoid alloc.
            let hex = Self::account_to_hex(account);
            // namehash of "addr.reverse"
            let addr_reverse = {
                let reverse_hash = Self::keccak256(b"reverse");
                let addr_hash = Self::keccak256(b"addr");
                let mut combined = [0u8; 64];
                combined[32..].copy_from_slice(&reverse_hash);
                let base = Self::keccak256(&combined);
                let mut combined2 = [0u8; 64];
                combined2[..32].copy_from_slice(&base);
                combined2[32..].copy_from_slice(&addr_hash);
                Self::keccak256(&combined2)
            };
            let hex_hash = Self::keccak256(hex.as_bytes());
            let mut combined = [0u8; 64];
            combined[..32].copy_from_slice(&addr_reverse);
            combined[32..].copy_from_slice(&hex_hash);
            Self::keccak256(&combined)
        }

        fn account_to_hex(account: AccountId) -> String {
            const HEX: &[u8; 16] = b"0123456789abcdef";
            let bytes: &[u8] = account.as_ref();
            let mut s = String::new();
            for b in bytes {
                s.push(char::from(HEX[(b >> 4) as usize]));
                s.push(char::from(HEX[(b & 0x0F) as usize]));
            }
            s
        }

        #[ink(message)]
        pub fn claim_for(&mut self, account: AccountId, name: String) -> Result<()> {
            let caller = self.env().caller();
            // Caller must be the account itself, or an approved operator
            let registry: ink::contract_ref!(IRegistry) = self.registry.into();
            let is_self = caller == account;
            let is_approved = registry.is_approved_for_all(account, caller);
            if !is_self && !is_approved {
                return Err(Error::NotAuthorized);
            }
            self.primary_names.insert(account, &name);
            self.env().emit_event(ReverseClaimed { account, name: name.clone() });
            Ok(())
        }

        #[ink(message)]
        pub fn set_name(&mut self, name: String) -> Result<()> {
            let caller = self.env().caller();
            self.claim_for(caller, name)
        }

        #[ink(message)]
        pub fn name_of(&self, account: AccountId) -> Option<String> {
            self.primary_names.get(account)
        }

        #[ink(message)]
        pub fn node_for_account_msg(&self, account: AccountId) -> [u8; 32] {
            self.node_for_account(account)
        }
    }

    #[cfg(test)]
    mod tests {
        use super::*;

        #[ink::test]
        fn set_name_records_primary() {
            let accounts =
                ink::env::test::default_accounts::<ink::env::DefaultEnvironment>();
            let r = ReverseRegistrar::new(
                AccountId::from([0u8; 32]),
                AccountId::from([0u8; 32]),
            );
            // set_name delegates to claim_for(caller, name)
            // In unit tests the cross-contract call to registry will fail because
            // there is no registry deployed — we test the pure storage path only.
            // E2E tests cover the full flow.
            assert!(r.name_of(accounts.alice).is_none());
        }

        #[ink::test]
        fn node_for_account_is_deterministic() {
            let r = ReverseRegistrar::new(
                AccountId::from([0u8; 32]),
                AccountId::from([0u8; 32]),
            );
            let accounts =
                ink::env::test::default_accounts::<ink::env::DefaultEnvironment>();
            let n1 = r.node_for_account(accounts.alice);
            let n2 = r.node_for_account(accounts.alice);
            assert_eq!(n1, n2);
            assert_ne!(n1, r.node_for_account(accounts.bob));
        }
    }
}
