import type { ApiPromise } from "@polkadot/api";
import type { SubmittableExtrinsic } from "@polkadot/api/types";
import type { KeyringPair } from "@polkadot/keyring/types";
import type { AttestationRecord, TxResult } from "../types.js";
import { signAndSend, unwrapOk } from "../utils.js";
import { ContractPromise } from "@polkadot/api-contract";

export function getAttestationContract(api: ApiPromise, address: string, abi: unknown) {
  return new ContractPromise(api, abi as string, address);
}

export function buildAttestTx(
  api: ApiPromise,
  address: string,
  abi: unknown,
  issuerNode: Uint8Array,
  subjectNode: Uint8Array,
  schema: string,
  payload: Uint8Array
): SubmittableExtrinsic<"promise"> {
  const contract = getAttestationContract(api, address, abi);
  return contract.tx.attest(
    {
      gasLimit: api.registry.createType("WeightV2", {
        refTime: 30_000_000_000n,
        proofSize: 524_288n,
      }) as unknown as bigint,
      storageDepositLimit: null,
    },
    Array.from(issuerNode),
    Array.from(subjectNode),
    schema,
    Array.from(payload)
  );
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
  const tx = buildAttestTx(api, address, abi, issuerNode, subjectNode, schema, payload);
  const result = await signAndSend(tx, signer);
  // Retrieve the id by querying the subject index — it's the last entry
  const ids = await listBySubject(api, address, abi, subjectNode, schema, signer.address);
  const id = ids.length > 0 ? ids[ids.length - 1] : 0n;
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
    { gasLimit: (api.registry.createType("WeightV2", { refTime: 30_000_000_000n, proofSize: 524_288n })) as unknown as bigint, storageDepositLimit: null },
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
    { gasLimit: (api.registry.createType("WeightV2", { refTime: 30_000_000_000n, proofSize: 131_072n })) as unknown as bigint, storageDepositLimit: null },
    id
  );
  const unwrapped = unwrapOk<Record<string, unknown>>(output?.toJSON());
  const raw = unwrapped && typeof unwrapped === "object" && "ok" in unwrapped
    ? (unwrapped as { ok: Record<string, unknown> | null }).ok
    : unwrapped as Record<string, unknown> | null;
  if (!raw) return null;
  const hexToU8a = (hex: string): Uint8Array => {
    const h = hex.startsWith("0x") ? hex.slice(2) : hex;
    const arr = new Uint8Array(h.length / 2);
    for (let i = 0; i < arr.length; i++) arr[i] = parseInt(h.slice(i * 2, i * 2 + 2), 16);
    return arr;
  };
  const toU8a = (v: unknown): Uint8Array =>
    typeof v === "string" ? hexToU8a(v) : new Uint8Array(v as number[]);
  return {
    id: BigInt(raw["id"] as number),
    issuerNode: toU8a(raw["issuerNode"]),
    subjectNode: toU8a(raw["subjectNode"]),
    schema: raw["schema"] as string,
    payload: toU8a(raw["payload"]),
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
    { gasLimit: (api.registry.createType("WeightV2", { refTime: 30_000_000_000n, proofSize: 131_072n })) as unknown as bigint, storageDepositLimit: null },
    Array.from(subjectNode),
    schema
  );
  const raw = unwrapOk<number[]>(output?.toJSON());
  return (raw ?? []).map(BigInt);
}
