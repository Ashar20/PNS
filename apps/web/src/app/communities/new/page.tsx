"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { usePNSClient } from "../../../hooks/usePNSClient";
import { useWallet } from "../../../hooks/useWallet";
import { deriveMultisigAddress } from "@pns/sdk";

export default function NewCommunityPage() {
  const router = useRouter();
  const { client } = usePNSClient();
  const { selected } = useWallet();

  const [parentLabel, setParentLabel] = useState("");
  const [signers, setSigners] = useState<string[]>([selected?.address ?? "", ""]);
  const [threshold, setThreshold] = useState(2);
  const [openMembership, setOpenMembership] = useState(false);
  const [status, setStatus] = useState<"idle" | "creating" | "done" | "error">("idle");
  const [multisigAddr, setMultisigAddr] = useState<string | null>(null);
  const [errMsg, setErrMsg] = useState("");

  const validSigners = signers.filter((s) => s.trim() !== "");
  const derivedMultisig =
    validSigners.length >= 2
      ? (() => { try { return deriveMultisigAddress(validSigners, threshold); } catch { return null; } })()
      : null;

  const handleCreate = async () => {
    if (!client || !selected || validSigners.length < 2) return;
    setStatus("creating");
    try {
      const handle = await client.createCommunity({
        parentLabel,
        signers: validSigners,
        threshold,
        openMembership,
        firstSigner: selected as never,
      });
      setMultisigAddr(handle.multisigAddress);
      setStatus("done");
    } catch (e) {
      setErrMsg(String(e));
      setStatus("error");
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-8">
      <h2 className="text-2xl font-bold text-[var(--text)]">Create a Community</h2>

      <div className="space-y-5">
        <div>
          <label className="block text-sm text-[var(--muted)] mb-1">Community name</label>
          <div className="flex items-center bg-[var(--paper)] border border-[var(--border)] rounded-xl overflow-hidden">
            <input
              type="text"
              value={parentLabel}
              onChange={(e) => setParentLabel(e.target.value.toLowerCase())}
              placeholder="bandit-dao"
              className="flex-1 bg-transparent px-4 py-3 text-[var(--text)] outline-none"
            />
            <span className="px-4 text-[var(--muted)]">.pot</span>
          </div>
        </div>

        <div>
          <label className="block text-sm text-[var(--muted)] mb-2">Signers</label>
          {signers.map((s, i) => (
            <div key={i} className="flex gap-2 mb-2">
              <input
                type="text"
                value={s}
                onChange={(e) => {
                  const copy = [...signers];
                  copy[i] = e.target.value;
                  setSigners(copy);
                }}
                placeholder={`Signer ${i + 1} (SS58 address)`}
                className="flex-1 bg-[var(--paper)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm font-mono text-[var(--text)] outline-none focus:border-[var(--accent)]"
              />
              {signers.length > 2 && (
                <button
                  onClick={() => setSigners(signers.filter((_, j) => j !== i))}
                  className="text-[var(--error)] hover:text-[var(--error)] text-sm px-2"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
          <button
            onClick={() => setSigners([...signers, ""])}
            className="text-sm text-[var(--accent)] hover:text-[var(--accent)]"
          >
            + Add signer
          </button>
        </div>

        <div>
          <label className="block text-sm text-[var(--muted)] mb-1">
            Threshold (require {threshold} of {validSigners.length} signers)
          </label>
          <input
            type="range"
            min={1}
            max={Math.max(validSigners.length, 1)}
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
            className="w-full accent-[var(--accent)]"
          />
        </div>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={openMembership}
            onChange={(e) => setOpenMembership(e.target.checked)}
            className="accent-[var(--accent)] w-4 h-4"
          />
          <span className="text-sm text-[var(--text-2)]">Open membership (anyone can claim a subname)</span>
        </label>

        {derivedMultisig && (
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-3">
            <p className="text-xs text-[var(--muted)]">Multisig account (deterministic)</p>
            <p className="font-mono text-xs text-[var(--text-2)] mt-1 break-all">{derivedMultisig}</p>
            <p className="text-xs text-[var(--muted)] mt-2">
              Fund this account with at least 1 POT before creating the community.
            </p>
          </div>
        )}

        <button
          onClick={handleCreate}
          disabled={status === "creating" || !parentLabel || validSigners.length < 2}
          className="w-full py-3 bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-40 text-white font-semibold rounded-xl transition-colors"
        >
          {status === "creating" ? "Creating…" : "Create Community"}
        </button>

        {status === "done" && multisigAddr && (
          <div className="bg-[var(--success)]/10 border border-[var(--success)]/25 rounded-xl px-4 py-3 text-sm text-[var(--success)] space-y-1">
            <p>Community created.</p>
            <p>Multisig: <code className="font-mono text-xs">{multisigAddr.slice(0, 20)}…</code></p>
            <p>Next: fund the multisig, then register <strong>{parentLabel}.pot</strong> to it.</p>
          </div>
        )}
        {status === "error" && (
          <div className="bg-[var(--error)]/10 border border-[var(--error)]/25 rounded-xl px-4 py-3 text-sm text-[var(--error)]">
            {errMsg}
          </div>
        )}
      </div>
    </div>
  );
}
