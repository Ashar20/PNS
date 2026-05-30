"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { Avatar } from "./Avatar";
import { WalletConnect } from "./WalletConnect";
import { usePNSClient } from "../hooks/usePNSClient";
import { useWallet } from "../hooks/useWallet";
import { namehash, normaliseName, recordExists, REGISTRATION_PRICE } from "@pns/sdk";

export function NameResultCard({ query }: { query: string }) {
  const { client } = usePNSClient();
  const { selected } = useWallet();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<"idle" | "claiming" | "done" | "error">("idle");
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const { data: exists, isLoading } = useQuery({
    queryKey: ["availability", query],
    queryFn: async () => {
      if (!client || !query) return false;
      const node = namehash(normaliseName(query));
      const caller = client.api.registry.createType("AccountId", new Uint8Array(32)).toString();
      const abis = (client as unknown as { abis: Record<string, unknown> }).abis;
      return recordExists(client.api, client.addresses.registry, abis.registry, node, caller);
    },
    enabled: !!client && !!query,
    staleTime: 0,
  });

  if (!query) return null;
  if (isLoading) {
    return (
      <div className="card px-6 py-5 text-center">
        <p className="text-[13px] text-[var(--muted)]">
          Checking <span className="font-mono text-[var(--text)]">{query}</span>…
        </p>
      </div>
    );
  }

  const label = query.replace(/\.pot$/, "");
  const available = !exists;

  const handleClaim = async () => {
    if (!client || !selected) return;
    setStatus("claiming");
    setErrMsg(null);
    try {
      if (selected.source === "dev" && selected.signer) {
        const result = await client.registerName(label, selected.address, selected.signer);
        setTxHash(result.blockHash ?? null);
        setStatus("done");
        await queryClient.invalidateQueries({ queryKey: ["availability", query] });
        setTimeout(() => router.push(`/${query}`), 1500);
        return;
      }
      const { web3FromAddress } = await import("@polkadot/extension-dapp");
      const injector = await web3FromAddress(selected.address);
      const { ContractPromise } = await import("@polkadot/api-contract");
      const abis = (client as unknown as { abis: Record<string, unknown> }).abis;
      const contract = new ContractPromise(client.api, abis.registrar as string, client.addresses.registrar);
      const gasLimit = client.api.registry.createType("WeightV2", { refTime: 30_000_000_000n, proofSize: 524_288n }) as unknown as bigint;
      const tx = contract.tx.register(
        { gasLimit, value: REGISTRATION_PRICE, storageDepositLimit: null },
        label,
        selected.address
      );
      await new Promise<void>((resolve, reject) => {
        tx.signAndSend(selected.address, { signer: injector.signer }, (r) => {
          if (r.status.isFinalized) {
            const failed = r.events.some(({ event }) => event.section === "system" && event.method === "ExtrinsicFailed");
            if (failed) reject(new Error("Extrinsic failed on-chain"));
            else { setTxHash(r.status.asFinalized.toHex()); queryClient.invalidateQueries({ queryKey: ["availability", query] }); resolve(); }
          }
        }).catch(reject);
      });
      setStatus("done");
      setTimeout(() => router.push(`/${query}`), 1500);
    } catch (e) {
      setErrMsg(String(e).replace("Error: ", ""));
      setStatus("error");
    }
  };

  return (
    <div className="card overflow-hidden">
      <div className="px-6 py-5 flex items-center gap-5">
        <Avatar seed={query} size={56} />
        <div className="flex-1 min-w-0">
          <p className="text-[20px] font-mono font-semibold text-[var(--text)] truncate leading-tight">
            {query}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span
              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[12px] font-medium ${
                available
                  ? "bg-[var(--success)]/10 text-[var(--success)] border border-[var(--success)]/25"
                  : "bg-[var(--error)]/10 text-[var(--error)] border border-[var(--error)]/25"
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${available ? "bg-[var(--success)]" : "bg-[var(--error)]"}`} />
              {available ? "Available" : "Registered"}
            </span>
            {available && (
              <span className="text-[12px] text-[var(--muted)]">· 1 POT / ~30 days</span>
            )}
          </div>
        </div>
        {!available && (
          <Link
            href={`/${query}`}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-[var(--surface)] border border-[var(--border)] hover:bg-[var(--paper)] text-[var(--text)] text-[13px] font-medium rounded-2xl transition-colors"
          >
            View Profile →
          </Link>
        )}
      </div>

      {available && (
        <div className="border-t border-[var(--border)] bg-[var(--paper)]/60 px-6 py-5">
          {status === "done" ? (
            <div className="flex items-center gap-3 text-[14px]">
              <span className="w-6 h-6 rounded-full bg-[var(--success)] text-white flex items-center justify-center text-[12px]">✓</span>
              <div>
                <p className="font-semibold text-[var(--success)]">Registered.</p>
                {txHash && <p className="text-[11px] text-[var(--muted)] font-mono mt-0.5">Block: {txHash.slice(0, 22)}…</p>}
                <p className="text-[11px] text-[var(--muted)] mt-0.5">Redirecting to profile…</p>
              </div>
            </div>
          ) : !selected ? (
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[13px] text-[var(--text-2)] font-medium">
                  Connect a wallet to claim this name.
                </p>
                <p className="text-[12px] text-[var(--muted)] mt-0.5">
                  1 POT registration fee · ~30 day duration · <code className="font-mono text-[var(--accent)]">Registrar.register</code>
                </p>
              </div>
              <WalletConnect />
            </div>
          ) : (
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[13px] text-[var(--text-2)]">
                  Registering as{" "}
                  <span className="text-[var(--text)] font-mono">
                    {selected.name ?? selected.address.slice(0, 16) + "…"}
                  </span>
                  {selected.source === "dev" && (
                    <span className="ml-1.5 text-[10px] uppercase tracking-wider text-[var(--accent)] font-semibold">dev</span>
                  )}
                </p>
                <p className="text-[12px] text-[var(--muted)] mt-0.5">
                  Pay <strong className="text-[var(--text)]">1 POT</strong> · valid for ~30 days · <code className="font-mono text-[var(--accent)]">Registrar.register</code>
                </p>
              </div>
              <button
                onClick={handleClaim}
                disabled={status === "claiming"}
                className="shrink-0 inline-flex items-center gap-1.5 px-6 py-3 bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-50 text-white text-[13px] font-semibold uppercase tracking-wider rounded-2xl transition-colors shadow-[0_2px_0_rgba(0,80,120,0.18)]"
              >
                {status === "claiming" ? (
                  <>
                    <span className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    Signing…
                  </>
                ) : (
                  <>
                    Claim {query}
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                      <path d="M5 12h14M13 5l7 7-7 7" />
                    </svg>
                  </>
                )}
              </button>
            </div>
          )}

          {status === "error" && errMsg && (
            <p className="mt-3 text-[12px] text-[var(--error)] border border-[var(--error)]/25 bg-[var(--error)]/8 rounded-lg px-3 py-2">
              {errMsg}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
