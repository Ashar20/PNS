#!/usr/bin/env tsx
/**
 * Diagnoses attestation failures.
 *
 * Usage:
 *   npx tsx scripts/debug-attest.ts [issuerName] [subjectName]
 *
 * Defaults: issuer = alice.pot, subject = bob.pot
 *
 * Steps:
 *   1. Check both names exist in Registry (owned by Alice / Bob dev accounts)
 *   2. Register them if missing
 *   3. Attempt attest — decode the full error if it fails
 */

import { ApiPromise, WsProvider, Keyring } from "@polkadot/api";
import { ContractPromise } from "@polkadot/api-contract";
import { cryptoWaitReady } from "@polkadot/util-crypto";
import { readFileSync } from "fs";
import { join } from "path";
import { LOCAL_ADDRESSES, REGISTRATION_PRICE } from "../packages/sdk/src/constants.js";
import { namehash, normaliseName } from "../packages/sdk/src/namehash.js";

const WS = "ws://127.0.0.1:9944";
const ISSUER_NAME = process.argv[2] ?? "alice.pot";
const SUBJECT_NAME = process.argv[3] ?? "bob.pot";

function loadAbi(name: string) {
  const paths = [
    join("contracts", name, "target", "ink", `${name}.json`),
    join("apps", "web", "public", "abis", `${name}.json`),
  ];
  for (const p of paths) {
    try { return JSON.parse(readFileSync(p, "utf8")); } catch { /* try next */ }
  }
  throw new Error(`ABI not found for ${name} — run cargo contract build --release first`);
}

function decodeDispatchError(api: ApiPromise, err: unknown): string {
  if (!err) return "(no dispatch error)";
  const e = err as { isModule?: boolean; asModule?: unknown; toString(): string };
  if (e.isModule) {
    try {
      const decoded = api.registry.findMetaError(e.asModule as { index: number; error: Uint8Array });
      return `${decoded.section}.${decoded.name}: ${decoded.docs.join(" ").trim()}`;
    } catch { /* fall through */ }
  }
  return e.toString();
}

async function sendAndWait(
  api: ApiPromise,
  tx: ReturnType<ContractPromise["tx"][string]>,
  signer: ReturnType<Keyring["addFromUri"]>
): Promise<{ ok: boolean; error?: string; blockHash?: string }> {
  return new Promise((resolve) => {
    tx.signAndSend(signer, (result) => {
      if (result.status.isFinalized) {
        const failed = result.events.some(
          ({ event }) => event.section === "system" && event.method === "ExtrinsicFailed"
        );
        if (failed || result.dispatchError) {
          const msg = decodeDispatchError(api, result.dispatchError);
          const contractEvent = result.events.find(
            ({ event }) => event.section === "contracts" && event.method !== "Called" && event.method !== "ContractEmitted" && event.method !== "Instantiated"
          );
          if (contractEvent) {
            console.log(`  contracts.${contractEvent.event.method}:`, (contractEvent.event.data as { toHuman(): unknown }).toHuman?.() ?? contractEvent.event.data);
          }
          resolve({ ok: false, error: msg });
        } else {
          resolve({ ok: true, blockHash: result.status.asFinalized.toHex() });
        }
      }
    }).catch((e: unknown) => resolve({ ok: false, error: String(e) }));
  });
}

