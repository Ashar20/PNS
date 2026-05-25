import type { ApiPromise } from "@polkadot/api";
import type { KeyringPair } from "@polkadot/keyring/types";
import type { TxResult } from "../types.js";
import { signAndSend, unwrapOk } from "../utils.js";
import { ContractPromise } from "@polkadot/api-contract";

export function getRegistryContract(api: ApiPromise, address: string, abi: unknown) {
  return new ContractPromise(api, abi as string, address);
}

export async function getOwner(
  api: ApiPromise,
  address: string,
  abi: unknown,
  node: Uint8Array,
  caller: string
): Promise<string | null> {
  const contract = getRegistryContract(api, address, abi);
  const { output } = await contract.query.owner(
    caller,
    { gasLimit: (api.registry.createType("WeightV2", { refTime: 30_000_000_000n, proofSize: 131_072n })) as unknown as bigint, storageDepositLimit: null },
    Array.from(node)
  );
  const json = output?.toJSON() as { ok?: string } | string | null;
  if (!json) return null;
  // ink! Result<AccountId, Error> wraps the value in { ok: "0x..." }
  const addr = typeof json === "object" && "ok" in json ? json.ok : (json as string);
  return addr ?? null;
}

export async function setSubnodeOwner(
  api: ApiPromise,
  address: string,
  abi: unknown,
  node: Uint8Array,
  labelHash: Uint8Array,
  newOwner: string,
  signer: KeyringPair
): Promise<TxResult> {
  const contract = getRegistryContract(api, address, abi);
  const tx = contract.tx.setSubnodeOwner(
    { gasLimit: (api.registry.createType("WeightV2", { refTime: 30_000_000_000n, proofSize: 131_072n })) as unknown as bigint, storageDepositLimit: null },
    Array.from(node),
    Array.from(labelHash),
    newOwner
  );
  return signAndSend(tx, signer);
}

export async function setResolver(
  api: ApiPromise,
  address: string,
  abi: unknown,
  node: Uint8Array,
  resolver: string,
  signer: KeyringPair
): Promise<TxResult> {
  const contract = getRegistryContract(api, address, abi);
  const tx = contract.tx.setResolver(
    { gasLimit: (api.registry.createType("WeightV2", { refTime: 30_000_000_000n, proofSize: 131_072n })) as unknown as bigint, storageDepositLimit: null },
    Array.from(node),
    resolver
  );
  return signAndSend(tx, signer);
}

export async function recordExists(
  api: ApiPromise,
  address: string,
  abi: unknown,
  node: Uint8Array,
  caller: string
): Promise<boolean> {
  const contract = getRegistryContract(api, address, abi);
  const { output } = await contract.query.recordExists(
    caller,
    { gasLimit: (api.registry.createType("WeightV2", { refTime: 30_000_000_000n, proofSize: 131_072n })) as unknown as bigint, storageDepositLimit: null },
    Array.from(node)
  );
  return unwrapOk<boolean>(output?.toJSON()) ?? false;
}
