#![cfg_attr(not(feature = "std"), no_std, no_main)]

#[ink::contract]
pub mod attestation {
    use ink::prelude::{string::String, vec::Vec};
    use ink::storage::Mapping;

    // owner selector: blake2b("owner")[..4] = 0xfeaea4fa
    const SEL_OWNER: [u8; 4] = [0xfe, 0xae, 0xa4, 0xfa];

    #[derive(scale::Encode, scale::Decode, Debug, Clone)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
    pub struct AttestationRecord {
        pub id: u64,
        pub issuer_node: [u8; 32],
        pub subject_node: [u8; 32],
        pub schema: String,
        pub payload: Vec<u8>,
        pub issued_at: u64,
        pub revoked: bool,
    }

    #[ink(storage)]
    pub struct Attestation {
        registry: AccountId,
        next_id: u64,
        attestations: Mapping<u64, AttestationRecord>,
        by_subject_schema: Mapping<([u8; 32], String), Vec<u64>>,
        by_issuer: Mapping<[u8; 32], Vec<u64>>,
    }

    #[derive(scale::Encode, scale::Decode, Debug, PartialEq, Eq)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
    pub enum Error {
        NotAuthorized,
        AttestationNotFound,
        AlreadyRevoked,
    }

    pub type Result<T> = core::result::Result<T, Error>;

    #[ink(event)]
    pub struct Attested {
        #[ink(topic)]
        id: u64,
        #[ink(topic)]
        issuer_node: [u8; 32],
        #[ink(topic)]
        subject_node: [u8; 32],
        schema: String,
    }

    #[ink(event)]
    pub struct Revoked {
        #[ink(topic)]
        id: u64,
    }

    impl Attestation {
        #[ink(constructor)]
        pub fn new(registry: AccountId) -> Self {
            Self {
                registry,
                next_id: 0,
                attestations: Mapping::new(),
                by_subject_schema: Mapping::new(),
                by_issuer: Mapping::new(),
            }
        }

        fn caller_owns_node(&self, node: [u8; 32]) -> bool {
            use ink::env::call::{build_call, ExecutionInput, Selector};
            let owner: AccountId = build_call::<ink::env::DefaultEnvironment>()
                .call(self.registry)
                .ref_time_limit(5_000_000_000)
                .proof_size_limit(11_990_383_647_911_208_550)
                .exec_input(ExecutionInput::new(Selector::new(SEL_OWNER)).push_arg(node))
                .returns::<AccountId>()
                .invoke();
            owner == self.env().caller()
        }

        #[ink(message)]
        pub fn attest(
            &mut self,
            issuer_node: [u8; 32],
            subject_node: [u8; 32],
            schema: String,
            payload: Vec<u8>,
        ) -> Result<u64> {
            if !self.caller_owns_node(issuer_node) {
                return Err(Error::NotAuthorized);
            }
            let id = self.next_id;
            self.next_id = self.next_id.saturating_add(1);
            let issued_at = self.env().block_timestamp();
            let record = AttestationRecord {
                id,
                issuer_node,
                subject_node,
                schema: schema.clone(),
                payload,
                issued_at,
                revoked: false,
            };
            self.attestations.insert(id, &record);

            let key = (subject_node, schema.clone());
            let mut ids = self.by_subject_schema.get(&key).unwrap_or_default();
            ids.push(id);
            self.by_subject_schema.insert(key, &ids);

            let mut issuer_ids = self.by_issuer.get(issuer_node).unwrap_or_default();
            issuer_ids.push(id);
            self.by_issuer.insert(issuer_node, &issuer_ids);

            self.env().emit_event(Attested { id, issuer_node, subject_node, schema });
            Ok(id)
        }

        #[ink(message)]
        pub fn revoke(&mut self, id: u64) -> Result<()> {
            let mut record = self.attestations.get(id).ok_or(Error::AttestationNotFound)?;
            if record.revoked {
                return Err(Error::AlreadyRevoked);
            }
            if !self.caller_owns_node(record.issuer_node) {
                return Err(Error::NotAuthorized);
            }
            record.revoked = true;
            self.attestations.insert(id, &record);
            self.env().emit_event(Revoked { id });
            Ok(())
        }

        #[ink(message)]
        pub fn get(&self, id: u64) -> Option<AttestationRecord> {
            self.attestations.get(id)
        }

        #[ink(message)]
        pub fn list_by_subject(&self, subject_node: [u8; 32], schema: String) -> Vec<u64> {
            self.by_subject_schema.get((subject_node, schema)).unwrap_or_default()
        }

        #[ink(message)]
        pub fn list_by_issuer(&self, issuer_node: [u8; 32]) -> Vec<u64> {
            self.by_issuer.get(issuer_node).unwrap_or_default()
        }
    }

    #[cfg(test)]
    mod tests {
        use super::*;

        fn dummy_registry() -> AccountId {
            AccountId::from([0xAAu8; 32])
        }

        #[ink::test]
        fn new_starts_with_zero_next_id() {
            let a = Attestation::new(dummy_registry());
            assert!(a.get(0).is_none());
        }

        #[ink::test]
        fn list_by_subject_empty_for_unknown_node() {
            let a = Attestation::new(dummy_registry());
            let result = a.list_by_subject([0u8; 32], "endorsement.skill".into());
            assert!(result.is_empty());
        }

        #[ink::test]
        fn list_by_issuer_empty_for_unknown_node() {
            let a = Attestation::new(dummy_registry());
            assert!(a.list_by_issuer([0u8; 32]).is_empty());
        }

        #[ink::test]
        fn revoke_unknown_id_returns_not_found() {
            let mut a = Attestation::new(dummy_registry());
            assert_eq!(a.revoke(999), Err(Error::AttestationNotFound));
        }
    }
}
