#![cfg_attr(not(feature = "std"), no_std, no_main)]

#[ink::contract]
pub mod registrar {
    use ink::env::hash::{CryptoHash, Keccak256};
    use ink::prelude::string::String;
    use ink::storage::Mapping;

    #[ink::trait_definition]
    pub trait IRegistry {
        #[ink(message)]
        fn set_subnode_owner(
            &mut self,
            node: [u8; 32],
            label_hash: [u8; 32],
            new_owner: AccountId,
        ) -> Result<[u8; 32], RegistryError>;

        #[ink(message)]
        fn owner(&self, node: [u8; 32]) -> AccountId;
    }

    #[derive(scale::Encode, scale::Decode, Debug, PartialEq, Eq)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
    pub enum RegistryError {
        NotAuthorized,
        NodeNotFound,
    }

    #[ink(storage)]
    pub struct Registrar {
        registry: AccountId,
        base_node: [u8; 32],
        expiries: Mapping<[u8; 32], BlockNumber>,
        price: Balance,
        period: BlockNumber,
        admin: AccountId,
    }

    #[derive(scale::Encode, scale::Decode, Debug, PartialEq, Eq)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
    pub enum Error {
        LabelNotAvailable,
        InsufficientPayment,
        NotAdmin,
        RegistryCallFailed,
        InvalidLabel,
    }

    pub type Result<T> = core::result::Result<T, Error>;

    #[ink(event)]
    pub struct NameRegistered {
        #[ink(topic)]
        label: String,
        owner: AccountId,
        expires: BlockNumber,
    }

    #[ink(event)]
    pub struct NameRenewed {
        #[ink(topic)]
        label: String,
        expires: BlockNumber,
    }

    impl Registrar {
        #[ink(constructor, payable)]
        pub fn new(
            registry: AccountId,
            base_node: [u8; 32],
            price: Balance,
            period: BlockNumber,
            admin: AccountId,
        ) -> Self {
            Self {
                registry,
                base_node,
                expiries: Mapping::new(),
                price,
                period,
                admin,
            }
        }

        fn keccak256(input: &[u8]) -> [u8; 32] {
            let mut out = [0u8; 32];
            Keccak256::hash(input, &mut out);
            out
        }

        fn label_is_valid(label: &str) -> bool {
            !label.is_empty()
                && label.chars().all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == '-')
                && !label.starts_with('-')
                && !label.ends_with('-')
        }

        #[ink(message, payable)]
        pub fn register(&mut self, label: String, owner: AccountId) -> Result<[u8; 32]> {
            if !Self::label_is_valid(&label) {
                return Err(Error::InvalidLabel);
            }
            let paid = self.env().transferred_value();
            if paid < self.price {
                return Err(Error::InsufficientPayment);
            }
            let label_hash = Self::keccak256(label.as_bytes());
            let current_block = self.env().block_number();
            if let Some(exp) = self.expiries.get(label_hash) {
                if exp >= current_block {
                    return Err(Error::LabelNotAvailable);
                }
            }
            let expires = current_block + self.period;
            self.expiries.insert(label_hash, &expires);

            // Refund excess
            let excess = paid - self.price;
            if excess > 0 {
                self.env()
                    .transfer(self.env().caller(), excess)
                    .expect("refund failed");
            }

            let mut registry: ink::contract_ref!(IRegistry) = self.registry.into();
            let subnode = registry
                .set_subnode_owner(self.base_node, label_hash, owner)
                .map_err(|_| Error::RegistryCallFailed)?;

            self.env().emit_event(NameRegistered {
                label: label.clone(),
                owner,
                expires,
            });
            Ok(subnode)
        }

        #[ink(message, payable)]
        pub fn renew(&mut self, label: String, periods: u32) -> Result<()> {
            let paid = self.env().transferred_value();
            let total_cost = self.price * u128::from(periods);
            if paid < total_cost {
                return Err(Error::InsufficientPayment);
            }
            let label_hash = Self::keccak256(label.as_bytes());
            let current_block = self.env().block_number();
            let current_expiry = self.expiries.get(label_hash).unwrap_or(current_block);
            let new_expiry = current_expiry + self.period * u32::from(periods as u32);
            self.expiries.insert(label_hash, &new_expiry);

            let excess = paid - total_cost;
            if excess > 0 {
                self.env()
                    .transfer(self.env().caller(), excess)
                    .expect("refund failed");
            }

            self.env().emit_event(NameRenewed { label, expires: new_expiry });
            Ok(())
        }

        #[ink(message)]
        pub fn available(&self, label: String) -> bool {
            let label_hash = Self::keccak256(label.as_bytes());
            let current_block = self.env().block_number();
            self.expiries.get(label_hash).map_or(true, |exp| exp < current_block)
        }

        #[ink(message)]
        pub fn expiry_of(&self, label: String) -> BlockNumber {
            let label_hash = Self::keccak256(label.as_bytes());
            self.expiries.get(label_hash).unwrap_or(0)
        }

        #[ink(message)]
        pub fn withdraw(&mut self) -> Result<()> {
            let caller = self.env().caller();
            if caller != self.admin {
                return Err(Error::NotAdmin);
            }
            let balance = self.env().balance();
            if balance > 0 {
                self.env().transfer(self.admin, balance).expect("withdraw failed");
            }
            Ok(())
        }

        #[ink(message)]
        pub fn set_price(&mut self, new_price: Balance) -> Result<()> {
            let caller = self.env().caller();
            if caller != self.admin {
                return Err(Error::NotAdmin);
            }
            self.price = new_price;
            Ok(())
        }

        #[ink(message)]
        pub fn price(&self) -> Balance {
            self.price
        }
    }

    #[cfg(test)]
    mod tests {
        use super::*;

        fn dummy_registry() -> AccountId {
            AccountId::from([0xAAu8; 32])
        }

        fn base_node() -> [u8; 32] {
            // namehash("pot") — precomputed for test purposes
            [
                0x6c, 0x25, 0x39, 0x52, 0x3d, 0x6a, 0x14, 0x17, 0x50, 0x33, 0xdd, 0x88, 0x9f,
                0x2c, 0x3c, 0x6d, 0x13, 0x62, 0x2e, 0x6b, 0x62, 0x73, 0xcf, 0x5b, 0x1a, 0x34,
                0xc6, 0x58, 0x23, 0xb3, 0x0e, 0x24,
            ]
        }

        #[ink::test]
        fn label_validation_rejects_uppercase() {
            assert!(!Registrar::label_is_valid("Alice"));
        }

        #[ink::test]
        fn label_validation_rejects_leading_dash() {
            assert!(!Registrar::label_is_valid("-alice"));
        }

        #[ink::test]
        fn label_validation_accepts_valid() {
            assert!(Registrar::label_is_valid("alice"));
            assert!(Registrar::label_is_valid("bandit-dao"));
            assert!(Registrar::label_is_valid("hello123"));
        }

        #[ink::test]
        fn price_getter() {
            let r = Registrar::new(dummy_registry(), base_node(), 1_000_000, 1_000, dummy_registry());
            assert_eq!(r.price(), 1_000_000);
        }

        #[ink::test]
        fn available_returns_true_for_unknown_label() {
            let r = Registrar::new(dummy_registry(), base_node(), 1_000_000, 1_000, dummy_registry());
            assert!(r.available("freshname".into()));
        }
    }
}
