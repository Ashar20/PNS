import type { ApiPromise } from "@polkadot/api";
import type { KeyringPair } from "@polkadot/keyring/types";
import type { TxResult } from "../types.js";
import { signAndSend } from "../utils.js";

export async function getBalance(api: ApiPromise, address: string): Promise<bigint> {
  const account = await api.query.system.account(address);
  const data = (account as unknown as { data: { free: { toBigInt(): bigint } } }).data;
  return data.free.toBigInt();
}

export async function transfer(
  api: ApiPromise,
  to: string,
  amount: bigint,
  signer: KeyringPair
): Promise<TxResult> {
  // transferAllowDeath is the modern name (renamed from transfer in Substrate FRAME v2)
  const tx = (api.tx.balances.transferAllowDeath ?? api.tx.balances.transfer)(to, amount);
  return signAndSend(tx, signer);
}

export interface TransferRecord {
  blockHash: string;
  from: string;
  to: string;
  amount: bigint;
  timestamp: number;
}
