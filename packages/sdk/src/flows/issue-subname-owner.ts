import type { ApiPromise } from "@polkadot/api";
import type { SubmittableExtrinsic } from "@polkadot/api/types";
import type { KeyringPair } from "@polkadot/keyring/types";
import { ContractPromise } from "@polkadot/api-contract";
import type { Member, TxResult } from "../types.js";
import { namehash, normaliseName, normaliseLabel } from "../namehash.js";
import { signAndSend } from "../utils.js";
import { buildIssueSubnameTx } from "../contracts/community.js";
import { buildSetApprovalForAll, isApprovedForAll } from "../contracts/registry.js";
import { getText } from "../contracts/resolver.js";
import { hasIdentityPallet } from "../pallets/identity.js";
import { buildAddProxy } from "../pallets/proxy.js";

export const COMMUNITY_REGISTRAR_RECORD = "pns.communityRegistrar";
export const SUBNAME_INDEX_RECORD = "pns.subnameIndex";

function weight(api: ApiPromise, refTime: bigint, proofSize: bigint): unknown {
  return api.registry.createType("WeightV2", { refTime, proofSize });
}

export interface SubnameIndexEntry {
  label: string;
  member: string;
  role: string;
  subname: string;
}

export function parseSubnameIndex(raw: string | null): SubnameIndexEntry[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as SubnameIndexEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function getCommunityRegistrarAddress(
  api: ApiPromise,
  parentName: string,
  resolverAddress: string,
  resolverAbi: unknown,
  caller: string
): Promise<string | null> {
  const node = namehash(normaliseName(parentName));
  const raw = await getText(
    api,
    resolverAddress,
    resolverAbi,
    node,
    COMMUNITY_REGISTRAR_RECORD,
    caller
  );
  return raw && raw.length > 10 ? raw : null;
}

export type PersistRegistrarMetaOpts = {
  parentName: string;
  registryAddress: string;
  registryAbi: unknown;
  resolverAddress: string;
  resolverAbi: unknown;
  registrarAddress: string;
  index: SubnameIndexEntry[];
  /** When false, skip set_approval_for_all (already approved). Default true. */
  includeApproval?: boolean;
};

/** Persist registrar address + subname index on the parent resolver (optional Registry approval). */
export function buildPersistRegistrarMetaTx(
  api: ApiPromise,
  opts: PersistRegistrarMetaOpts
): SubmittableExtrinsic<"promise"> {
  const node = namehash(normaliseName(opts.parentName));
  const indexJson = JSON.stringify(opts.index);
  const calls: SubmittableExtrinsic<"promise">[] = [];
  if (opts.includeApproval !== false) {
    calls.push(
      buildSetApprovalForAll(
        api,
        opts.registryAddress,
        opts.registryAbi,
        opts.registrarAddress,
        true
      )
    );
  }
  const resolver = new ContractPromise(
    api,
    opts.resolverAbi as string,
    opts.resolverAddress
  );
  const gasLimit = weight(api, 30_000_000_000n, 524_288n) as unknown as bigint;
  calls.push(
    resolver.tx.setText(
      { gasLimit: gasLimit as unknown as bigint, storageDepositLimit: null },
      Array.from(node),
      COMMUNITY_REGISTRAR_RECORD,
      opts.registrarAddress
    ),
    resolver.tx.setText(
      { gasLimit: gasLimit as unknown as bigint, storageDepositLimit: null },
      Array.from(node),
      SUBNAME_INDEX_RECORD,
      indexJson
    )
  );
  return calls.length === 1 ? calls[0] : api.tx.utility.batchAll(calls);
}

/** Persist registrar + subname list on the parent name's resolver. */
export async function persistRegistrarMeta(
  api: ApiPromise,
  opts: PersistRegistrarMetaOpts & { signer: KeyringPair }
): Promise<TxResult> {
  return signAndSend(buildPersistRegistrarMetaTx(api, opts), opts.signer);
}

export function buildApproveCommunityRegistrarTx(
  api: ApiPromise,
  opts: {
    registryAddress: string;
    registryAbi: unknown;
    registrarAddress: string;
  }
): SubmittableExtrinsic<"promise"> {
  return buildSetApprovalForAll(
    api,
    opts.registryAddress,
    opts.registryAbi,
    opts.registrarAddress,
    true
  );
}

/** Owner approves the CommunityRegistrar contract as a Registry operator (required for issue_subname). */
export async function approveCommunityRegistrar(
  api: ApiPromise,
  opts: {
    registryAddress: string;
    registryAbi: unknown;
    registrarAddress: string;
    owner: string;
    signer: KeyringPair;
  }
): Promise<TxResult> {
  const already = await isApprovedForAll(
    api,
    opts.registryAddress,
    opts.registryAbi,
    opts.owner,
    opts.registrarAddress,
    opts.owner
  );
  if (already) {
    return { blockHash: "", txHash: "", events: [] };
  }
  return signAndSend(buildApproveCommunityRegistrarTx(api, opts), opts.signer);
}

export interface IssueSubnameAsOwnerBaseOpts {
  registryAddress: string;
  registryAbi: unknown;
  parentName: string;
  label: string;
  member: string;
  role: string;
  communityRegistrarAddress: string;
  communityAbi: unknown;
  resolverAddress: string;
  resolverAbi: unknown;
  /** Registry owner (parent name owner). */
  ownerAddress: string;
}

export interface IssueSubnameAsOwnerOpts extends IssueSubnameAsOwnerBaseOpts {
  signer: KeyringPair;
}

/**
 * Parent owner mints a subname in one batch (no multisig):
 *   CommunityRegistrar.issue_subname + identity.setSubs + proxy.addProxy
 */
export async function buildIssueSubnameAsOwnerTx(
  api: ApiPromise,
  opts: IssueSubnameAsOwnerBaseOpts
): Promise<SubmittableExtrinsic<"promise">> {
  normaliseLabel(opts.label);
  const owner = opts.ownerAddress;

  const approved = await isApprovedForAll(
    api,
    opts.registryAddress,
    opts.registryAbi,
    owner,
    opts.communityRegistrarAddress,
    owner
  );
  if (!approved) {
    throw new Error(
      "CommunityRegistrar is not approved on the Registry. Click “Approve registrar” on the Subnames tab (or re-run Enable subnames)."
    );
  }

  const calls: SubmittableExtrinsic<"promise">[] = [
    buildIssueSubnameTx(
      api,
      opts.communityRegistrarAddress,
      opts.communityAbi,
      opts.label,
      opts.member,
      opts.role
    ),
  ];

  if (hasIdentityPallet(api) && api.tx.identity?.setSubs) {
    const subsResult = await api.query.identity.subsOf(owner);
    const [, existingSubs] = subsResult as unknown as [
      unknown,
      [string, { Raw?: string }][]
    ];
    const updatedSubs = [
      ...Array.from(existingSubs ?? []),
      [opts.member, { Raw: opts.label }],
    ];
    calls.push(api.tx.identity.setSubs(updatedSubs));
  }

  if (api.tx.proxy?.addProxy) {
    calls.push(buildAddProxy(api, opts.member, opts.role));
  }

  return calls.length === 1 ? calls[0] : api.tx.utility.batchAll(calls);
}

/** Ordered extrinsics: mint batch, then index update on resolver if needed. */
export async function planIssueSubnameAsOwner(
  api: ApiPromise,
  opts: IssueSubnameAsOwnerBaseOpts
): Promise<SubmittableExtrinsic<"promise">[]> {
  const parent = normaliseName(opts.parentName);
  const subname = `${opts.label}.${parent}`;
  const txs: SubmittableExtrinsic<"promise">[] = [await buildIssueSubnameAsOwnerTx(api, opts)];

  const node = namehash(parent);
  const prevIndex = parseSubnameIndex(
    await getText(
      api,
      opts.resolverAddress,
      opts.resolverAbi,
      node,
      SUBNAME_INDEX_RECORD,
      opts.ownerAddress
    )
  );
  if (!prevIndex.some((e) => e.label === opts.label)) {
    prevIndex.push({
      label: opts.label,
      member: opts.member,
      role: opts.role,
      subname,
    });
    txs.push(
      buildPersistRegistrarMetaTx(api, {
        parentName: parent,
        registryAddress: opts.registryAddress,
        registryAbi: opts.registryAbi,
        resolverAddress: opts.resolverAddress,
        resolverAbi: opts.resolverAbi,
        registrarAddress: opts.communityRegistrarAddress,
        index: prevIndex,
        includeApproval: false,
      })
    );
  }
  return txs;
}

export async function issueSubnameAsOwner(
  api: ApiPromise,
  opts: IssueSubnameAsOwnerOpts
): Promise<TxResult> {
  const txs = await planIssueSubnameAsOwner(api, { ...opts, ownerAddress: opts.signer.address });
  let last: TxResult = { blockHash: "", txHash: "", events: [] };
  for (const tx of txs) {
    last = await signAndSend(tx, opts.signer);
  }
  return last;
}

export async function listSubnamesForParent(
  api: ApiPromise,
  opts: {
    parentName: string;
    ownerAddress: string;
    resolverAddress: string;
    resolverAbi: unknown;
    communityRegistrarAddress?: string | null;
    communityAbi?: unknown;
  }
): Promise<Member[]> {
  const parent = normaliseName(opts.parentName);
  const node = namehash(parent);

  const fromIndex = parseSubnameIndex(
    await getText(
      api,
      opts.resolverAddress,
      opts.resolverAbi,
      node,
      SUBNAME_INDEX_RECORD,
      opts.ownerAddress
    )
  );

  if (fromIndex.length > 0) {
    return fromIndex.map((e) => ({
      label: e.label,
      account: e.member,
      role: e.role,
      subname: e.subname,
    }));
  }

  if (hasIdentityPallet(api)) {
    const subsResult = await api.query.identity.subsOf(opts.ownerAddress);
    const [, subs] = subsResult as unknown as [
      unknown,
      [string, { Raw?: string }][]
    ];
    const members: Member[] = [];
    for (const [acct, data] of subs ?? []) {
      const label =
        typeof data === "object" && data && "Raw" in data
          ? String((data as { Raw: string }).Raw)
          : String(data);
      let role = "member";
      if (opts.communityRegistrarAddress && opts.communityAbi) {
        const r = await import("../contracts/community.js").then((m) =>
          m.roleOf(
            api,
            opts.communityRegistrarAddress!,
            opts.communityAbi!,
            label,
            opts.ownerAddress
          )
        );
        if (r) role = r;
      }
      members.push({
        label,
        account: acct.toString(),
        role,
        subname: `${label}.${parent}`,
      });
    }
    return members;
  }

  return [];
}
