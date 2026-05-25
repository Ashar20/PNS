import type { ApiPromise } from "@polkadot/api";
import type { KeyringPair } from "@polkadot/keyring/types";
import type { ISubmittableResult } from "@polkadot/types/types";

export type AccountId = string; // SS58 encoded

export interface ContractAddresses {
  registry: string;
  resolver: string;
  reverseRegistrar: string;
  registrar: string;
  attestation: string;
  // community registrars are deployed per-community; stored separately
}

export interface ResolvedName {
  name: string;
  owner: AccountId;
  resolver: AccountId | null;
  addr: AccountId | null;
  textRecords: Record<string, string>;
  contenthash: Uint8Array | null;
  expiry: number | null;
}

export interface Member {
  label: string;
  account: AccountId;
  role: string;
  subname: string;
}

export interface CreateCommunityOpts {
  parentLabel: string;       // e.g. "bandit-dao" → registers "bandit-dao.pot"
  signers: AccountId[];
  threshold: number;
  openMembership: boolean;
  firstSigner: KeyringPair;
}

export interface CommunityHandle {
  multisigAddress: AccountId;
  communityRegistrarAddress: string;
  parentNode: Uint8Array;
}

export interface IssueSubnameOpts {
  communityRegistrarAddress: string;
  parentName: string;        // e.g. "bandit-dao.pot"
  label: string;             // e.g. "alice"
  member: AccountId;
  role: string;
  threshold: number;
  otherSignatories: AccountId[];
  firstSigner: KeyringPair;
}

export interface RevokeSubnameOpts {
  communityRegistrarAddress: string;
  parentName: string;
  label: string;
  threshold: number;
  otherSignatories: AccountId[];
  firstSigner: KeyringPair;
  memberAccount: AccountId;
}

export interface AttestOpts {
  issuerName: string;
  subjectName: string;
  schema: string;
  payload: Uint8Array;
  signer: KeyringPair;
}

export interface AttestationRecord {
  id: bigint;
  issuerNode: Uint8Array;
  subjectNode: Uint8Array;
  schema: string;
  payload: Uint8Array;
  issuedAt: bigint;
  revoked: boolean;
}

export interface ProfileFields {
  display?: string;
  legal?: string;
  web?: string;
  email?: string;
  twitter?: string;
  riot?: string;
  image?: string;
  additional?: Array<[string, string]>;
}

export interface PostBountyOpts {
  value: bigint;
  description: string;
  signer: KeyringPair;
}

export interface ClaimBountyOpts {
  bountyId: number;
  subnameName: string;   // used to set the contribution text record
  description: string;
  signer: KeyringPair;
}

export interface TxResult {
  blockHash: string;
  txHash: string;
  events: ISubmittableResult["events"];
}