async function main() {
  await cryptoWaitReady();
  const api = await ApiPromise.create({ provider: new WsProvider(WS) });
  const keyring = new Keyring({ type: "sr25519", ss58Format: 42 });
  const alice = keyring.addFromUri("//Alice");
  const bob = keyring.addFromUri("//Bob");

  console.log("=== PNS Attestation Diagnostic ===");
  console.log(`Issuer  : ${ISSUER_NAME}  (signing as Alice: ${alice.address})`);
  console.log(`Subject : ${SUBJECT_NAME}`);
  console.log(`Node    : ${WS}`);
  console.log(`Registry: ${LOCAL_ADDRESSES.registry}`);
  console.log(`Attest  : ${LOCAL_ADDRESSES.attestation}`);
  console.log("");

  const registryAbi = loadAbi("registry");
  const registrarAbi = loadAbi("registrar");
  const attestAbi = loadAbi("attestation");

  const registry = new ContractPromise(api, registryAbi, LOCAL_ADDRESSES.registry);
  const registrar = new ContractPromise(api, registrarAbi, LOCAL_ADDRESSES.registrar);
  const attestation = new ContractPromise(api, attestAbi, LOCAL_ADDRESSES.attestation);

  const gasQ = api.registry.createType("WeightV2", { refTime: 10_000_000_000n, proofSize: 131_072n });
  const gasT = api.registry.createType("WeightV2", { refTime: 30_000_000_000n, proofSize: 524_288n });

  // ── 1. Check issuer name ownership ──────────────────────────────────────────
  const issuerNode = namehash(normaliseName(ISSUER_NAME));
  const { output: ownerOut } = await registry.query.owner(
    alice.address,
    { gasLimit: gasQ as unknown as bigint, storageDepositLimit: null },
    Array.from(issuerNode)
  );
  const ownerJson = ownerOut?.toJSON() as { ok?: string } | string | null;
  const issuerOwner = typeof ownerJson === "object" && ownerJson && "ok" in ownerJson
    ? ownerJson.ok
    : ownerJson;

  const ZERO = "5C4hrfjw9DjXZTzV3MwzrrAr9P1MJhSrvWGWqi1eSuyUpnhM";
  const issuerExists = issuerOwner && issuerOwner !== ZERO;

  console.log(`[1] Issuer name "${ISSUER_NAME}"`);
  console.log(`    owner in Registry : ${issuerOwner ?? "(null)"}`);
  console.log(`    Alice address     : ${alice.address}`);
  console.log(`    caller owns node  : ${issuerOwner === alice.address ? "YES ✓" : "NO ✗"}`);

  if (!issuerExists) {
    console.log(`\n    ➜  "${ISSUER_NAME}" not registered — registering now for Alice…`);
    const label = ISSUER_NAME.split(".")[0];
    const price = REGISTRATION_PRICE;
    const regResult = await sendAndWait(
      api,
      registrar.tx.register(
        { gasLimit: gasT as unknown as bigint, storageDepositLimit: null, value: price },
        label,
        alice.address
      ) as ReturnType<ContractPromise["tx"][string]>,
      alice
    );
    if (!regResult.ok) {
      console.log(`    Registration failed: ${regResult.error}`);
    } else {
      console.log(`    Registered at block ${regResult.blockHash}`);
    }
  }

  // ── 2. Check subject name ────────────────────────────────────────────────────
  const subjectNode = namehash(normaliseName(SUBJECT_NAME));
  const { output: subjectOwnerOut } = await registry.query.owner(
    bob.address,
    { gasLimit: gasQ as unknown as bigint, storageDepositLimit: null },
    Array.from(subjectNode)
  );
  const subjectOwnerJson = subjectOwnerOut?.toJSON() as { ok?: string } | string | null;
  const subjectOwner = typeof subjectOwnerJson === "object" && subjectOwnerJson && "ok" in subjectOwnerJson
    ? subjectOwnerJson.ok
    : subjectOwnerJson;
  const subjectExists = subjectOwner && subjectOwner !== ZERO;

  console.log(`\n[2] Subject name "${SUBJECT_NAME}"`);
  console.log(`    owner in Registry : ${subjectOwner ?? "(null)"}`);

  if (!subjectExists) {
    console.log(`    ➜  "${SUBJECT_NAME}" not registered — registering now for Bob…`);
    const label = SUBJECT_NAME.split(".")[0];
    const price = 10n ** 12n;
    const regResult = await sendAndWait(
      api,
      registrar.tx.register(
        { gasLimit: gasT as unknown as bigint, storageDepositLimit: null, value: price },
        label,
        bob.address
      ) as ReturnType<ContractPromise["tx"][string]>,
      bob
    );
    if (!regResult.ok) {
      console.log(`    Registration failed: ${regResult.error}`);
    } else {
      console.log(`    Registered at block ${regResult.blockHash}`);
    }
  }

  // ── 3. Attempt attestation ───────────────────────────────────────────────────
  console.log(`\n[3] Attempting attest(issuer=${ISSUER_NAME}, subject=${SUBJECT_NAME}, schema=endorsement.skill)`);
  console.log(`    Signing as Alice (${alice.address})`);

  const attestResult = await sendAndWait(
    api,
    attestation.tx.attest(
      { gasLimit: gasT as unknown as bigint, storageDepositLimit: null },
      Array.from(issuerNode),
      Array.from(subjectNode),
      "endorsement.skill",
      Array.from(new TextEncoder().encode("backend rust"))
    ) as ReturnType<ContractPromise["tx"][string]>,
    alice
  );

  if (!attestResult.ok) {
    console.log(`    FAILED: ${attestResult.error}`);
    console.log("\n=== Diagnosis ===");
    if (attestResult.error?.includes("ContractReverted")) {
      console.log("    Contract returned Err — most likely NotAuthorized.");
      console.log("    This means the caller (Alice) does not own the issuer node in the Registry.");
      console.log("    Fix: make sure the issuer name is registered to the same account you're signing with.");
    } else if (attestResult.error?.includes("ContractTrapped")) {
      console.log("    Contract panicked (out of gas or bug). Check proofSize / refTime.");
    } else {
      console.log("    Unknown failure — see error above.");
    }
  } else {
    console.log(`    SUCCESS ✓  block: ${attestResult.blockHash}`);

    // Query back the stored attestation
    const { output: idsOut } = await attestation.query.listBySubject(
      alice.address,
      { gasLimit: gasQ as unknown as bigint, storageDepositLimit: null },
      Array.from(subjectNode),
      "endorsement.skill"
    );
    const ids = idsOut?.toJSON() as { ok?: number[] } | number[] | null;
    const idArr = Array.isArray(ids) ? ids : (ids as { ok?: number[] })?.ok ?? [];
    console.log(`    Attestation IDs for subject: [${idArr.join(", ")}]`);
  }

  await api.disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
