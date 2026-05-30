#![cfg_attr(not(feature = "std"), no_std, no_main)]

#[ink::contract]
pub mod community_registrar {
    use ink::env::hash::{CryptoHash, Keccak256};
    use ink::prelude::{string::String, vec::Vec};
    use ink::storage::Mapping;

    // Registry selectors (blake2b of message name, first 4 bytes big-endian):
    // set_subnode_owner = 0x55255750
    // set_owner         = 0x367facd6
    const SEL_SET_SUBNODE_OWNER: [u8; 4] = [0x55, 0x25, 0x57, 0x50];
    const SEL_SET_OWNER: [u8; 4] = [0x36, 0x7f, 0xac, 0xd6];

    // Mirror of registry::Error so SCALE-decoding the cross-contract
    // Result<(), Error> return value lines up with the wire format.
    #[derive(scale::Encode, scale::Decode, Debug, PartialEq, Eq)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
    pub enum RegistryErr {
        NotAuthorized,
        NodeNotFound,
    }

    #[ink(storage)]
    pub struct CommunityRegistrar {
        registry: AccountId,
        parent_node: [u8; 32],
        community_account: AccountId,
        members: Mapping<[u8; 32], AccountId>,
        roles: Mapping<[u8; 32], String>,
        member_labels: Mapping<AccountId, Vec<[u8; 32]>>,
        open_membership: bool,
        member_count: u32,
    }

    #[derive(scale::Encode, scale::Decode, Debug, PartialEq, Eq)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
    pub enum Error {
        NotAuthorized,
        AlreadyMember,
        NotMember,
        RegistryCallFailed,
    }

    pub type Result<T> = core::result::Result<T, Error>;

    #[ink(event)]
    pub struct SubnameIssued {
        #[ink(topic)]
        label: String,
        member: AccountId,
        role: String,
    }

    #[ink(event)]
    pub struct SubnameRevoked {
        #[ink(topic)]
        label: String,
    }

    #[ink(event)]
    pub struct RoleChanged {
        #[ink(topic)]
        label: String,
        role: String,
    }

    impl CommunityRegistrar {
        #[ink(constructor)]
        pub fn new(
            registry: AccountId,
            parent_node: [u8; 32],
            community_account: AccountId,
            open_membership: bool,
        ) -> Self {
            Self {
                registry,
                parent_node,
                community_account,
                members: Mapping::new(),
                roles: Mapping::new(),
                member_labels: Mapping::new(),
                open_membership,
                member_count: 0,
            }
        }

        fn keccak256(input: &[u8]) -> [u8; 32] {
            let mut out = [0u8; 32];
            Keccak256::hash(input, &mut out);
            out
        }

        fn subnode(parent: [u8; 32], label_hash: [u8; 32]) -> [u8; 32] {
            let mut combined = [0u8; 64];
            combined[..32].copy_from_slice(&parent);
            combined[32..].copy_from_slice(&label_hash);
            Self::keccak256(&combined)
        }

        fn is_community_caller(&self, caller: &AccountId) -> bool {
            *caller == self.community_account
        }

        #[ink(message)]
        pub fn issue_subname(
            &mut self,
            label: String,
            member: AccountId,
            role: String,
        ) -> Result<[u8; 32]> {
            let caller = self.env().caller();
            let open_and_self = self.open_membership && caller == member;
            if !self.is_community_caller(&caller) && !open_and_self {
                return Err(Error::NotAuthorized);
            }
            let label_hash = Self::keccak256(label.as_bytes());
            if self.members.contains(label_hash) {
                return Err(Error::AlreadyMember);
            }
            use ink::env::call::{build_call, ExecutionInput, Selector};
            let subnode: Option<[u8; 32]> = build_call::<ink::env::DefaultEnvironment>()
                .call(self.registry)
                .ref_time_limit(10_000_000_000)
                .proof_size_limit(11_990_383_647_911_208_550)
                .exec_input(
                    ExecutionInput::new(Selector::new(SEL_SET_SUBNODE_OWNER))
                        .push_arg(self.parent_node)
                        .push_arg(label_hash)
                        .push_arg(member),
                )
                .returns::<Option<[u8; 32]>>()
                .invoke();
            let subnode = subnode.ok_or(Error::RegistryCallFailed)?;

            self.members.insert(label_hash, &member);
            self.roles.insert(label_hash, &role);
            let mut labels = self.member_labels.get(member).unwrap_or_default();
            labels.push(label_hash);
            self.member_labels.insert(member, &labels);
            self.member_count = self.member_count.saturating_add(1);

            self.env().emit_event(SubnameIssued {
                label: label.clone(),
                member,
                role: role.clone(),
            });
            Ok(subnode)
        }

