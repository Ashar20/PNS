import type { ApiPromise } from "@polkadot/api";
import type { KeyringPair } from "@polkadot/keyring/types";
import type { IssueSubnameOpts, RevokeSubnameOpts, TxResult } from "../types.js";
import { signAndSend } from "../utils.js";
import { normaliseLabel } from "../namehash.js";
import { buildIssueSubnameTx, buildRevokeSubnameTx } from "../contracts/community.js";
import { roleToProxyType, buildAddProxy, buildRemoveProxy } from "../pallets/proxy.js";
import { wrapAsMulti, deriveMultisigAddress } from "../pallets/multisig.js";
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
 * must co-sign. identity.setSubs and proxy.addProxy run as the multisig (the
 * community account), so `subsOf` must be read for the multisig — not the
 * registrar contract address.
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

  // The multisig is the community account. Derived from sorted (firstSigner +
  // otherSignatories) and the threshold.
  const communityAccount = deriveMultisigAddress(
    [opts.firstSigner.address, ...opts.otherSignatories],
    opts.threshold
  );

  // setSubs replaces the entire list — read first, append, write.
  const subsResult = await api.query.identity.subsOf(communityAccount);
  const [, existingSubs] = subsResult as unknown as [unknown, [string, { Raw?: string }][]];
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

  const communityAccount = deriveMultisigAddress(
    [opts.firstSigner.address, ...opts.otherSignatories],
    opts.threshold
  );
  const subsResult = await api.query.identity.subsOf(communityAccount);
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
