"use client";

export const dynamic = "force-dynamic";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { usePNSClient } from "../../../hooks/usePNSClient";
import { useWallet } from "../../../hooks/useWallet";
import { WalletConnect } from "../../../components/WalletConnect";
import { namehash, normaliseName, recordExists } from "@pns/sdk";

export default function ClaimPage() {
  const { label } = useParams<{ label: string }>();
  const router = useRouter();
  const { client, isConnecting } = usePNSClient();
  const { selected } = useWallet();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<"idle" | "claiming" | "done" | "error">("idle");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const name = `${label}.pot`;

  const { data: alreadyExists, isLoading: checkingAvailability } = useQuery({
    queryKey: ["availability", label],
    queryFn: async () => {
      const node = namehash(normaliseName(name));
      const caller = client!.api.registry.createType("AccountId", new Uint8Array(32)).toString();
      const abis = (client as unknown as { abis: Record<string, unknown> }).abis;
      return recordExists(client!.api, client!.addresses.registry, abis.registry, node, caller);
    },
    enabled: !!client,
    // always re-check; don't serve stale "available" from cache
    staleTime: 0,
  });

  const handleClaim = async () => {
    if (!client || !selected) return;
    setStatus("claiming");
    setErrorMsg(null);
    try {
      let result;
      if (selected.source === "dev" && selected.signer) {
        result = await client.registerName(label, selected.address, selected.signer);
      } else {
        const { web3FromAddress } = await import("@polkadot/extension-dapp");
        const injector = await web3FromAddress(selected.address);
        // Build a pseudo-signer that wraps the extension injector
        const { Keyring } = await import("@polkadot/keyring");
        // For extension accounts we need to use signAndSend with injector directly
        const { ContractPromise } = await import("@polkadot/api-contract");
        const abis = (client as unknown as { abis: Record<string, unknown> }).abis;
        const contract = new ContractPromise(client.api, abis.registrar as string, client.addresses.registrar);
        const gasLimit = client.api.registry.createType("WeightV2", { refTime: 30_000_000_000n, proofSize: 524_288n }) as unknown as bigint;
        const { REGISTRATION_PRICE } = await import("@pns/sdk");
        const tx = contract.tx.register(
          { gasLimit, value: REGISTRATION_PRICE, storageDepositLimit: null },
          label,
          selected.address
        );
        await new Promise<void>((resolve, reject) => {
          tx.signAndSend(selected.address, { signer: injector.signer }, (r) => {
            if (r.status.isFinalized) {
              const failed = r.events.some(({ event }) =>
                event.section === "system" && event.method === "ExtrinsicFailed"
              );
              if (failed) reject(new Error("Extrinsic failed on-chain"));
              else { setTxHash(r.status.asFinalized.toHex()); queryClient.invalidateQueries({ queryKey: ["availability", label] }); resolve(); }
            }
          }).catch(reject);
        });
        setStatus("done");
        setTimeout(() => router.push(`/${name}`), 2000);
        return;
      }
      setTxHash(result.blockHash ?? null);
      setStatus("done");
      await queryClient.invalidateQueries({ queryKey: ["availability", label] });
      setTimeout(() => router.push(`/${name}`), 2000);
    } catch (e) {
      setErrorMsg(String(e));
      setStatus("error");
    }
  };

  return (
    <div className="max-w-lg mx-auto space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-neutral-100">Claim {name}</h2>
        <p className="text-neutral-400 mt-2">
          Register this name on Portaldot for 1 POT. Your name will appear natively in Polkadot.js apps.
        </p>
      </div>

      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl px-6 py-5 space-y-4">
        <div className="flex justify-between text-sm">
          <span className="text-neutral-400">Name</span>
          <span className="text-neutral-100 font-mono">{name}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-neutral-400">Registration fee</span>
          <span className="text-neutral-100">1 POT</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-neutral-400">Duration</span>
          <span className="text-neutral-100">~30 days (432,000 blocks)</span>
        </div>
        <hr className="border-neutral-700" />
        <p className="text-xs text-neutral-500">
          This calls <code className="bg-neutral-800 px-1 rounded">Registrar.register</code> on-chain,
          which sets the owner in the Registry contract.
        </p>
      </div>

      {isConnecting || checkingAvailability ? (
        <p className="text-sm text-neutral-500">Checking availability…</p>
      ) : alreadyExists ? (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl px-6 py-5 space-y-3">
          <p className="text-red-400 font-semibold">This name is already registered.</p>
          <Link
            href={`/${name}`}
            className="inline-block px-5 py-2.5 bg-neutral-700 hover:bg-neutral-600 text-neutral-200 font-medium rounded-xl transition-colors"
          >
            View Profile →
          </Link>
        </div>
      ) : !selected ? (
        <div className="space-y-3">
          <p className="text-sm text-neutral-400">Connect your wallet to proceed.</p>
          <WalletConnect />
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-neutral-400">
            Registering as: <span className="text-neutral-200 font-mono">{selected.name ?? selected.address.slice(0, 16) + "…"}</span>
            {selected.source === "dev" && <span className="ml-2 text-xs text-violet-400">(dev)</span>}
          </p>
          <button
            onClick={handleClaim}
            disabled={status === "claiming" || !client}
            className="w-full py-4 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white font-semibold rounded-xl transition-colors"
          >
            {status === "claiming" ? "Waiting for confirmation…" : `Claim ${name}`}
          </button>
        </div>
      )}

      {status === "done" && txHash && (
        <div className="bg-green-900/20 border border-green-800 rounded-xl px-4 py-3 text-sm text-green-300">
          Registered! Block: <code className="font-mono text-xs">{txHash.slice(0, 20)}…</code>
          <br />Redirecting to your profile…
        </div>
      )}

      {status === "error" && errorMsg && (
        <div className="bg-red-900/20 border border-red-800 rounded-xl px-4 py-3 text-sm text-red-300">
          {errorMsg}
        </div>
      )}
    </div>
  );
}
