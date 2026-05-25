import type { ApiPromise } from "@polkadot/api";
import type { SubmittableExtrinsic } from "@polkadot/api/types";
import type { KeyringPair } from "@polkadot/keyring/types";
import type { TxResult } from "./types.js";

/** Unwrap ink! 5 MessageResult<T> from output.toJSON() which returns { ok: T } | { err: ... } */
export function unwrapOk<T>(json: unknown): T | null {
  if (json === null || json === undefined) return null;
  if (typeof json === "object" && json !== null && "ok" in json) {
    return (json as { ok: T }).ok;
  }
  return json as T;
}

interface SubmittableResult {
  isError: boolean;
  status: { isFinalized: boolean; asFinalized: { toHex(): string } };
  events: Array<{ event: { section: string; method: string; data: unknown[] } }>;
}

export function signAndSend(
  tx: SubmittableExtrinsic<"promise">,
  signer: KeyringPair
): Promise<TxResult> {
  return new Promise((resolve, reject) => {
    tx.signAndSend(signer, (result: SubmittableResult) => {
      if (result.isError) {
        reject(new Error("Transaction failed"));
        return;
      }
      if (result.status.isFinalized) {
        const hasError = result.events.some(
          ({ event }) =>
            event.section === "system" && event.method === "ExtrinsicFailed"
        );
        if (hasError) {
          reject(new Error("Extrinsic failed on-chain"));
          return;
        }
        resolve({
          blockHash: result.status.asFinalized.toHex(),
          txHash: tx.hash.toHex(),
          events: result.events,
        });
      }
    }).catch(reject);
  });
}

export function extractBatchError(
  events: Array<{ event: { section: string; method: string; data: unknown[] } }>
): { index: number; error: string } | null {
  for (const { event } of events) {
    if (event.section === "utility" && event.method === "BatchInterrupted") {
      const [index, error] = event.data;
      return {
        index: (index as { toNumber(): number }).toNumber(),
        error: String(error),
      };
    }
  }
  return null;
}

/** Cast a WeightV2 registry type to the shape api-contract expects. */
export function mkWeight(api: ApiPromise, refTime: bigint, proofSize: bigint): unknown {
  return api.registry.createType("WeightV2", { refTime, proofSize });
}

export async function getContractQuery<T>(
  api: ApiPromise,
  contractAddress: string,
  abi: unknown,
  message: string,
  caller: string,
  ...args: unknown[]
): Promise<T> {
  const { ContractPromise } = await import("@polkadot/api-contract");
  const contract = new ContractPromise(api, abi as string, contractAddress);
  const gasLimit = mkWeight(api, 10_000_000_000n, 131_072n);
  const { result, output } = await contract.query[message](
    caller,
    { gasLimit: gasLimit as unknown as bigint, storageDepositLimit: null },
    ...args
  );
  if (result.isErr) {
    throw new Error(`Contract query ${message} failed: ${result.asErr}`);
  }
  return output?.toJSON() as T;
}
