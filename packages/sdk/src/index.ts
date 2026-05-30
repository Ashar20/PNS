export { PNSClient } from "./client.js";
export { namehash, namehashHex, labelHash, normaliseLabel, normaliseName } from "./namehash.js";
export { isZeroAccount, unwrapOk, extractBatchError } from "./utils.js";
export * from "./types.js";
export * from "./constants.js";

// Pallet helpers
export * from "./pallets/identity.js";
export { hasIdentityPallet } from "./pallets/identity.js";
export * from "./pallets/multisig.js";
export * from "./pallets/proxy.js";
export * from "./pallets/bounties.js";
export * from "./pallets/utility.js";
export * from "./pallets/balances.js";

// Contract wrappers
export * from "./contracts/registry.js";
export * from "./contracts/resolver.js";
export * from "./contracts/community.js";
export * from "./contracts/attestation.js";

// Flows
export { registerName, buildRegisterNameTx } from "./flows/register.js";
export type { BuildRegisterNameOpts } from "./flows/register.js";
export { claimSubname, revokeSubname } from "./flows/claim-subname.js";
export {
  issueSubnameAsOwner,
  buildIssueSubnameAsOwnerTx,
  planIssueSubnameAsOwner,
  buildPersistRegistrarMetaTx,
  buildApproveCommunityRegistrarTx,
  listSubnamesForParent,
  getCommunityRegistrarAddress,
  persistRegistrarMeta,
  approveCommunityRegistrar,
  parseSubnameIndex,
  COMMUNITY_REGISTRAR_RECORD,
  SUBNAME_INDEX_RECORD,
} from "./flows/issue-subname-owner.js";
export type {
  IssueSubnameAsOwnerOpts,
  IssueSubnameAsOwnerBaseOpts,
  PersistRegistrarMetaOpts,
  SubnameIndexEntry,
} from "./flows/issue-subname-owner.js";
export { attestFlow, listAttestationsForSubject } from "./flows/attest.js";
export { saveProfile, buildSaveProfileTx, diffRecords } from "./flows/save-profile.js";
export type { SaveProfileOpts, SaveProfileBaseOpts } from "./flows/save-profile.js";
