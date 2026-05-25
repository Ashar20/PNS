"use client";

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
      <h2 className="text-2xl font-bold text-neutral-100">Create a Community</h2>

      <div className="space-y-5">
        <div>
          <label className="block text-sm text-neutral-400 mb-1">Community name</label>
          <div className="flex items-center bg-neutral-800 border border-neutral-700 rounded-xl overflow-hidden">
            <input
              type="text"
              value={parentLabel}
              onChange={(e) => setParentLabel(e.target.value.toLowerCase())}
              placeholder="bandit-dao"
              className="flex-1 bg-transparent px-4 py-3 text-neutral-100 outline-none"
            />
            <span className="px-4 text-neutral-400">.pot</span>
          </div>
        </div>

        <div>
          <label className="block text-sm text-neutral-400 mb-2">Signers</label>
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
                className="flex-1 bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm font-mono text-neutral-200 outline-none focus:border-violet-600"
              />
              {signers.length > 2 && (
                <button
                  onClick={() => setSigners(signers.filter((_, j) => j !== i))}
                  className="text-red-500 hover:text-red-400 text-sm px-2"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
          <button
            onClick={() => setSigners([...signers, ""])}
            className="text-sm text-violet-400 hover:text-violet-300"
          >
            + Add signer
          </button>
        </div>

        <div>
          <label className="block text-sm text-neutral-400 mb-1">
            Threshold (require {threshold} of {validSigners.length} signers)
          </label>
          <input
            type="range"
            min={1}
            max={Math.max(validSigners.length, 1)}
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
            className="w-full accent-violet-600"
          />
        </div>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={openMembership}
            onChange={(e) => setOpenMembership(e.target.checked)}
            className="accent-violet-600 w-4 h-4"
          />
          <span className="text-sm text-neutral-300">Open membership (anyone can claim a subname)</span>
        </label>

        {derivedMultisig && (
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3">
            <p className="text-xs text-neutral-500">Multisig account (deterministic)</p>
            <p className="font-mono text-xs text-neutral-300 mt-1 break-all">{derivedMultisig}</p>
            <p className="text-xs text-neutral-600 mt-2">
              Fund this account with at least 1 POT before creating the community.
            </p>
          </div>
        )}

        <button
          onClick={handleCreate}
          disabled={status === "creating" || !parentLabel || validSigners.length < 2}
          className="w-full py-3 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white font-semibold rounded-xl transition-colors"
        >
          {status === "creating" ? "Creating…" : "Create Community"}
        </button>

        {status === "done" && multisigAddr && (
          <div className="bg-green-900/20 border border-green-800 rounded-xl px-4 py-3 text-sm text-green-300 space-y-1">
            <p>Community created.</p>
            <p>Multisig: <code className="font-mono text-xs">{multisigAddr.slice(0, 20)}…</code></p>
            <p>Next: fund the multisig, then register <strong>{parentLabel}.pot</strong> to it.</p>
          </div>
        )}
        {status === "error" && (
          <div className="bg-red-900/20 border border-red-800 rounded-xl px-4 py-3 text-sm text-red-300">
            {errMsg}
          </div>
        )}
      </div>
    </div>
  );
}
