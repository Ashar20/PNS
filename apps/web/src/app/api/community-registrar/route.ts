import { NextResponse } from "next/server";
import { ApiPromise, WsProvider, Keyring } from "@polkadot/api";
import { CodePromise } from "@polkadot/api-contract";
import { readFileSync } from "fs";
import { namehash, normaliseName } from "@pns/sdk";
import { findRepoRoot, communityArtifactPaths } from "../../../lib/repo-root";
import { serverChainConfig } from "../../../lib/chain-config";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { parentName, ownerAddress } = (await req.json()) as {
      parentName: string;
      ownerAddress: string;
      deployerSeed?: string;
    };

    if (!parentName || !ownerAddress) {
      return NextResponse.json({ error: "parentName and ownerAddress required" }, { status: 400 });
    }

    const { wsEndpoint, addresses, deployerSeed } = serverChainConfig();
    if (!addresses.registry) {
      return NextResponse.json(
        { error: "Registry address not configured (set NEXT_PUBLIC_REGISTRY_ADDRESS or deploy local)" },
        { status: 500 }
      );
    }

    const root = findRepoRoot();
    const { abiPath, wasmPath } = communityArtifactPaths(root);
    const abi = JSON.parse(readFileSync(abiPath, "utf8"));
    const wasm = readFileSync(wasmPath);

    const api = await ApiPromise.create({ provider: new WsProvider(wsEndpoint) });
    await api.isReady;

    const keyring = new Keyring({ type: "sr25519" });
    const deployer = keyring.addFromUri(deployerSeed);
    const parentNode = namehash(normaliseName(parentName));
    const gas = api.registry.createType("WeightV2", {
      refTime: 100_000_000_000n,
      proofSize: 131_072n,
    });

    const code = new CodePromise(api, abi, wasm);
    const address = await new Promise<string>((resolve, reject) => {
      code.tx
        .new(
          { gasLimit: gas as unknown as bigint, storageDepositLimit: null },
          addresses.registry,
          Array.from(parentNode),
          ownerAddress,
          false
        )
        .signAndSend(deployer, (result) => {
          if (!result.status.isFinalized) return;
          const contract = (result as { contract?: { address: string } }).contract;
          if (contract?.address) {
            resolve(contract.address.toString());
            return;
          }
          for (const { event } of result.events) {
            if (event.method === "Instantiated") {
              resolve(event.data[1].toString());
              return;
            }
          }
          reject(new Error("Instantiate failed"));
        })
        .catch(reject);
    });

    await api.disconnect();
    return NextResponse.json({ address });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
