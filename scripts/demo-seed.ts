#!/usr/bin/env tsx
/**
 * Idempotent demo seed script.
 * Pre-creates the accounts and on-chain state needed for the section 9 demo.
 * Safe to run multiple times — checks existence before writing.
 *
 * Requires:
 *   - Local dev node running at ws://127.0.0.1:9944
 *   - packages/sdk/src/constants/local.ts written by deploy.ts
 */

import { ApiPromise, WsProvider, Keyring } from "@polkadot/api";
import { ContractPromise } from "@polkadot/api-contract";
import { createKeyMulti, encodeAddress } from "@polkadot/util-crypto";
import { readFileSync } from "fs";
import { join } from "path";

const LOCAL_WS = "ws://127.0.0.1:9944";
const SS58 = 42;

function loadAbi(name: string): unknown {
  return JSON.parse(
    readFileSync(join("contracts", name, "target", "ink", `${name}.json`), "utf8")
  );
}

function loadAddresses(): Record<string, string> {
  try {
    // Try to import the generated constants
    const src = readFileSync(join("packages", "sdk", "src", "constants", "local.ts"), "utf8");
    const match = src.match(/LOCAL_ADDRESSES.*?=\s*(\{[\s\S]*?\});/);
    if (match) return JSON.parse(match[1]);
  } catch {}
  // Fallback: addresses must be provided via env
  return {
    registry: process.env.REGISTRY_ADDRESS ?? "",
    resolver: process.env.RESOLVER_ADDRESS ?? "",
    registrar: process.env.REGISTRAR_ADDRESS ?? "",
    reverseRegistrar: process.env.REVERSE_ADDRESS ?? "",
    attestation: process.env.ATTESTATION_ADDRESS ?? "",
  };
}

async function transfer(api: ApiPromise, from: ReturnType<Keyring["addFromUri"]>, to: string, amount: bigint) {
  return new Promise<void>((resolve, reject) => {
    api.tx.balances.transferKeepAlive(to, amount).signAndSend(from, ({ status }) => {
      if (status.isFinalized) resolve();
    }).catch(reject);
  });
}

async function callContract(
  api: ApiPromise,
  contract: ContractPromise,
  method: string,
  signer: ReturnType<Keyring["addFromUri"]>,
  value: bigint,
  ...args: unknown[]
) {
  return new Promise<void>((resolve, reject) => {
    contract.tx[method](
      {
        gasLimit: api.registry.createType("WeightV2", { refTime: 10_000_000_000n, proofSize: 10_000n }),
        value,
      },
      ...args
    ).signAndSend(signer, ({ status }) => {
      if (status.isFinalized) resolve();
    }).catch(reject);
  });
}

async function main() {
  console.log("Connecting to local dev node…");
  const provider = new WsProvider(LOCAL_WS);
  const api = await ApiPromise.create({ provider });
  await api.isReady;

  const keyring = new Keyring({ type: "sr25519", ss58Format: SS58 });
  const alice = keyring.addFromUri("//Alice");
  const bob = keyring.addFromUri("//Bob");
  const charlie = keyring.addFromUri("//Charlie");
  const dave = keyring.addFromUri("//Dave");

  const addresses = loadAddresses();
  const PRICE = 10n ** 14n; // 1 POT
  const POT = 10n ** 14n;

  // Community multisig: Alice + Bob, threshold 2
  const multisig = encodeAddress(createKeyMulti([alice.address, bob.address], 2), SS58);
  console.log(`\nDemo accounts:`);
  console.log(`  Alice:    ${alice.address}`);
  console.log(`  Bob:      ${bob.address}`);
  console.log(`  Charlie:  ${charlie.address}`);
  console.log(`  Multisig: ${multisig}`);

  // Fund multisig with 5 POT (idempotent — just send regardless)
  console.log("\nFunding multisig…");
  await transfer(api, alice, multisig, 5n * POT);

  if (!addresses.registrar) {
    console.error("No registrar address. Run scripts/deploy.ts first.");
    process.exit(1);
  }

  const registrarAbi = loadAbi("registrar");
  const registrarContract = new ContractPromise(api, registrarAbi as string, addresses.registrar);

  // Check if leo.pot already registered
  const { output: leoAvail } = await registrarContract.query.available(
    alice.address,
    { gasLimit: api.registry.createType("WeightV2", { refTime: 5_000_000_000n, proofSize: 5_000n }) },
    "leo"
  );

  if (leoAvail?.toJSON() !== false) {
    console.log("\nRegistering leo.pot…");
    await callContract(api, registrarContract, "register", alice, PRICE, "leo", alice.address);
    console.log("  leo.pot registered to Alice");
  } else {
    console.log("\nleo.pot already registered. Skipping.");
  }

  // Check bandit-dao.pot
  const { output: bandAvail } = await registrarContract.query.available(
    alice.address,
    { gasLimit: api.registry.createType("WeightV2", { refTime: 5_000_000_000n, proofSize: 5_000n }) },
    "bandit-dao"
  );

  if (bandAvail?.toJSON() !== false) {
    console.log("\nRegistering bandit-dao.pot to multisig…");
    await callContract(api, registrarContract, "register", alice, PRICE, "bandit-dao", multisig);
    console.log("  bandit-dao.pot registered to multisig");
  } else {
    console.log("\nbandit-dao.pot already registered. Skipping.");
  }

  console.log("\nDemo seed complete.");
  console.log(`\nNext steps:`);
  console.log(`  1. Deploy a CommunityRegistrar for bandit-dao.pot`);
  console.log(`  2. Issue subname alice.bandit-dao.pot to Alice via the Invite UI`);
  console.log(`  3. Run the demo script (section 9)`);

  await api.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
