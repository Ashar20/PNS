#![cfg_attr(not(feature = "std"), no_std, no_main)]

#[ink::contract]
pub mod registry {
    use ink::storage::Mapping;

    // ── Namehash helpers ─────────────────────────────────────────────────────

    fn keccak256(input: &[u8]) -> [u8; 32] {
        use ink::env::hash::{CryptoHash, Keccak256};
        let mut out = [0u8; 32];
        Keccak256::hash(input, &mut out);
        out
    }

    pub fn namehash(name: &str) -> [u8; 32] {
        if name.is_empty() {
            return [0u8; 32];
        }
        let labels: ink::prelude::vec::Vec<&str> = name.split('.').collect();
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

    // ── Storage ───────────────────────────────────────────────────────────────

    #[ink(storage)]
    pub struct Registry {
        owners: Mapping<[u8; 32], AccountId>,
        resolvers: Mapping<[u8; 32], AccountId>,
        ttls: Mapping<[u8; 32], u64>,
        operators: Mapping<(AccountId, AccountId), bool>,
        root: AccountId,
    }

    // ── Errors ────────────────────────────────────────────────────────────────

    #[derive(scale::Encode, scale::Decode, Debug, PartialEq, Eq)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
    pub enum Error {
        NotAuthorized,
        NodeNotFound,
    }

    pub type Result<T> = core::result::Result<T, Error>;

    // ── Events ────────────────────────────────────────────────────────────────

    #[ink(event)]
    pub struct Transfer {
        #[ink(topic)]
        node: [u8; 32],
        owner: AccountId,
    }

    #[ink(event)]
    pub struct NewOwner {
        #[ink(topic)]
        node: [u8; 32],
        #[ink(topic)]
        label: [u8; 32],
        owner: AccountId,
    }

    #[ink(event)]
    pub struct NewResolver {
        #[ink(topic)]
        node: [u8; 32],
        resolver: AccountId,
    }

    #[ink(event)]
    pub struct NewTTL {
        #[ink(topic)]
        node: [u8; 32],
        ttl: u64,
    }

    #[ink(event)]
    pub struct ApprovalForAll {
        #[ink(topic)]
        owner: AccountId,
        #[ink(topic)]
        operator: AccountId,
        approved: bool,
    }

    // ── Implementation ────────────────────────────────────────────────────────

    impl Registry {
        #[ink(constructor)]
        pub fn new() -> Self {
            let caller = Self::env().caller();
            let mut owners = Mapping::new();
            owners.insert([0u8; 32], &caller);
            Self {
                owners,
                resolvers: Mapping::new(),
                ttls: Mapping::new(),
                operators: Mapping::new(),
                root: caller,
            }
        }

        fn is_authorized(&self, node: &[u8; 32], caller: &AccountId) -> bool {
            let owner = self.owners.get(node).unwrap_or(AccountId::from([0u8; 32]));
            &owner == caller || self.operators.get((owner, *caller)).unwrap_or(false)
        }

        #[ink(message)]
        pub fn set_owner(&mut self, node: [u8; 32], new_owner: AccountId) -> Result<()> {
            let caller = self.env().caller();
            if !self.is_authorized(&node, &caller) {
                return Err(Error::NotAuthorized);
            }
            self.owners.insert(node, &new_owner);
            self.env().emit_event(Transfer { node, owner: new_owner });
            Ok(())
        }

        #[ink(message)]
        pub fn set_subnode_owner(
            &mut self,
            node: [u8; 32],
            label_hash: [u8; 32],
            new_owner: AccountId,
        ) -> Option<[u8; 32]> {
            let caller = self.env().caller();
            if !self.is_authorized(&node, &caller) {
                return None;
            }
            let mut combined = [0u8; 64];
            combined[..32].copy_from_slice(&node);
            combined[32..].copy_from_slice(&label_hash);
            let subnode = keccak256(&combined);
            self.owners.insert(subnode, &new_owner);
            self.env().emit_event(NewOwner { node, label: label_hash, owner: new_owner });
            Some(subnode)
        }

        #[ink(message)]
        pub fn set_resolver(&mut self, node: [u8; 32], resolver: AccountId) -> Result<()> {
            let caller = self.env().caller();
            if !self.is_authorized(&node, &caller) {
                return Err(Error::NotAuthorized);
            }
            self.resolvers.insert(node, &resolver);
            self.env().emit_event(NewResolver { node, resolver });
            Ok(())
        }

        #[ink(message)]
        pub fn set_ttl(&mut self, node: [u8; 32], ttl: u64) -> Result<()> {
            let caller = self.env().caller();
            if !self.is_authorized(&node, &caller) {
                return Err(Error::NotAuthorized);
            }
            self.ttls.insert(node, &ttl);
            self.env().emit_event(NewTTL { node, ttl });
            Ok(())
        }

        #[ink(message)]
        pub fn set_approval_for_all(&mut self, operator: AccountId, approved: bool) {
            let caller = self.env().caller();
            // Prevent self-approval (no-op would be confusing)
            if caller == operator {
                return;
            }
            self.operators.insert((caller, operator), &approved);
            self.env().emit_event(ApprovalForAll { owner: caller, operator, approved });
        }

        #[ink(message)]
        pub fn owner(&self, node: [u8; 32]) -> AccountId {
            self.owners.get(node).unwrap_or(AccountId::from([0u8; 32]))
        }

        #[ink(message)]
        pub fn resolver(&self, node: [u8; 32]) -> AccountId {
            self.resolvers.get(node).unwrap_or(AccountId::from([0u8; 32]))
        }

        #[ink(message)]
        pub fn ttl(&self, node: [u8; 32]) -> u64 {
            self.ttls.get(node).unwrap_or(0)
        }

        #[ink(message)]
        pub fn is_approved_for_all(&self, owner: AccountId, operator: AccountId) -> bool {
            self.operators.get((owner, operator)).unwrap_or(false)
        }

        #[ink(message)]
        pub fn record_exists(&self, node: [u8; 32]) -> bool {
            self.owners.contains(node)
        }

        #[ink(message)]
        pub fn root(&self) -> AccountId {
            self.root
        }
    }

    impl Default for Registry {
        fn default() -> Self {
            Self::new()
        }
    }

    // ── Unit tests ────────────────────────────────────────────────────────────

    #[cfg(test)]
    mod tests {
        use super::*;

        fn alice() -> AccountId {
            AccountId::from([0x01u8; 32])
        }

        fn bob() -> AccountId {
            AccountId::from([0x02u8; 32])
        }

        #[ink::test]
        fn namehash_empty_returns_zero() {
            assert_eq!(namehash(""), [0u8; 32]);
        }

        #[ink::test]
        fn namehash_deterministic() {
            let a = namehash("alice.pot");
            let b = namehash("alice.pot");
            assert_eq!(a, b);
        }

        #[ink::test]
        fn namehash_different_names_differ() {
            assert_ne!(namehash("alice.pot"), namehash("bob.pot"));
        }

        #[ink::test]
        fn constructor_sets_root_as_zero_node_owner() {
            let registry = Registry::new();
            let env_caller = ink::env::test::default_accounts::<ink::env::DefaultEnvironment>()
                .alice;
            assert_eq!(registry.owner([0u8; 32]), env_caller);
            assert_eq!(registry.root(), env_caller);
        }

        #[ink::test]
        fn set_owner_transfers_ownership() {
            let mut registry = Registry::new();
            let alice =
                ink::env::test::default_accounts::<ink::env::DefaultEnvironment>().alice;
            let bob = ink::env::test::default_accounts::<ink::env::DefaultEnvironment>().bob;
            registry.set_owner([0u8; 32], bob).unwrap();
            assert_eq!(registry.owner([0u8; 32]), bob);
            // alice no longer owns zero node
            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(alice);
            assert!(registry.set_owner([0u8; 32], alice).is_err());
        }

        #[ink::test]
        fn set_subnode_owner_creates_child_node() {
            let mut registry = Registry::new();
            let bob = ink::env::test::default_accounts::<ink::env::DefaultEnvironment>().bob;
            let label_hash = keccak256(b"pot");
            let subnode = registry
                .set_subnode_owner([0u8; 32], label_hash, bob)
                .expect("root owner can create subnode");
            assert_eq!(registry.owner(subnode), bob);
        }

        #[ink::test]
        fn set_resolver_and_read_back() {
            let mut registry = Registry::new();
            let resolver_addr =
                ink::env::test::default_accounts::<ink::env::DefaultEnvironment>().charlie;
            registry.set_resolver([0u8; 32], resolver_addr).unwrap();
            assert_eq!(registry.resolver([0u8; 32]), resolver_addr);
        }

        #[ink::test]
        fn unauthorized_set_owner_fails() {
            let mut registry = Registry::new();
            let charlie =
                ink::env::test::default_accounts::<ink::env::DefaultEnvironment>().charlie;
            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(charlie);
            assert_eq!(
                registry.set_owner([0u8; 32], charlie),
                Err(Error::NotAuthorized)
            );
        }

        #[ink::test]
        fn approval_for_all_allows_operator() {
            let mut registry = Registry::new();
            let accounts =
                ink::env::test::default_accounts::<ink::env::DefaultEnvironment>();
            let bob = accounts.bob;
            // Alice approves Bob
            registry.set_approval_for_all(bob, true);
            // Now Bob should be able to call set_owner
            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(bob);
            // Bob is approved for all of Alice's nodes — use zero node
            let result = registry.set_owner([0u8; 32], bob);
            assert!(result.is_ok());
        }

        #[ink::test]
        fn record_exists_returns_false_for_unknown_node() {
            let registry = Registry::new();
            assert!(!registry.record_exists([0xFFu8; 32]));
        }
    }
}
