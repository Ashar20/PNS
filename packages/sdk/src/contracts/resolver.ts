import type { ApiPromise } from "@polkadot/api";
import type { KeyringPair } from "@polkadot/keyring/types";
import type { TxResult } from "../types.js";
import { signAndSend, unwrapOk } from "../utils.js";
import { ContractPromise } from "@polkadot/api-contract";

function weight(api: ApiPromise, refTime: bigint, proofSize: bigint): unknown {
  return api.registry.createType("WeightV2", { refTime, proofSize });
}

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
    { gasLimit: weight(api, 30_000_000_000n, 524_288n) as unknown as bigint, storageDepositLimit: null },
    Array.from(node)
  );
  const raw = unwrapOk<{ ok?: string } | string>(output?.toJSON());
  if (!raw) return null;
  if (typeof raw === "object" && "ok" in raw) return raw.ok ?? null;
  return raw as string;
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
    { gasLimit: weight(api, 30_000_000_000n, 524_288n) as unknown as bigint, storageDepositLimit: null },
    Array.from(node),
    key
  );
  const raw = unwrapOk<{ ok?: string } | string>(output?.toJSON());
  if (!raw) return null;
  if (typeof raw === "object" && "ok" in raw) return raw.ok ?? null;
  return raw as string;
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
    { gasLimit: weight(api, 30_000_000_000n, 524_288n) as unknown as bigint, storageDepositLimit: null },
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
    { gasLimit: weight(api, 30_000_000_000n, 524_288n) as unknown as bigint, storageDepositLimit: null },
    Array.from(node),
    addr
  );
  return signAndSend(tx, signer);
}

export async function setName(
  api: ApiPromise,
  reverseRegistrarAddress: string,
  abi: unknown,
  name: string,
  signer: KeyringPair
): Promise<TxResult> {
  const contract = new ContractPromise(api, abi as string, reverseRegistrarAddress);
  const tx = contract.tx.setName(
    { gasLimit: weight(api, 30_000_000_000n, 131_072n) as unknown as bigint, storageDepositLimit: null },
    name
  );
  return signAndSend(tx, signer);
}
