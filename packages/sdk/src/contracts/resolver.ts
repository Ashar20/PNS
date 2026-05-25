import type { ApiPromise } from "@polkadot/api";
import type { KeyringPair } from "@polkadot/keyring/types";
import type { TxResult } from "../types.js";
import { signAndSend } from "../utils.js";
import { ContractPromise } from "@polkadot/api-contract";

export function getResolverContract(api: ApiPromise, address: string, abi: unknown) {
  return new ContractPromise(api, abi as string, address);
}

export async function getAddr(
  api: ApiPromise,
  address: string,
  abi: unknown,
  node: Uint8Array,
  caller: string
): Promise<string | null> {
  const contract = getResolverContract(api, address, abi);
  const { output } = await contract.query.addr(
    caller,
    { gasLimit: api.registry.createType("WeightV2", { refTime: 5_000_000_000n, proofSize: 5_000n }) },
    Array.from(node)
  );
  return output?.toJSON() as string | null;
}

export async function getText(
  api: ApiPromise,
  address: string,
  abi: unknown,
  node: Uint8Array,
  key: string,
  caller: string
): Promise<string | null> {
  const contract = getResolverContract(api, address, abi);
  const { output } = await contract.query.text(
    caller,
    { gasLimit: api.registry.createType("WeightV2", { refTime: 5_000_000_000n, proofSize: 5_000n }) },
    Array.from(node),
    key
  );
  return output?.toJSON() as string | null;
}

export async function setText(
  api: ApiPromise,
  address: string,
  abi: unknown,
  node: Uint8Array,
  key: string,
  value: string,
  signer: KeyringPair
): Promise<TxResult> {
  const contract = getResolverContract(api, address, abi);
  const tx = contract.tx.setText(
    { gasLimit: api.registry.createType("WeightV2", { refTime: 10_000_000_000n, proofSize: 10_000n }) },
    Array.from(node),
    key,
    value
  );
  return signAndSend(tx, signer);
}

export async function setAddr(
  api: ApiPromise,
  address: string,
  abi: unknown,
  node: Uint8Array,
  addr: string,
  signer: KeyringPair
): Promise<TxResult> {
  const contract = getResolverContract(api, address, abi);
  const tx = contract.tx.setAddr(
    { gasLimit: api.registry.createType("WeightV2", { refTime: 10_000_000_000n, proofSize: 10_000n }) },
    Array.from(node),
    addr
  );
  return signAndSend(tx, signer);
}
