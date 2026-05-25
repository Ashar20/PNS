import type { ApiPromise } from "@polkadot/api";
import type { KeyringPair } from "@polkadot/keyring/types";
import type { AttestationRecord, TxResult } from "../types.js";
import { signAndSend } from "../utils.js";
import { ContractPromise } from "@polkadot/api-contract";

export function getAttestationContract(api: ApiPromise, address: string, abi: unknown) {
  return new ContractPromise(api, abi as string, address);
}

export async function attest(
  api: ApiPromise,
  address: string,
  abi: unknown,
  issuerNode: Uint8Array,
  subjectNode: Uint8Array,
  schema: string,
  payload: Uint8Array,
  signer: KeyringPair
): Promise<TxResult & { id: bigint }> {
  const contract = getAttestationContract(api, address, abi);
  const tx = contract.tx.attest(
    { gasLimit: (api.registry.createType("WeightV2", { refTime: 10_000_000_000n, proofSize: 10_000n })) as unknown as bigint },
    Array.from(issuerNode),
    Array.from(subjectNode),
    schema,
    Array.from(payload)
  );
  const result = await signAndSend(tx, signer);
  // Parse the Attested event to extract the id
  let id = 0n;
  for (const item of result.events) {
    const ev = (item as { event: { method: string; data: { toString(): string }[] } }).event;
    if (ev.method === "Attested") {
      id = BigInt(ev.data[0].toString());
      break;
    }
  }
  return { ...result, id };
}

export async function revokeAttestation(
  api: ApiPromise,
  address: string,
  abi: unknown,
  id: bigint,
  signer: KeyringPair
): Promise<TxResult> {
  const contract = getAttestationContract(api, address, abi);
  const tx = contract.tx.revoke(
    { gasLimit: (api.registry.createType("WeightV2", { refTime: 10_000_000_000n, proofSize: 10_000n })) as unknown as bigint },
    id
  );
  return signAndSend(tx, signer);
}

export async function getAttestation(
  api: ApiPromise,
  address: string,
  abi: unknown,
  id: bigint,
  caller: string
): Promise<AttestationRecord | null> {
  const contract = getAttestationContract(api, address, abi);
  const { output } = await contract.query.get(
    caller,
    { gasLimit: (api.registry.createType("WeightV2", { refTime: 5_000_000_000n, proofSize: 5_000n })) as unknown as bigint },
    id
  );
  const raw = output?.toJSON() as Record<string, unknown> | null;
  if (!raw) return null;
  return {
    id: BigInt(raw["id"] as number),
    issuerNode: new Uint8Array(raw["issuerNode"] as number[]),
    subjectNode: new Uint8Array(raw["subjectNode"] as number[]),
    schema: raw["schema"] as string,
    payload: new Uint8Array(raw["payload"] as number[]),
    issuedAt: BigInt(raw["issuedAt"] as number),
    revoked: raw["revoked"] as boolean,
  };
}

export async function listBySubject(
  api: ApiPromise,
  address: string,
  abi: unknown,
  subjectNode: Uint8Array,
  schema: string,
  caller: string
): Promise<bigint[]> {
  const contract = getAttestationContract(api, address, abi);
  const { output } = await contract.query.listBySubject(
    caller,
    { gasLimit: (api.registry.createType("WeightV2", { refTime: 5_000_000_000n, proofSize: 5_000n })) as unknown as bigint },
    Array.from(subjectNode),
    schema
  );
  return ((output?.toJSON() as number[]) ?? []).map(BigInt);
}
