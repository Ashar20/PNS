"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { usePNSClient } from "../../../hooks/usePNSClient";
import { useWallet } from "../../../hooks/useWallet";
import { WalletConnect } from "../../../components/WalletConnect";

export default function ClaimPage() {
  const { label } = useParams<{ label: string }>();
  const router = useRouter();
  const { client } = usePNSClient();
  const { selected } = useWallet();
  const [status, setStatus] = useState<"idle" | "claiming" | "done" | "error">("idle");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const name = `${label}.pot`;

  const handleClaim = async () => {
    if (!client || !selected) return;
    setStatus("claiming");
    try {
      const { web3FromAddress } = await import("@polkadot/extension-dapp");
      const injector = await web3FromAddress(selected.address);
      // Build a signer-compatible KeyringPair from the extension injector
      // @polkadot/api supports InjectedSigner via signAndSend
      const result = await client.api.tx.contracts
        .call(
          client.addresses.registrar ?? "",
          0,
          { refTime: 10_000_000_000n, proofSize: 10_000n },
          null,
          []
        )
        .signAndSend(selected.address, { signer: injector.signer }, (r) => {
          if (r.status.isFinalized) {
            setTxHash(r.status.asFinalized.toHex());
            setStatus("done");
            setTimeout(() => router.push(`/${name}`), 2000);
          }
        });
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
          Register this name on Portaldot for 1 POT per year.
          Your name will appear in Polkadot.js apps natively.
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
          This transaction also calls <code className="bg-neutral-800 px-1 rounded">identity.setIdentity</code> to
          set your display name natively in the Substrate identity pallet.
        </p>
      </div>

      {!selected ? (
        <div className="space-y-3">
          <p className="text-sm text-neutral-400">Connect your wallet to proceed.</p>
          <WalletConnect />
        </div>
      ) : (
        <button
          onClick={handleClaim}
          disabled={status === "claiming" || !client}
          className="w-full py-4 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white font-semibold rounded-xl transition-colors"
        >
          {status === "claiming" ? "Waiting for signature…" : `Claim ${name}`}
        </button>
      )}

      {status === "done" && txHash && (
        <div className="bg-green-900/20 border border-green-800 rounded-xl px-4 py-3 text-sm text-green-300">
          Success! Block: <code className="font-mono text-xs">{txHash.slice(0, 20)}…</code>
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
