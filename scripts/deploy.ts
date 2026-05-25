#!/usr/bin/env tsx
/**
 * Deploys all six PNS contracts in the correct order and wires them up.
 * After deployment, writes addresses to packages/sdk/src/constants/[network].ts
 *
 * Usage:
 *   pnpm run deploy:local     -- deploys to ws://127.0.0.1:9944
 *   pnpm run deploy:mainnet   -- deploys to wss://mainnet.portaldot.io
 *
 * Prerequisites:
 *   - cargo contract build --release run in each contracts/ dir
 *   - Deployer keypair funded with enough POT
 */

import { ApiPromise, WsProvider, Keyring } from "@polkadot/api";
import { CodePromise, ContractPromise } from "@polkadot/api-contract";
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { namehash, labelHash } from "../packages/sdk/src/namehash.js";

const isMainnet = process.argv.includes("--network") &&
  process.argv[process.argv.indexOf("--network") + 1] === "mainnet";

const ENDPOINT = isMainnet ? "wss://mainnet.portaldot.io" : "ws://127.0.0.1:9944";
const NETWORK = isMainnet ? "mainnet" : "local";

function loadContract(name: string): { abi: unknown; wasm: Buffer } {
  const base = join("contracts", name, "target", "ink");
  const abi = JSON.parse(readFileSync(join(base, `${name}.json`), "utf8"));
  const wasm = readFileSync(join(base, `${name}.wasm`));
  return { abi, wasm };
}

async function deployContract(
  api: ApiPromise,
  deployer: ReturnType<Keyring["addFromUri"]>,
  abi: unknown,
  wasm: Buffer,
  constructorArgs: unknown[],
  value = 0n
): Promise<string> {
  const code = new CodePromise(api, abi as string, wasm);
  return new Promise((resolve, reject) => {
    const tx = code.tx["new"](
      {
        gasLimit: api.registry.createType("WeightV2", { refTime: 100_000_000_000n, proofSize: 100_000n }),
        storageDepositLimit: null,
        value,
      },
      ...constructorArgs
    );
    tx.signAndSend(deployer, ({ status, events, contract }) => {
      if (status.isFinalized) {
        if (contract?.address) {
          resolve(contract.address.toString());
        } else {
          // Extract from Instantiated event
          for (const { event } of events) {
            if (event.method === "Instantiated") {
              resolve(event.data[1].toString());
              return;
            }
          }
          reject(new Error("Contract address not found in events"));
        }
      }
    }).catch(reject);
  });
}

async function main() {
  console.log(`Deploying to ${ENDPOINT}…`);
  const provider = new WsProvider(ENDPOINT);
  const api = await ApiPromise.create({ provider });
  await api.isReady;

  const keyring = new Keyring({ type: "sr25519" });
  const deployerSeed = process.env.DEPLOYER_SEED ?? "//Alice";
  const deployer = keyring.addFromUri(deployerSeed);
  console.log(`Deployer: ${deployer.address}`);

  // 1. Registry
  console.log("\n[1/6] Deploying Registry…");
  const registry = loadContract("registry");
  const registryAddress = await deployContract(api, deployer, registry.abi, registry.wasm, []);
  console.log(`  Registry: ${registryAddress}`);

  // 2. PublicResolver
  console.log("[2/6] Deploying PublicResolver…");
  const resolver = loadContract("resolver");
  const resolverAddress = await deployContract(api, deployer, resolver.abi, resolver.wasm, [registryAddress]);
  console.log(`  Resolver: ${resolverAddress}`);

  // 3. ReverseRegistrar
  console.log("[3/6] Deploying ReverseRegistrar…");
  const reverse = loadContract("reverse");
  const reverseAddress = await deployContract(api, deployer, reverse.abi, reverse.wasm, [registryAddress, resolverAddress]);
  console.log(`  ReverseRegistrar: ${reverseAddress}`);

  // 4. Registrar (for .pot TLD)
  //    base_node = namehash("pot")
  const potNode = Array.from(namehash("pot"));
  const REGISTRATION_PRICE = 10n ** 14n; // 1 POT
  const PERIOD_BLOCKS = 432_000;
  console.log("[4/6] Deploying Registrar…");
  const registrar = loadContract("registrar");
  const registrarAddress = await deployContract(
    api, deployer, registrar.abi, registrar.wasm,
    [registryAddress, potNode, REGISTRATION_PRICE, PERIOD_BLOCKS, deployer.address]
  );
  console.log(`  Registrar: ${registrarAddress}`);

  // 5. Attestation
  console.log("[5/6] Deploying Attestation…");
  const attestation = loadContract("attestation");
  const attestationAddress = await deployContract(api, deployer, attestation.abi, attestation.wasm, [registryAddress]);
  console.log(`  Attestation: ${attestationAddress}`);

  // 6. Wire up root setup:
  //    Registry.set_subnode_owner(zero_node, keccak256("pot"), registrar)
  console.log("[6/6] Wiring up root: set_subnode_owner(zero, keccak256(\"pot\"), registrar)…");
  const registryContract = new ContractPromise(api, registry.abi as string, registryAddress);
  const potLabelHash = Array.from(labelHash("pot"));
  await new Promise<void>((resolve, reject) => {
    registryContract.tx.setSubnodeOwner(
      { gasLimit: api.registry.createType("WeightV2", { refTime: 10_000_000_000n, proofSize: 10_000n }) },
      Array.from(new Uint8Array(32)),
      potLabelHash,
      registrarAddress
    ).signAndSend(deployer, ({ status }) => {
      if (status.isFinalized) resolve();
    }).catch(reject);
  });
  console.log("  Root wired.");

  // Write addresses to SDK constants
  const addresses = {
    registry: registryAddress,
    resolver: resolverAddress,
    reverseRegistrar: reverseAddress,
    registrar: registrarAddress,
    attestation: attestationAddress,
  };

  const constantsDir = join("packages", "sdk", "src", "constants");
  mkdirSync(constantsDir, { recursive: true });
  const outPath = join(constantsDir, `${NETWORK}.ts`);
  writeFileSync(
    outPath,
    `// Auto-generated by scripts/deploy.ts at ${new Date().toISOString()}\n` +
    `import type { ContractAddresses } from "../types.js";\n\n` +
    `export const ${NETWORK.toUpperCase()}_ADDRESSES: ContractAddresses = ${JSON.stringify(addresses, null, 2)};\n`
  );
  console.log(`\nAddresses written to ${outPath}`);
  console.log(JSON.stringify(addresses, null, 2));

  await api.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
