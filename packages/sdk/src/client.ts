import { ApiPromise, WsProvider } from "@polkadot/api";
import type { KeyringPair } from "@polkadot/keyring/types";
import type {
  ContractAddresses,
  ResolvedName,
  Member,
  CreateCommunityOpts,
  CommunityHandle,
  IssueSubnameOpts,
  RevokeSubnameOpts,
  AttestOpts,
  AttestationRecord,
  ProfileFields,
  PostBountyOpts,
  ClaimBountyOpts,
  TxResult,
} from "./types.js";
import { namehash, normaliseName, labelHash } from "./namehash.js";
import { getOwner, setResolver, recordExists } from "./contracts/registry.js";
import { getAddr, getText, setAddr, setText } from "./contracts/resolver.js";
import { listAttestationsForSubject } from "./flows/attest.js";
import { registerName } from "./flows/register.js";
import { claimSubname, revokeSubname } from "./flows/claim-subname.js";
import {
  issueSubnameAsOwner,
  listSubnamesForParent,
  getCommunityRegistrarAddress,
  persistRegistrarMeta,
  approveCommunityRegistrar,
} from "./flows/issue-subname-owner.js";
import { setIdentity, provideJudgement } from "./pallets/identity.js";
import { deriveMultisigAddress } from "./pallets/multisig.js";
import { proposeBounty, claimBounty as palletClaimBounty, getNextBountyId } from "./pallets/bounties.js";
import { signAndSend, unwrapOk, isZeroAccount } from "./utils.js";
import { TEXT_KEYS, REGISTRATION_PRICE, LOCAL_WS } from "./constants.js";
import { ContractPromise } from "@polkadot/api-contract";

export class PNSClient {
  public api!: ApiPromise;
  public readonly addresses: ContractAddresses;
  private wsEndpoint: string;

  // ABIs loaded lazily via setAbis()
  private abis: Record<string, unknown> = {};

  constructor(opts: { wsEndpoint?: string; addresses: ContractAddresses }) {
    this.wsEndpoint = opts.wsEndpoint ?? LOCAL_WS;
    this.addresses = opts.addresses;
  }

  async connect(): Promise<void> {
    const provider = new WsProvider(this.wsEndpoint);
    this.api = await ApiPromise.create({ provider });
    await this.api.isReady;
  }

  async disconnect(): Promise<void> {
    await this.api.disconnect();
  }

  setAbis(abis: Record<string, unknown>): void {
    this.abis = abis;
  }

  // ── Resolution ──────────────────────────────────────────────────────────────

  async resolveName(name: string): Promise<ResolvedName> {
    const normalised = normaliseName(name);
    const node = namehash(normalised);
    const caller = this.api.registry.createType("AccountId", new Uint8Array(32)).toString();

    const owner = await getOwner(
      this.api,
      this.addresses.registry,
      this.abis.registry,
      node,
      caller
    );

    // Registry may not have set_resolver yet; fall back to the deployed PublicResolver.
    const registryResolver = await this._getResolver(node, caller);
    const resolverAddress =
      registryResolver && !isZeroAccount(registryResolver)
        ? registryResolver
        : this.addresses.resolver;

    const addr = await getAddr(
      this.api,
      resolverAddress,
      this.abis.resolver,
      node,
      caller
    );

    const textRecords: Record<string, string> = {};
    for (const key of Object.values(TEXT_KEYS)) {
      const val = await getText(
        this.api,
        resolverAddress,
        this.abis.resolver,
        node,
        key,
        caller
      );
      if (val) textRecords[key] = val;
    }

    return {
      name: normalised,
      owner: isZeroAccount(owner) ? "0x00" : (owner ?? "0x00"),
      resolver: resolverAddress,
      addr,
      textRecords,
      contenthash: null,
      expiry: null,
    };
  }

  private async _getResolver(node: Uint8Array, caller: string): Promise<string | null> {
    const contract = new ContractPromise(
      this.api,
      this.abis.registry as string,
      this.addresses.registry
    );
    const { output } = await contract.query.resolver(
      caller,
      { gasLimit: (this.api.registry.createType("WeightV2", { refTime: 30_000_000_000n, proofSize: 131_072n })) as unknown as bigint, storageDepositLimit: null },
      Array.from(node)
    );
    const addr = unwrapOk<string>(output?.toJSON());
    if (isZeroAccount(addr)) return null;
    return addr ?? null;
  }

  async resolveAddress(addr: string): Promise<string | null> {
    const contract = new ContractPromise(
      this.api,
      this.abis.reverse as string,
      this.addresses.reverseRegistrar
    );
    const caller = addr;
    const { output } = await contract.query.nameOf(
      caller,
      { gasLimit: (this.api.registry.createType("WeightV2", { refTime: 30_000_000_000n, proofSize: 131_072n })) as unknown as bigint, storageDepositLimit: null },
      addr
    );
    return unwrapOk<string>(output?.toJSON()) ?? null;
  }

  async getTextRecords(name: string): Promise<Record<string, string>> {
    const resolved = await this.resolveName(name);
    return resolved.textRecords;
  }

  async getContenthash(name: string): Promise<string | null> {
    return null; // stub — implement after chain-verify
  }

  // ── Top-level registration ──────────────────────────────────────────────────

  async registerName(
    name: string,
    owner: string,
    signer: KeyringPair,
    identityFields?: ProfileFields
  ): Promise<TxResult> {
    return registerName(this.api, {
      label: name,
      owner,
      registrarAddress: this.addresses.registrar,
      registrarAbi: this.abis.registrar,
      registryAddress: this.addresses.registry,
      registryAbi: this.abis.registry,
      resolverAddress: this.addresses.resolver,
      registrationPrice: REGISTRATION_PRICE,
      signer,
      setIdentityFields: identityFields,
    });
  }

