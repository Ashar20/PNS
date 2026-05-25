import type { ApiPromise } from "@polkadot/api";
import type { KeyringPair } from "@polkadot/keyring/types";
import type { TxResult } from "../types.js";
import { signAndSend } from "../utils.js";

export async function proposeBounty(
  api: ApiPromise,
  value: bigint,
  description: string,
  signer: KeyringPair
): Promise<TxResult> {
  const tx = api.tx.bounties.proposeBounty(value, description);
  return signAndSend(tx, signer);
}

export async function approveBounty(
  api: ApiPromise,
  bountyId: number,
  signer: KeyringPair
): Promise<TxResult> {
  const tx = api.tx.bounties.approveBounty(bountyId);
  return signAndSend(tx, signer);
}

export async function proposeCurator(
  api: ApiPromise,
  bountyId: number,
  curator: string,
  fee: bigint,
  signer: KeyringPair
): Promise<TxResult> {
  const tx = api.tx.bounties.proposeCurator(bountyId, curator, fee);
  return signAndSend(tx, signer);
}

export async function acceptCurator(
  api: ApiPromise,
  bountyId: number,
  signer: KeyringPair
): Promise<TxResult> {
  const tx = api.tx.bounties.acceptCurator(bountyId);
  return signAndSend(tx, signer);
}

export async function awardBounty(
  api: ApiPromise,
  bountyId: number,
  beneficiary: string,
  signer: KeyringPair
): Promise<TxResult> {
  const tx = api.tx.bounties.awardBounty(bountyId, beneficiary);
  return signAndSend(tx, signer);
}

export async function claimBounty(
  api: ApiPromise,
  bountyId: number,
  signer: KeyringPair
): Promise<TxResult> {
  const tx = api.tx.bounties.claimBounty(bountyId);
  return signAndSend(tx, signer);
}

export async function getNextBountyId(api: ApiPromise): Promise<number> {
  const count = await api.query.bounties.bountyCount();
  return (count as unknown as { toNumber(): number }).toNumber();
}
