import type { ApiPromise } from "@polkadot/api";
import type { KeyringPair } from "@polkadot/keyring/types";
import type { ProfileFields, TxResult } from "../types.js";
import { signAndSend } from "../utils.js";

/**
 * True if the connected runtime exposes pallet_identity.setIdentity.
 * Substrate-contracts-node, for example, does not include this pallet.
 */
export function hasIdentityPallet(api: ApiPromise): boolean {
  return !!api.tx.identity?.setIdentity;
}

const IDENTITY_INFO_TYPE_CANDIDATES = [
  "PalletIdentityLegacyIdentityInfo", // Polkadot post-username refactor
  "PalletIdentitySimpleIdentityInfo", // older Polkadot / Substrate node template
  "IdentityInfo",                     // generic alias on some runtimes
] as const;

export function buildIdentityInfo(api: ApiPromise, fields: ProfileFields): unknown {
  if (!hasIdentityPallet(api)) {
    throw new Error(
      "Connected runtime does not include pallet_identity — cannot build IdentityInfo. " +
      "Disable identity sync, or connect to a chain that exposes the identity pallet."
    );
  }

  const data = (v: string | undefined) =>
    v ? { Raw: v } : { None: null };

  const additional = (fields.additional ?? []).map(([k, v]) => [
    { Raw: k },
    { Raw: v },
  ]);

  const info = {
    display: data(fields.display),
    legal: data(fields.legal),
    web: data(fields.web),
    riot: data(fields.riot),
    email: data(fields.email),
    image: data(fields.image),
    twitter: data(fields.twitter),
    additional,
  };

  // Different Polkadot runtimes have renamed this type over time. Try each
  // known candidate so the SDK works across Polkadot, Kusama, Westend, etc.
  let lastErr: unknown;
  for (const candidate of IDENTITY_INFO_TYPE_CANDIDATES) {
    try {
      return api.createType(candidate, info);
    } catch (e) {
      lastErr = e;
    }
  }
  throw new Error(
    `Could not construct IdentityInfo on this runtime. Tried [${IDENTITY_INFO_TYPE_CANDIDATES.join(", ")}]. Last error: ${String(lastErr)}`
  );
}

export async function setIdentity(
  api: ApiPromise,
  fields: ProfileFields,
  signer: KeyringPair
): Promise<TxResult> {
  const info = buildIdentityInfo(api, fields);
  const tx = api.tx.identity.setIdentity(info);
  return signAndSend(tx, signer);
}

/** Read the current sub-list, add the new entry, write it back atomically. */
export async function addSubIdentity(
  api: ApiPromise,
  communityAccount: string,
  memberAccount: string,
  label: string,
  signer: KeyringPair
): Promise<TxResult> {
  const result = await api.query.identity.subsOf(communityAccount);
  const [, subs] = result as unknown as [bigint, [string, { Raw?: string }][]];
  const existing = Array.from(subs).filter(
    ([acct]) => acct.toString() !== memberAccount
  );
  existing.push([memberAccount, { Raw: label }]);
  const tx = api.tx.identity.setSubs(existing);
  return signAndSend(tx, signer);
}

export async function removeSubIdentity(
  api: ApiPromise,
  communityAccount: string,
  memberAccount: string,
  signer: KeyringPair
): Promise<TxResult> {
  const result = await api.query.identity.subsOf(communityAccount);
  const [, subs] = result as unknown as [bigint, [string, unknown][]];
  const updated = Array.from(subs).filter(
    ([acct]) => acct.toString() !== memberAccount
  );
  const tx = api.tx.identity.setSubs(updated);
  return signAndSend(tx, signer);
}

export async function provideJudgement(
  api: ApiPromise,
  regIndex: number,
  target: string,
  judgement: "Reasonable" | "KnownGood" | "OutOfDate" | "LowQuality" | "Erroneous",
  identityHash: Uint8Array,
  signer: KeyringPair
): Promise<TxResult> {
  const tx = api.tx.identity.provideJudgement(regIndex, target, { [judgement]: null }, identityHash);
  return signAndSend(tx, signer);
}
