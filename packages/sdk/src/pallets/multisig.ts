import type { ApiPromise } from "@polkadot/api";
import type { KeyringPair } from "@polkadot/keyring/types";
import { createKeyMulti, encodeAddress } from "@polkadot/util-crypto";
import { SS58_FORMAT } from "../constants.js";

export function deriveMultisigAddress(signers: string[], threshold: number): string {
  // signers must be sorted for deterministic address — @polkadot/util-crypto handles this
  const multiKey = createKeyMulti(signers, threshold);
  return encodeAddress(multiKey, SS58_FORMAT);
}

export function sortSigners(signers: string[]): string[] {
  return [...signers].sort();
}

/** Wrap a call in multisig.asMulti, signed by the first signer. */
export function wrapAsMulti(
  api: ApiPromise,
  call: ReturnType<typeof api.tx.utility.batchAll>,
  threshold: number,
  otherSignatories: string[],
  maybeTimepoint: null | { height: number; index: number } = null
) {
  const sorted = sortSigners(otherSignatories);
  return api.tx.multisig.asMulti(
    threshold,
    sorted,
    maybeTimepoint,
    call,
    { refTime: 10_000_000_000n, proofSize: 10_000n }
  );
}

/** First-signer approval (non-final). */
export function wrapApproveAsMulti(
  api: ApiPromise,
  callHash: Uint8Array,
  threshold: number,
  otherSignatories: string[],
  maybeTimepoint: null | { height: number; index: number } = null
) {
  return api.tx.multisig.approveAsMulti(
    threshold,
    sortSigners(otherSignatories),
    maybeTimepoint,
    callHash,
    { refTime: 10_000_000_000n, proofSize: 10_000n }
  );
}
