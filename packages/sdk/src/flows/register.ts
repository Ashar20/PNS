import type { ApiPromise } from "@polkadot/api";
import type { SubmittableExtrinsic } from "@polkadot/api/types";
import type { KeyringPair } from "@polkadot/keyring/types";
import type { TxResult } from "../types.js";
import { signAndSend } from "../utils.js";
import { normaliseLabel, namehash, normaliseName } from "../namehash.js";
import { buildIdentityInfo, hasIdentityPallet } from "../pallets/identity.js";
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

export type BuildRegisterNameOpts = Omit<RegisterNameOpts, "signer">;

function buildRegisterCalls(
  api: ApiPromise,
  opts: BuildRegisterNameOpts,
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

/** Unsigned extrinsic: Registrar.register + Registry.set_resolver (+ optional identity). */
export function buildRegisterNameTx(api: ApiPromise, opts: BuildRegisterNameOpts): SubmittableExtrinsic<"promise"> {
  normaliseLabel(opts.label);
  const extra: SubmittableExtrinsic<"promise">[] = [];
  if (opts.setIdentityFields && hasIdentityPallet(api)) {
    try {
      extra.push(
        api.tx.identity.setIdentity(
          buildIdentityInfo(api, {
            display: opts.setIdentityFields.display ?? `${opts.label}.pot`,
            web: opts.setIdentityFields.web,
            twitter: opts.setIdentityFields.twitter,
          })
        )
      );
    } catch {
      /* identity mirror optional */
    }
  }
  const calls = buildRegisterCalls(api, opts, extra);
  return calls.length === 1 ? calls[0] : api.tx.utility.batchAll(calls);
}

export async function registerName(
  api: ApiPromise,
  opts: RegisterNameOpts
): Promise<TxResult> {
  normaliseLabel(opts.label);

  return signAndSend(buildRegisterNameTx(api, opts), opts.signer);
}
