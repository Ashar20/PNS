#!/usr/bin/env tsx
/**
 * Reproduces saveProfile batch and isolates which inner call traps.
 */
import { ApiPromise, WsProvider, Keyring } from "@polkadot/api";
import { ContractPromise } from "@polkadot/api-contract";
import { readFileSync } from "fs";
import { join } from "path";
import { namehash, normaliseName, saveProfile, getOwner, recordExists } from "../packages/sdk/src/index.js";
import { LOCAL_ADDRESSES } from "../packages/sdk/src/constants/local.js";

const NAME = process.argv[2] ?? "silass.pot";

function loadAbi(name: string): unknown {
  return JSON.parse(
    readFileSync(join("contracts", name, "target", "ink", `${name}.json`), "utf8")
  );
}

async function tryTx(label: string, fn: () => Promise<void>) {
  try {
    await fn();
    console.log(`OK  ${label}`);
    return true;
  } catch (e) {
    console.log(`FAIL ${label}`);
    console.log(`     ${String(e).replace(/\n/g, " ")}`);
    return false;
  }
}

async function main() {
  const api = await ApiPromise.create({ provider: new WsProvider("ws://127.0.0.1:9944") });
  await api.isReady;
  const alice = new Keyring({ type: "sr25519" }).addFromUri("//Alice");
  const node = namehash(normaliseName(NAME));
  const caller = alice.address;

  console.log("Name:", NAME);
  console.log("Signer:", caller);
  console.log("Resolver:", LOCAL_ADDRESSES.resolver);
  console.log("Reverse:", LOCAL_ADDRESSES.reverseRegistrar);

  const exists = await recordExists(
    api,
    LOCAL_ADDRESSES.registry,
    loadAbi("registry"),
    node,
    caller
  );
  const owner = await getOwner(
    api,
    LOCAL_ADDRESSES.registry,
    loadAbi("registry"),
    node,
    caller
  );
  console.log("recordExists:", exists, "owner:", owner);

  if (!exists) {
    console.log("Registering", NAME, "to", caller, "…");
    const registrar = new ContractPromise(
      api,
      loadAbi("registrar") as string,
      LOCAL_ADDRESSES.registrar
    );
    const label = NAME.replace(/\.pot$/, "");
    const gas = api.registry.createType("WeightV2", {
      refTime: 30_000_000_000n,
      proofSize: 524_288n,
    });
    await new Promise<void>((resolve, reject) => {
      registrar.tx
        .register(
          { gasLimit: gas as unknown as bigint, value: 10n ** 14n, storageDepositLimit: null },
          label,
          caller
        )
        .signAndSend(alice, ({ status, events }) => {
          if (!status.isFinalized) return;
          const failed = events.some(
            (e) => e.event.section === "system" && e.event.method === "ExtrinsicFailed"
          );
          failed ? reject(new Error("register failed")) : resolve();
        })
        .catch(reject);
    });
    console.log("Registered.");
  }

  const abis = {
    resolver: loadAbi("resolver"),
    reverse: loadAbi("reverse"),
  };

  const opts = {
    name: NAME,
    textRecords: {
      description: "hello",
      url: "hello.com",
      "com.twitter": "silass",
    },
    addr: alice.address,
    setPrimary: true,
    syncIdentity: false,
    resolverAddress: LOCAL_ADDRESSES.resolver,
    resolverAbi: abis.resolver,
    reverseRegistrarAddress: LOCAL_ADDRESSES.reverseRegistrar,
    reverseRegistrarAbi: abis.reverse,
    signer: alice,
  };

  await tryTx("set_text description only", () =>
    saveProfile(api, {
      ...opts,
      textRecords: { description: "hello" },
      addr: undefined,
      setPrimary: false,
    }).then(() => {})
  );

  await tryTx("set_text x3", () =>
    saveProfile(api, {
      ...opts,
      addr: undefined,
      setPrimary: false,
    }).then(() => {})
  );

  await tryTx("set_addr only", () =>
    saveProfile(api, {
      ...opts,
      textRecords: {},
      setPrimary: false,
    }).then(() => {})
  );

  await tryTx("set_name only", () =>
    saveProfile(api, {
      ...opts,
      textRecords: {},
      addr: undefined,
    }).then(() => {})
  );

  await tryTx("full batch (5 writes)", () =>
    saveProfile(api, opts).then(() => {})
  );

  await api.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
