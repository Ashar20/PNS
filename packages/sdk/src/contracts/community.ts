import type { ApiPromise } from "@polkadot/api";
import type { SubmittableExtrinsic } from "@polkadot/api/types";
import type { KeyringPair } from "@polkadot/keyring/types";
import type { Member, TxResult } from "../types.js";
import { signAndSend, unwrapOk } from "../utils.js";
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
    { gasLimit: (api.registry.createType("WeightV2", { refTime: 30_000_000_000n, proofSize: 131_072n })) as unknown as bigint, storageDepositLimit: null },
    account
  );
  return unwrapOk<boolean>(output?.toJSON()) ?? false;
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
    { gasLimit: (api.registry.createType("WeightV2", { refTime: 30_000_000_000n, proofSize: 131_072n })) as unknown as bigint, storageDepositLimit: null },
    label
  );
  return unwrapOk<string>(output?.toJSON()) ?? null;
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
    { gasLimit: (api.registry.createType("WeightV2", { refTime: 30_000_000_000n, proofSize: 131_072n })) as unknown as bigint, storageDepositLimit: null }
  );
  return unwrapOk<number>(output?.toJSON()) ?? 0;
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
    { gasLimit: (api.registry.createType("WeightV2", { refTime: 30_000_000_000n, proofSize: 524_288n })) as unknown as bigint, storageDepositLimit: null },
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
    { gasLimit: (api.registry.createType("WeightV2", { refTime: 30_000_000_000n, proofSize: 524_288n })) as unknown as bigint, storageDepositLimit: null },
    label
  );
}
