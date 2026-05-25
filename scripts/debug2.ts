import { ApiPromise, WsProvider, Keyring } from "@polkadot/api";
import { ContractPromise } from "@polkadot/api-contract";
import { readFileSync } from "fs";
import { join } from "path";
import { namehash } from "../packages/sdk/src/namehash.js";

async function main() {
  const api = await ApiPromise.create({ provider: new WsProvider("ws://127.0.0.1:9944") });
  await api.isReady;
  const alice = new Keyring({ type: "sr25519", ss58Format: 42 }).addFromUri("//Alice");

  const src = readFileSync(join("packages", "sdk", "src", "constants", "local.ts"), "utf8");
  const addresses = JSON.parse(src.match(/=\s*(\{[\s\S]*?\});/)![1]);
  const registryAbi = JSON.parse(readFileSync(join("contracts", "registry", "target", "ink", "registry.json"), "utf8"));
  const registrarAbi = JSON.parse(readFileSync(join("contracts", "registrar", "target", "ink", "registrar.json"), "utf8"));
  const registry = new ContractPromise(api, registryAbi, addresses.registry);
  const registrar = new ContractPromise(api, registrarAbi, addresses.registrar);
  const w = (r: bigint, p: bigint) => api.registry.createType("WeightV2", { refTime: r, proofSize: p });

  const potNode = namehash("pot");
  console.log("namehash('pot'):", Buffer.from(potNode).toString("hex"));
  console.log("registrar addr: ", addresses.registrar);

  const q = await registry.query.owner(alice.address, { gasLimit: w(30_000_000_000n, 131_072n) }, Array.from(potNode));
  console.log("registry.owner(potNode):", q.result.isOk ? q.output?.toJSON() : "ERR:" + JSON.stringify(q.result.toHuman()));

  const q2 = await registrar.query.available(alice.address, { gasLimit: w(30_000_000_000n, 131_072n) }, "newtest");
  console.log("registrar.available('newtest'):", q2.result.isOk ? q2.output?.toJSON() : "ERR:" + JSON.stringify(q2.result.toHuman()));

  await api.disconnect();
}
main().catch(console.error);
