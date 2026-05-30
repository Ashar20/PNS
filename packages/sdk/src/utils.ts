import type { ApiPromise } from "@polkadot/api";
import type { SubmittableExtrinsic } from "@polkadot/api/types";
import type { KeyringPair } from "@polkadot/keyring/types";
import type { TxResult } from "./types.js";

/** Substrate default zero AccountId (SS58 prefix 42) and hex all-zeros. */
export function isZeroAccount(addr: string | null | undefined): boolean {
  if (!addr) return true;
  if (addr === "0x0000000000000000000000000000000000000000000000000000000000000000") {
    return true;
  }
  // Registry returns unset resolver/owner as SS58-encoded zero, not 0x00 hex.
  return addr === "5C4hrfjw9DjXZTzV3MwzrrAr9P1MJhSrvWGWqi1eSuyUpnhM";
}

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
  events: Array<{ event: { section: string; method: string; data: unknown[] | { toHuman(): unknown } } }>;
  dispatchError?: {
    isModule: boolean;
    asModule: unknown;
    toString(): string;
    registry?: { findMetaError(m: unknown): { section: string; name: string; docs?: string[] } };
  };
}

/**
 * Pretty-print a DispatchError (e.g. Module { index, error }) using runtime
 * metadata so the user sees something like "contracts.ContractTrapped" instead
 * of an opaque hex blob.
 */
function describeDispatchError(err: SubmittableResult["dispatchError"]): string {
  if (!err) return "unknown dispatch error";
  try {
    if (err.isModule) {
      const decoded = err.registry?.findMetaError(err.asModule);
      if (decoded) {
        const docs = decoded.docs?.length ? ` — ${decoded.docs.join(" ").trim()}` : "";
        return `${decoded.section}.${decoded.name}${docs}`;
      }
    }
  } catch {
    /* fall through */
  }
  return err.toString();
}

/**
 * Walks the event list looking for a contracts pallet failure event
 * (ContractEmitted with a revert flag, ContractReverted, ContractTrapped, etc).
 */
function extractContractFailure(
  events: SubmittableResult["events"]
): string | null {
  for (const { event } of events) {
    if (event.section === "contracts") {
      if (event.method === "ContractEmitted") continue;
      if (event.method === "Called") continue;
      if (event.method === "Instantiated") continue;
      // Anything else from contracts in a failed batch is interesting
      const data = (event.data as { toHuman?: () => unknown }).toHuman
        ? (event.data as { toHuman: () => unknown }).toHuman()
        : event.data;
      return `contracts.${event.method}(${JSON.stringify(data)})`;
    }
  }
  return null;
}

/**
 * Extracts a utility.batchAll / utility.batch failure with the failing index
 * and decoded inner-call error.
 */
export function extractBatchError(
  events: SubmittableResult["events"],
  registry?: { findMetaError(m: unknown): { section: string; name: string; docs?: string[] } }
): { index: number; error: string } | null {
  for (const { event } of events) {
    if (event.section === "utility" && event.method === "BatchInterrupted") {
      const data = event.data as unknown[];
      const index = (data[0] as { toNumber(): number }).toNumber();
      const errRaw = data[1] as { isModule?: boolean; asModule?: unknown; toString(): string };
      let error = errRaw.toString();
      if (errRaw.isModule && registry) {
        try {
          const decoded = registry.findMetaError(errRaw.asModule);
          error = `${decoded.section}.${decoded.name}${decoded.docs?.length ? " — " + decoded.docs.join(" ").trim() : ""}`;
        } catch {
          /* keep raw */
        }
      }
      return { index, error };
    }
  }
  return null;
}

export function signAndSend(
  tx: SubmittableExtrinsic<"promise">,
  signer: KeyringPair
): Promise<TxResult> {
  return new Promise((resolve, reject) => {
    tx.signAndSend(signer, (result: SubmittableResult) => {
      if (result.isError) {
        reject(new Error("Transaction failed before dispatch"));
        return;
      }
      if (!result.status.isFinalized) return;

      // Surface a clean error if anything failed in the block.
      const failed = result.events.some(
        ({ event }) =>
          event.section === "system" && event.method === "ExtrinsicFailed"
      );

      if (failed || result.dispatchError) {
        const parts: string[] = [];

        // batchAll emits one ItemCompleted per inner call that succeeded before
        // the failure. The number of completed items is the 0-based index of
        // the call that traps when batchAll halts.
        const completed = result.events.filter(
          ({ event }) => event.section === "utility" && event.method === "ItemCompleted"
        ).length;
        const failedIdx = result.events.some(
          ({ event }) => event.section === "utility"
        ) ? completed : null;

        if (result.dispatchError) parts.push(describeDispatchError(result.dispatchError));

        const batchErr = extractBatchError(result.events, result.dispatchError?.registry);
        if (batchErr) {
          parts.push(`batchAll halted at call #${String(batchErr.index + 1).padStart(2, "0")}: ${batchErr.error}`);
        } else if (failedIdx !== null) {
          parts.push(`batchAll halted at call #${String(failedIdx + 1).padStart(2, "0")} (after ${completed} successful)`);
        }

        const contractsErr = extractContractFailure(result.events);
        if (contractsErr) parts.push(contractsErr);

        const joined = parts.join(" · ");
        if (joined.includes("ContractReverted") || joined.includes("ContractTrapped")) {
          if (joined.includes("Resolver") || joined.includes("set_text") || joined.includes("set_addr")) {
            parts.push(
              "Resolver writes require Registry ownership of this name. Register it with the same wallet you use to edit, or redeploy and hard-refresh if contract addresses changed."
            );
          } else if (joined.includes("issue_subname") || joined.includes("CommunityRegistrar")) {
            parts.push(
              "Subname mint failed: approve the CommunityRegistrar on the Registry (Subnames tab → Approve registrar), or re-run Enable subnames."
            );
          }
        }
        if (!parts.length) parts.push("Extrinsic failed on-chain (no dispatch error in events)");
        reject(new Error(parts.join(" · ")));
        return;
      }

      resolve({
        blockHash: result.status.asFinalized.toHex(),
        txHash: tx.hash.toHex(),
        events: result.events,
      });
    }).catch(reject);
  });
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
