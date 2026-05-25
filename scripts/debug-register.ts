import { ApiPromise, WsProvider, Keyring } from "@polkadot/api";
import { ContractPromise } from "@polkadot/api-contract";
import { cryptoWaitReady } from "@polkadot/util-crypto";
import { readFileSync } from "fs";
import { join } from "path";

async function main() {
  await cryptoWaitReady();
  const api = await ApiPromise.create({ provider: new WsProvider("ws://127.0.0.1:9944") });
  await api.isReady;
  const keyring = new Keyring({ type: "sr25519", ss58Format: 42 });
  const alice = keyring.addFromUri("//Alice");
  const { LOCAL_ADDRESSES } = await import("../packages/sdk/src/constants/local.js");
  const registrarAbi = JSON.parse(readFileSync(join("contracts", "registrar", "target", "ink", "registrar.json"), "utf8"));
  const registrar = new ContractPromise(api, registrarAbi, LOCAL_ADDRESSES.registrar);

  const price = 100_000_000_000_000n;
  const gasLimit = api.registry.createType("WeightV2", { refTime: 30_000_000_000n, proofSize: 131_072n });

  console.log("Sending register tx...");
  await new Promise<void>((resolve) => {
    registrar.tx.register(
      { gasLimit, value: price, storageDepositLimit: null } as any,
      "testreal2", alice.address
    ).signAndSend(alice, ({ status, events }) => {
      if (status.isInBlock) {
        console.log("In block. Events:");
        for (const { event } of events as any) {
          console.log(" ", event.section, event.method, JSON.stringify(event.data.toHuman()));
          if (event.section === "system" && event.method === "ExtrinsicFailed") {
            const err = event.data[0] as any;
            if (err.isModule) {
              try {
                const decoded = api.registry.findMetaError(err.asModule);
                console.log("  -> decoded:", decoded.section, decoded.method, decoded.docs);
              } catch(e) { console.log("  -> decode error:", e); }
            } else {
              console.log("  -> non-module error:", err.toHuman());
            }
          }
        }
        resolve();
      }
    });
  });

  await api.disconnect();
}
main().catch(console.error);
