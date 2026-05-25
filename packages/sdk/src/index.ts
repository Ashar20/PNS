export { PNSClient } from "./client.js";
export { namehash, namehashHex, labelHash, normaliseLabel, normaliseName } from "./namehash.js";
export * from "./types.js";
export * from "./constants.js";

// Pallet helpers
export * from "./pallets/identity.js";
export * from "./pallets/multisig.js";
export * from "./pallets/proxy.js";
export * from "./pallets/bounties.js";
export * from "./pallets/utility.js";

// Contract wrappers
export * from "./contracts/registry.js";
export * from "./contracts/resolver.js";
export * from "./contracts/community.js";
export * from "./contracts/attestation.js";

// Flows
export { registerName } from "./flows/register.js";
export { claimSubname, revokeSubname } from "./flows/claim-subname.js";
export { attestFlow, listAttestationsForSubject } from "./flows/attest.js";
