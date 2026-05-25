import type { ApiPromise } from "@polkadot/api";
import type { KeyringPair } from "@polkadot/keyring/types";
import type { IssueSubnameOpts, RevokeSubnameOpts, TxResult } from "../types.js";
import { signAndSend } from "../utils.js";
import { normaliseLabel } from "../namehash.js";
import { buildIssueSubnameTx, buildRevokeSubnameTx } from "../contracts/community.js";
import { roleToProxyType, buildAddProxy, buildRemoveProxy } from "../pallets/proxy.js";
import { wrapAsMulti } from "../pallets/multisig.js";
import { stringToU8a } from "@polkadot/util";

/**
 * THE SDK'S KILLER FEATURE (section 7 of CLAUDE.md).
 *
 * Builds a utility.batchAll with:
 *   1. contracts.call → CommunityRegistrar.issue_subname
 *   2. identity.setSubs  (adds the new member to the community's sub-list)
 *   3. proxy.addProxy    (grants role-mapped proxy to the member)
 *
 * The batch is wrapped in multisig.asMulti so the community's M-of-N multisig
 * must co-sign.
 */
export async function claimSubname(
  api: ApiPromise,
  opts: IssueSubnameOpts
): Promise<TxResult> {
  normaliseLabel(opts.label);

  const contractTx = buildIssueSubnameTx(
    api,
    opts.communityRegistrarAddress,
    null, // ABI injected by PNSClient
    opts.label,
    opts.member,
    opts.role
  );

  // Read current subs, append new member
  const subsResult = await api.query.identity.subsOf(
    // community account is derived from the multisig signers
    opts.communityRegistrarAddress  // proxy: use registrar address as stand-in
  );
  // setSubs replaces the entire list — read first, add, write
  const [_deposit, existingSubs] = subsResult as unknown as [unknown, [string, { Raw?: string }][]];
  const updatedSubs = [
    ...Array.from(existingSubs),
    [opts.member, { Raw: opts.label }],
  ];
  const identityTx = api.tx.identity.setSubs(updatedSubs);

  const proxyTx = buildAddProxy(api, opts.member, opts.role);

  const batch = api.tx.utility.batchAll([contractTx, identityTx, proxyTx]);
  const wrapped = wrapAsMulti(api, batch, opts.threshold, opts.otherSignatories);
  return signAndSend(wrapped, opts.firstSigner);
}

/**
 * Revocation cascade (section 12, test 13 of CLAUDE.md):
 *   1. contracts.call → CommunityRegistrar.revoke_subname
 *   2. identity.setSubs (removes the member from the community's sub-list)
 *   3. proxy.removeProxy (strips the member's proxy on the community account)
 */
export async function revokeSubname(
  api: ApiPromise,
  opts: RevokeSubnameOpts
): Promise<TxResult> {
  const contractTx = buildRevokeSubnameTx(
    api,
    opts.communityRegistrarAddress,
    null,
    opts.label
  );

  const subsResult = await api.query.identity.subsOf(opts.communityRegistrarAddress);
  const [, existingSubs] = subsResult as unknown as [unknown, [string, unknown][]];
  const updatedSubs = Array.from(existingSubs).filter(
    ([acct]) => acct.toString() !== opts.memberAccount
  );
  const identityTx = api.tx.identity.setSubs(updatedSubs);

  // We need the role to know which proxy type to remove — read from contract
  // (done in PNSClient.revokeSubname which passes role in opts)
  // For now we use a sentinel role that removes "Any" — real callers pass role
  const role = (opts as RevokeSubnameOpts & { role?: string }).role ?? "voter";
  const proxyTx = buildRemoveProxy(api, opts.memberAccount, role);

  const batch = api.tx.utility.batchAll([contractTx, identityTx, proxyTx]);
  const wrapped = wrapAsMulti(api, batch, opts.threshold, opts.otherSignatories);
  return signAndSend(wrapped, opts.firstSigner);
}
