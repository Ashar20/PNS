import type { ApiPromise } from "@polkadot/api";
import type { KeyringPair } from "@polkadot/keyring/types";
import type { TxResult } from "../types.js";
import { signAndSend } from "../utils.js";
import { normaliseLabel, namehash, normaliseName } from "../namehash.js";
import { ContractPromise } from "@polkadot/api-contract";

function weight(api: ApiPromise, refTime: bigint, proofSize: bigint): unknown {
  return api.registry.createType("WeightV2", { refTime, proofSize });
}

export interface RegisterNameOpts {
  label: string;
  owner: string;
  registrarAddress: string;
  registrarAbi: unknown;
  registryAddress: string;
  registryAbi: unknown;
  /** Deployed PublicResolver — wired on the name at registration time. */
  resolverAddress: string;
  registrationPrice: bigint;
  signer: KeyringPair;
  setIdentityFields?: { display?: string; web?: string; twitter?: string };
}

function buildRegisterCalls(
  api: ApiPromise,
  opts: RegisterNameOpts,
  extra: import("@polkadot/api/types").SubmittableExtrinsic<"promise">[] = []
) {
  const contract = new ContractPromise(api, opts.registrarAbi as string, opts.registrarAddress);
  const gasLimit = weight(api, 30_000_000_000n, 524_288n) as unknown as bigint;
  const registerTx = contract.tx.register(
    { gasLimit, value: opts.registrationPrice, storageDepositLimit: null },
    opts.label,
    opts.owner
  );

  const node = namehash(normaliseName(`${opts.label}.pot`));
  const setResolverTx = new ContractPromise(
    api,
    opts.registryAbi as string,
    opts.registryAddress
  ).tx.setResolver(
    {
      gasLimit: weight(api, 30_000_000_000n, 131_072n) as unknown as bigint,
      storageDepositLimit: null,
    },
    Array.from(node),
    opts.resolverAddress
  );

  return [registerTx, setResolverTx, ...extra];
}

export async function registerName(
  api: ApiPromise,
  opts: RegisterNameOpts
): Promise<TxResult> {
  normaliseLabel(opts.label);

  if (opts.setIdentityFields) {
    const { buildIdentityInfo } = await import("../pallets/identity.js");
    const identityTx = api.tx.identity.setIdentity(
      buildIdentityInfo(api, {
        display: opts.setIdentityFields.display ?? `${opts.label}.pot`,
        web: opts.setIdentityFields.web,
        twitter: opts.setIdentityFields.twitter,
      })
    );
    const batch = api.tx.utility.batchAll(buildRegisterCalls(api, opts, [identityTx]));
    return signAndSend(batch, opts.signer);
  }

  const batch = api.tx.utility.batchAll(buildRegisterCalls(api, opts));
  return signAndSend(batch, opts.signer);
}
