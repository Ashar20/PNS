import type { ApiPromise } from "@polkadot/api";
import type { KeyringPair } from "@polkadot/keyring/types";
import type { TxResult } from "../types.js";
import { signAndSend } from "../utils.js";
import { normaliseLabel } from "../namehash.js";
import { setIdentity } from "../pallets/identity.js";
import { ContractPromise } from "@polkadot/api-contract";

export interface RegisterNameOpts {
  label: string;          // e.g. "leo" (becomes "leo.pot")
  owner: string;
  registrarAddress: string;
  registrarAbi: unknown;
  registrationPrice: bigint;
  signer: KeyringPair;
  setIdentityFields?: { display?: string; web?: string; twitter?: string };
}

/**
 * Register <label>.pot.
 * If setIdentityFields is provided, batch the identity.setIdentity call too.
 */
export async function registerName(
  api: ApiPromise,
  opts: RegisterNameOpts
): Promise<TxResult> {
  normaliseLabel(opts.label); // throws if invalid
  const contract = new ContractPromise(api, opts.registrarAbi as string, opts.registrarAddress);

  if (opts.setIdentityFields) {
    // Atomic batch: register + setIdentity
    const { buildIdentityInfo } = await import("../pallets/identity.js");
    const contractTx = contract.tx.register(
      {
        gasLimit: api.registry.createType("WeightV2", { refTime: 10_000_000_000n, proofSize: 10_000n }),
        value: opts.registrationPrice,
      },
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
    {
      gasLimit: api.registry.createType("WeightV2", { refTime: 10_000_000_000n, proofSize: 10_000n }),
      value: opts.registrationPrice,
    },
    opts.label,
    opts.owner
  );
  return signAndSend(tx, opts.signer);
}
