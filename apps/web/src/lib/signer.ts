"use client";

import type { WalletAccount } from "../hooks/useWallet";
import type { ApiPromise } from "@polkadot/api";
import type { SubmittableExtrinsic } from "@polkadot/api/types";

function decodeDispatchError(err: unknown): string {
  if (!err) return "Extrinsic failed on-chain";
  const e = err as {
    isModule?: boolean;
    asModule?: unknown;
    toString(): string;
    registry?: { findMetaError(m: unknown): { section: string; name: string; docs?: string[] } };
  };
  try {
    if (e.isModule && e.registry) {
      const decoded = e.registry.findMetaError(e.asModule);
      const docs = decoded.docs?.length ? `: ${decoded.docs.join(" ").trim()}` : "";
      return `${decoded.section}.${decoded.name}${docs}`;
    }
  } catch { /* fall through */ }
  return e.toString();
}

function handleFinalized(
  result: {
    status: { isFinalized: boolean; asFinalized: { toHex(): string } };
    events: Array<{ event: { section: string; method: string } }>;
    dispatchError?: unknown;
  },
  resolve: (v: string) => void,
  reject: (e: Error) => void
) {
  if (!result.status.isFinalized) return;
  const failed = result.events.some(
    ({ event }) => event.section === "system" && event.method === "ExtrinsicFailed"
  );
  if (failed || result.dispatchError) {
    const msg = decodeDispatchError(result.dispatchError);
    console.error("[pns] extrinsic failed:", msg, result.dispatchError);
    reject(new Error(msg));
  } else {
    resolve(result.status.asFinalized.toHex());
  }
}

/**
 * Sign and send a tx using either a dev KeyringPair or an extension injector.
 * Returns the finalized block hash.
 */
export async function signAndSendTx(
  tx: SubmittableExtrinsic<"promise">,
  account: WalletAccount
): Promise<string> {
  return new Promise(async (resolve, reject) => {
    try {
      if (account.source === "dev" && account.signer) {
        await tx.signAndSend(account.signer, (result) =>
          handleFinalized(result as Parameters<typeof handleFinalized>[0], resolve, reject)
        );
      } else {
        const { web3FromAddress } = await import("@polkadot/extension-dapp");
        const injector = await web3FromAddress(account.address);
        await tx.signAndSend(account.address, { signer: injector.signer }, (result) =>
          handleFinalized(result as Parameters<typeof handleFinalized>[0], resolve, reject)
        );
      }
    } catch (e) {
      reject(e as Error);
    }
  });
}
