import type { ApiPromise } from "@polkadot/api";
import type { SubmittableExtrinsic } from "@polkadot/api/types";
import type { KeyringPair } from "@polkadot/keyring/types";
import type { Member, TxResult } from "../types.js";
import { signAndSend } from "../utils.js";
import { ContractPromise } from "@polkadot/api-contract";
import { namehash, labelHash } from "../namehash.js";

export function getCommunityContract(api: ApiPromise, address: string, abi: unknown) {
  return new ContractPromise(api, abi as string, address);
}

export async function isMember(
  api: ApiPromise,
  address: string,
  abi: unknown,
  account: string,
  caller: string
): Promise<boolean> {
  const contract = getCommunityContract(api, address, abi);
  const { output } = await contract.query.isMember(
    caller,
    { gasLimit: (api.registry.createType("WeightV2", { refTime: 5_000_000_000n, proofSize: 5_000n })) as unknown as bigint },
    account
  );
  return output?.toJSON() as boolean;
}

export async function roleOf(
  api: ApiPromise,
  address: string,
  abi: unknown,
  label: string,
  caller: string
): Promise<string | null> {
  const contract = getCommunityContract(api, address, abi);
  const { output } = await contract.query.roleOf(
    caller,
    { gasLimit: (api.registry.createType("WeightV2", { refTime: 5_000_000_000n, proofSize: 5_000n })) as unknown as bigint },
    label
  );
  return output?.toJSON() as string | null;
}

export async function membersCount(
  api: ApiPromise,
  address: string,
  abi: unknown,
  caller: string
): Promise<number> {
  const contract = getCommunityContract(api, address, abi);
  const { output } = await contract.query.membersCount(
    caller,
    { gasLimit: (api.registry.createType("WeightV2", { refTime: 5_000_000_000n, proofSize: 5_000n })) as unknown as bigint }
  );
  return output?.toJSON() as number;
}

export function buildIssueSubnameTx(
  api: ApiPromise,
  address: string,
  abi: unknown,
  label: string,
  member: string,
  role: string
): SubmittableExtrinsic<"promise"> {
  const contract = getCommunityContract(api, address, abi);
  return contract.tx.issueSubname(
    { gasLimit: (api.registry.createType("WeightV2", { refTime: 10_000_000_000n, proofSize: 10_000n })) as unknown as bigint },
    label,
    member,
    role
  );
}

export function buildRevokeSubnameTx(
  api: ApiPromise,
  address: string,
  abi: unknown,
  label: string
): SubmittableExtrinsic<"promise"> {
  const contract = getCommunityContract(api, address, abi);
  return contract.tx.revokeSubname(
    { gasLimit: (api.registry.createType("WeightV2", { refTime: 10_000_000_000n, proofSize: 10_000n })) as unknown as bigint },
    label
  );
}
