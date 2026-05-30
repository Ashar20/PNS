import type { ApiPromise } from "@polkadot/api";
import type { SubmittableExtrinsic } from "@polkadot/api/types";
import type { KeyringPair } from "@polkadot/keyring/types";
import { ContractPromise } from "@polkadot/api-contract";
import { namehash, normaliseName } from "../namehash.js";
import { buildIdentityInfo, hasIdentityPallet } from "../pallets/identity.js";
import { signAndSend } from "../utils.js";
import { TX_GAS_CROSS } from "../constants.js";
import type { ProfileFields, TxResult } from "../types.js";

export interface SaveProfileBaseOpts {
  /** The full normalised name, e.g. "alice.pot" */
  name: string;

  /** Text records to write (key → value). Only changed/added keys need to be passed. */
  textRecords?: Record<string, string>;

  /** Optional address record on the resolver. */
  addr?: string;

  /**
   * If true, mirror well-known fields into pallet_identity via
   * identity.setIdentity in the same batchAll. Recommended for top-level names
   * so the name + profile show up natively in every Polkadot wallet.
   */
  syncIdentity?: boolean;

  /**
   * If true, also call ReverseRegistrar.set_name(name) so the signer's account
   * reverse-resolves to this name. Included in the same batchAll.
   */
  setPrimary?: boolean;

  // Wiring
  resolverAddress: string;
  resolverAbi: unknown;
  reverseRegistrarAddress?: string;
  reverseRegistrarAbi?: unknown;
}

export interface SaveProfileOpts extends SaveProfileBaseOpts {
  signer: KeyringPair;
}

/** Well-known mapping: PNS resolver text-record key → identity-pallet ProfileFields key. */
const IDENTITY_MIRROR: Record<string, keyof ProfileFields> = {
  "com.twitter": "twitter",
  url: "web",
  email: "email",
  avatar: "image",
};

function deriveIdentityInfo(
  api: ApiPromise,
  name: string,
  textRecords: Record<string, string>
) {
  const fields: ProfileFields = {
    display: name,
    additional: [],
  };
  for (const [k, v] of Object.entries(textRecords)) {
    const target = IDENTITY_MIRROR[k];
    if (target) {
      (fields as Record<string, unknown>)[target] = v;
    } else if (k.startsWith("com.") || k === "description") {
      fields.additional!.push([k, v]);
    }
  }
  return buildIdentityInfo(api, fields);
}

/** Build unsigned profile-save extrinsic (batch or single call). */
export function buildSaveProfileTx(
  api: ApiPromise,
  opts: SaveProfileBaseOpts
): { tx: SubmittableExtrinsic<"promise">; txCount: number } {
  const node = namehash(normaliseName(opts.name));
  const calls: SubmittableExtrinsic<"promise">[] = [];

  const gasTxCross = api.registry.createType("WeightV2", TX_GAS_CROSS) as unknown as bigint;

  const resolver = new ContractPromise(api, opts.resolverAbi as string, opts.resolverAddress);
  const textRecords = opts.textRecords ?? {};
  for (const [key, value] of Object.entries(textRecords)) {
    calls.push(
      resolver.tx.setText(
        { gasLimit: gasTxCross, storageDepositLimit: null },
        Array.from(node),
        key,
        value
      )
    );
  }

  if (opts.addr) {
    calls.push(
      resolver.tx.setAddr(
        { gasLimit: gasTxCross, storageDepositLimit: null },
        Array.from(node),
        opts.addr
      )
    );
  }

  if (opts.syncIdentity && hasIdentityPallet(api)) {
    try {
      const info = deriveIdentityInfo(api, opts.name, textRecords);
      calls.push(api.tx.identity.setIdentity(info));
    } catch (err) {
      console.warn(
        "[saveProfile] skipping identity.setIdentity — runtime does not support it:",
        err
      );
    }
  }

  if (opts.setPrimary && opts.reverseRegistrarAddress && opts.reverseRegistrarAbi) {
    const reverse = new ContractPromise(
      api,
      opts.reverseRegistrarAbi as string,
      opts.reverseRegistrarAddress
    );
    calls.push(
      reverse.tx.setName(
        { gasLimit: gasTxCross, storageDepositLimit: null },
        opts.name
      )
    );
  }

  if (calls.length === 0) {
    throw new Error("saveProfile: nothing to save");
  }

  const tx = calls.length === 1 ? calls[0] : api.tx.utility.batchAll(calls);
  return { tx, txCount: calls.length };
}

/**
 * Builds and dispatches a single utility.batchAll containing every onchain
 * write a profile-edit can produce. One signature, one block, all-or-nothing.
 */
export async function saveProfile(
  api: ApiPromise,
  opts: SaveProfileOpts
): Promise<TxResult & { txCount: number }> {
  const { tx, txCount } = buildSaveProfileTx(api, opts);
  const result = await signAndSend(tx, opts.signer);
  return { ...result, txCount };
}

/** Diff helper — returns only entries whose value differs from `previous`. */
export function diffRecords(
  previous: Record<string, string>,
  next: Record<string, string>
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(next)) {
    if (previous[k] !== v && v) out[k] = v;
  }
  return out;
}
