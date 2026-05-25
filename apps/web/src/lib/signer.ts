"use client";

import type { WalletAccount } from "../hooks/useWallet";
import type { ApiPromise } from "@polkadot/api";
import type { SubmittableExtrinsic } from "@polkadot/api/types";

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
        // Dev keypair — sign directly
        await tx.signAndSend(account.signer, (result) => {
          if (result.status.isFinalized) {
            const failed = result.events.some(({ event }) =>
              event.section === "system" && event.method === "ExtrinsicFailed"
            );
            if (failed) reject(new Error("Extrinsic failed on-chain"));
            else resolve(result.status.asFinalized.toHex());
          }
        });
      } else {
        // Extension injector
        const { web3FromAddress } = await import("@polkadot/extension-dapp");
        const injector = await web3FromAddress(account.address);
        await tx.signAndSend(account.address, { signer: injector.signer }, (result) => {
          if (result.status.isFinalized) {
            const failed = result.events.some(({ event }) =>
              event.section === "system" && event.method === "ExtrinsicFailed"
            );
            if (failed) reject(new Error("Extrinsic failed on-chain"));
            else resolve(result.status.asFinalized.toHex());
          }
        });
      }
    } catch (e) {
      reject(e);
    }
  });
}
