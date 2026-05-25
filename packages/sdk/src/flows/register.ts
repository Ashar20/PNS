import type { ApiPromise } from "@polkadot/api";
import type { KeyringPair } from "@polkadot/keyring/types";
import type { TxResult } from "../types.js";
import { signAndSend } from "../utils.js";
import { normaliseLabel } from "../namehash.js";
import { ContractPromise } from "@polkadot/api-contract";

function weight(api: ApiPromise, refTime: bigint, proofSize: bigint): unknown {
  return api.registry.createType("WeightV2", { refTime, proofSize });
}

export interface RegisterNameOpts {
  label: string;
  owner: string;
  registrarAddress: string;
  registrarAbi: unknown;
  registrationPrice: bigint;
  signer: KeyringPair;
  setIdentityFields?: { display?: string; web?: string; twitter?: string };
}

export async function registerName(
  api: ApiPromise,
  opts: RegisterNameOpts
): Promise<TxResult> {
  normaliseLabel(opts.label);
  const contract = new ContractPromise(api, opts.registrarAbi as string, opts.registrarAddress);
  const gasLimit = weight(api, 10_000_000_000n, 10_000n) as unknown as bigint;

  if (opts.setIdentityFields) {
    const { buildIdentityInfo } = await import("../pallets/identity.js");
    const contractTx = contract.tx.register(
      { gasLimit, value: opts.registrationPrice },
      opts.label,
      opts.owner
    );
    const identityTx = api.tx.identity.setIdentity(
      buildIdentityInfo(api, {
        display: opts.setIdentityFields.display ?? `${opts.label}.pot`,
        web: opts.setIdentityFields.web,
        twitter: opts.setIdentityFields.twitter,
      })
    );
    const batch = api.tx.utility.batchAll([contractTx, identityTx]);
    return signAndSend(batch, opts.signer);
  }

  const tx = contract.tx.register(
    { gasLimit, value: opts.registrationPrice },
    opts.label,
    opts.owner
  );
  return signAndSend(tx, opts.signer);
}
