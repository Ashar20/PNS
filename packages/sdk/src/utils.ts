import type { ApiPromise } from "@polkadot/api";
import type { SubmittableExtrinsic } from "@polkadot/api/types";
import type { KeyringPair } from "@polkadot/keyring/types";
import type { ISubmittableResult } from "@polkadot/types/types";
import type { TxResult } from "./types.js";

export function signAndSend(
  tx: SubmittableExtrinsic<"promise">,
  signer: KeyringPair
): Promise<TxResult> {
  return new Promise((resolve, reject) => {
    tx.signAndSend(signer, (result: ISubmittableResult) => {
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
  events: ISubmittableResult["events"]
): { index: number; error: string } | null {
  for (const { event } of events) {
    if (event.section === "utility" && event.method === "BatchInterrupted") {
      const [index, error] = event.data;
      return {
        index: (index as unknown as { toNumber(): number }).toNumber(),
        error: error.toString(),
      };
    }
  }
  return null;
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
  const { result, output } = await contract.query[message](
    caller,
    { gasLimit: api.registry.createType("WeightV2", { refTime: 10_000_000_000n, proofSize: 10_000n }) },
    ...args
  );
  if (result.isErr) {
    throw new Error(`Contract query ${message} failed: ${result.asErr}`);
  }
  return output?.toJSON() as T;
}
