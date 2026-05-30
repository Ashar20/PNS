import { NextResponse } from "next/server";
import { ApiPromise, WsProvider, Keyring } from "@polkadot/api";
import { CodePromise } from "@polkadot/api-contract";
import { readFileSync } from "fs";
import { namehash, normaliseName } from "@pns/sdk";
import { LOCAL_ADDRESSES, LOCAL_WS } from "@pns/sdk";
import { findRepoRoot, communityArtifactPaths } from "../../../lib/repo-root";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { parentName, ownerAddress, deployerSeed } = (await req.json()) as {
      parentName: string;
      ownerAddress: string;
      deployerSeed?: string;
    };

    if (!parentName || !ownerAddress) {
      return NextResponse.json({ error: "parentName and ownerAddress required" }, { status: 400 });
    }

    const root = findRepoRoot();
    const { abiPath, wasmPath } = communityArtifactPaths(root);
    const abi = JSON.parse(readFileSync(abiPath, "utf8"));
    const wasm = readFileSync(wasmPath);

    const api = await ApiPromise.create({ provider: new WsProvider(LOCAL_WS) });
    await api.isReady;

    const keyring = new Keyring({ type: "sr25519" });
    const deployer = keyring.addFromUri(deployerSeed ?? "//Alice");
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
          LOCAL_ADDRESSES.registry,
          Array.from(parentNode),
          ownerAddress,
          false
        )
        .signAndSend(deployer, ({ status, events, contract }) => {
          if (!status.isFinalized) return;
          if (contract?.address) {
            resolve(contract.address.toString());
            return;
          }
          for (const { event } of events) {
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
