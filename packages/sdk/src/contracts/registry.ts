import type { ApiPromise } from "@polkadot/api";
import type { KeyringPair } from "@polkadot/keyring/types";
import type { TxResult } from "../types.js";
import { signAndSend } from "../utils.js";
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
    { gasLimit: (api.registry.createType("WeightV2", { refTime: 5_000_000_000n, proofSize: 5_000n })) as unknown as bigint },
    Array.from(node)
  );
  const result = output?.toJSON() as string | null;
  return result;
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
    { gasLimit: (api.registry.createType("WeightV2", { refTime: 10_000_000_000n, proofSize: 10_000n })) as unknown as bigint },
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
    { gasLimit: (api.registry.createType("WeightV2", { refTime: 10_000_000_000n, proofSize: 10_000n })) as unknown as bigint },
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
    { gasLimit: (api.registry.createType("WeightV2", { refTime: 5_000_000_000n, proofSize: 5_000n })) as unknown as bigint },
    Array.from(node)
  );
  return output?.toJSON() as boolean;
}