  // ── Communities ─────────────────────────────────────────────────────────────

  async createCommunity(opts: CreateCommunityOpts): Promise<CommunityHandle> {
    const multisigAddress = deriveMultisigAddress(opts.signers, opts.threshold);
    // Registration + community registrar deployment is coordinated by the frontend
    // wizard. This method returns the derived address for the UI to fund.
    const parentNode = namehash(normaliseName(`${opts.parentLabel}.pot`));
    return {
      multisigAddress,
      communityRegistrarAddress: "", // set after deploy
      parentNode,
    };
  }

  async issueSubname(opts: IssueSubnameOpts): Promise<TxResult> {
    return claimSubname(this.api, opts);
  }

  /** Parent owner mints a subname (single signer, no multisig). */
  async issueSubnameAsOwner(opts: {
    parentName: string;
    label: string;
    member: string;
    role: string;
    communityRegistrarAddress: string;
    signer: KeyringPair;
  }): Promise<TxResult> {
    return issueSubnameAsOwner(this.api, {
      ...opts,
      communityAbi: this.abis.community,
      registryAddress: this.addresses.registry,
      registryAbi: this.abis.registry,
      resolverAddress: this.addresses.resolver,
      resolverAbi: this.abis.resolver,
    });
  }

  async approveCommunityRegistrar(
    parentName: string,
    registrarAddress: string,
    signer: KeyringPair
  ): Promise<TxResult> {
    return approveCommunityRegistrar(this.api, {
      registryAddress: this.addresses.registry,
      registryAbi: this.abis.registry,
      registrarAddress,
      owner: signer.address,
      signer,
    });
  }

  async getCommunityRegistrar(parentName: string, caller: string): Promise<string | null> {
    return getCommunityRegistrarAddress(
      this.api,
      parentName,
      this.addresses.resolver,
      this.abis.resolver,
      caller
    );
  }

  async saveCommunityRegistrar(
    parentName: string,
    registrarAddress: string,
    signer: KeyringPair
  ): Promise<TxResult> {
    return persistRegistrarMeta(this.api, {
      parentName,
      registryAddress: this.addresses.registry,
      registryAbi: this.abis.registry,
      resolverAddress: this.addresses.resolver,
      resolverAbi: this.abis.resolver,
      registrarAddress,
      index: [],
      signer,
    });
  }

  async listSubnames(parentName: string, ownerAddress: string): Promise<Member[]> {
    const registrar = await this.getCommunityRegistrar(parentName, ownerAddress);
    return listSubnamesForParent(this.api, {
      parentName,
      ownerAddress,
      resolverAddress: this.addresses.resolver,
      resolverAbi: this.abis.resolver,
      communityRegistrarAddress: registrar,
      communityAbi: registrar ? this.abis.community : undefined,
    });
  }

  async revokeSubname(opts: RevokeSubnameOpts): Promise<TxResult> {
    return revokeSubname(this.api, opts);
  }

  /** @deprecated Use listSubnames */
  async listMembers(parentName: string): Promise<Member[]> {
    const caller = this.api.registry.createType("AccountId", new Uint8Array(32)).toString();
    return this.listSubnames(parentName, caller);
  }

  // ── Attestations ─────────────────────────────────────────────────────────────

  async attest(opts: AttestOpts): Promise<{ id: bigint } & TxResult> {
    const { attestFlow } = await import("./flows/attest.js");
    return attestFlow(this.api, this.addresses.attestation, this.abis.attestation, opts);
  }

  async listAttestationsForSubject(
    name: string,
    schema?: string
  ): Promise<AttestationRecord[]> {
    const caller = this.api.registry.createType("AccountId", new Uint8Array(32)).toString();
    return listAttestationsForSubject(
      this.api,
      this.addresses.attestation,
      this.abis.attestation,
      name,
      schema,
      caller
    );
  }

  // ── Identity ─────────────────────────────────────────────────────────────────

  async setProfile(
    _name: string,
    fields: ProfileFields,
    signer: KeyringPair
  ): Promise<TxResult> {
    return setIdentity(this.api, fields, signer);
  }

  async requestJudgement(
    _name: string,
    regIndex: number,
    maxFee: bigint,
    signer: KeyringPair
  ): Promise<TxResult> {
    const tx = this.api.tx.identity.requestJudgement(regIndex, maxFee);
    return signAndSend(tx, signer);
  }

  async provideJudgement(
    regIndex: number,
    target: string,
    judgement: "Reasonable" | "KnownGood",
    identityHash: Uint8Array,
    signer: KeyringPair
  ): Promise<TxResult> {
    return provideJudgement(this.api, regIndex, target, judgement, identityHash, signer);
  }

  // ── Bounties ──────────────────────────────────────────────────────────────────

  async postBounty(opts: PostBountyOpts): Promise<TxResult> {
    return proposeBounty(this.api, opts.value, opts.description, opts.signer);
  }

  async claimBounty(opts: ClaimBountyOpts): Promise<TxResult> {
    const node = namehash(normaliseName(opts.subnameName));
    const bountyTx = this.api.tx.bounties.claimBounty(opts.bountyId);
    const textTx = new ContractPromise(
      this.api,
      this.abis.resolver as string,
      this.addresses.resolver
    ).tx.setText(
      { gasLimit: (this.api.registry.createType("WeightV2", { refTime: 30_000_000_000n, proofSize: 131_072n })) as unknown as bigint, storageDepositLimit: null },
      Array.from(node),
      `contribution.${opts.bountyId}`,
      opts.description
    );
    const batch = this.api.tx.utility.batchAll([bountyTx, textTx]);
    return signAndSend(batch, opts.signer);
  }
}