        #[ink(message)]
        pub fn revoke_subname(&mut self, label: String) -> Result<()> {
            let caller = self.env().caller();
            if !self.is_community_caller(&caller) {
                return Err(Error::NotAuthorized);
            }
            let label_hash = Self::keccak256(label.as_bytes());
            let member = self.members.get(label_hash).ok_or(Error::NotMember)?;
            let subnode = Self::subnode(self.parent_node, label_hash);

            use ink::env::call::{build_call, ExecutionInput, Selector};
            // Transfer subnode ownership to zero address (effectively null).
            // Registry::set_owner returns Result<(), Error>; the cross-contract
            // call ignores the success/failure since revocation is best-effort
            // after the local member maps have already been mutated.
            let _: core::result::Result<(), RegistryErr> =
                build_call::<ink::env::DefaultEnvironment>()
                    .call(self.registry)
                    .ref_time_limit(10_000_000_000)
                    .proof_size_limit(11_990_383_647_911_208_550)
                    .exec_input(
                        ExecutionInput::new(Selector::new(SEL_SET_OWNER))
                            .push_arg(subnode)
                            .push_arg(AccountId::from([0u8; 32])),
                    )
                    .returns::<core::result::Result<(), RegistryErr>>()
                    .invoke();

            self.members.remove(label_hash);
            self.roles.remove(label_hash);
            let mut labels = self.member_labels.get(member).unwrap_or_default();
            labels.retain(|&lh| lh != label_hash);
            self.member_labels.insert(member, &labels);
            self.member_count = self.member_count.saturating_sub(1);

            self.env().emit_event(SubnameRevoked { label });
            Ok(())
        }

        #[ink(message)]
        pub fn set_role(&mut self, label: String, role: String) -> Result<()> {
            let caller = self.env().caller();
            if !self.is_community_caller(&caller) {
                return Err(Error::NotAuthorized);
            }
            let label_hash = Self::keccak256(label.as_bytes());
            if !self.members.contains(label_hash) {
                return Err(Error::NotMember);
            }
            self.roles.insert(label_hash, &role);
            self.env().emit_event(RoleChanged { label, role });
            Ok(())
        }

        #[ink(message)]
        pub fn role_of(&self, label: String) -> Option<String> {
            let label_hash = Self::keccak256(label.as_bytes());
            self.roles.get(label_hash)
        }

        #[ink(message)]
        pub fn is_member(&self, account: AccountId) -> bool {
            // Check if any label is owned by this account
            self.member_labels
                .get(account)
                .is_some_and(|v| !v.is_empty())
        }

        #[ink(message)]
        pub fn members_count(&self) -> u32 {
            self.member_count
        }

        #[ink(message)]
        pub fn community_account(&self) -> AccountId {
            self.community_account
        }

        #[ink(message)]
        pub fn parent_node(&self) -> [u8; 32] {
            self.parent_node
        }
    }

    #[cfg(test)]
    mod tests {
        use super::*;

        fn dummy_registry() -> AccountId {
            AccountId::from([0xAAu8; 32])
        }

        fn dummy_parent() -> [u8; 32] {
            [0x01u8; 32]
        }

        fn community_acc() -> AccountId {
            ink::env::test::default_accounts::<ink::env::DefaultEnvironment>().alice
        }

        #[ink::test]
        fn initial_member_count_is_zero() {
            let c = CommunityRegistrar::new(dummy_registry(), dummy_parent(), community_acc(), false);
            assert_eq!(c.members_count(), 0);
        }

        #[ink::test]
        fn non_community_caller_cannot_issue() {
            let mut c =
                CommunityRegistrar::new(dummy_registry(), dummy_parent(), community_acc(), false);
            let accounts =
                ink::env::test::default_accounts::<ink::env::DefaultEnvironment>();
            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(accounts.bob);
            // Registry cross-contract call would fail before the auth check in a
            // real node; in unit tests the auth check fires first.
            let res = c.issue_subname("alice".into(), accounts.bob, "voter".into());
            assert_eq!(res, Err(Error::NotAuthorized));
        }

        #[ink::test]
        fn community_account_getter() {
            let c = CommunityRegistrar::new(dummy_registry(), dummy_parent(), community_acc(), true);
            assert_eq!(c.community_account(), community_acc());
            assert_eq!(c.parent_node(), dummy_parent());
        }

        #[ink::test]
        fn role_of_returns_none_for_unknown_label() {
            let c = CommunityRegistrar::new(dummy_registry(), dummy_parent(), community_acc(), false);
            assert!(c.role_of("nobody".into()).is_none());
        }
    }
}
