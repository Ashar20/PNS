"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { usePNSClient } from "../../../../hooks/usePNSClient";
import { useWallet } from "../../../../hooks/useWallet";
import { ROLE_TO_PROXY_TYPE } from "@pns/sdk";

const ROLES = Object.keys(ROLE_TO_PROXY_TYPE);

export default function InvitePage() {
  const { name } = useParams<{ name: string }>();
  const router = useRouter();
  const { client } = usePNSClient();
  const { selected } = useWallet();

  const [label, setLabel] = useState("");
  const [memberAddr, setMemberAddr] = useState("");
  const [role, setRole] = useState("voter");
  const [communityRegistrarAddr, setCommunityRegistrarAddr] = useState("");
  const [otherSignatory, setOtherSignatory] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "done" | "error">("idle");
  const [errMsg, setErrMsg] = useState("");

  const handleInvite = async () => {
    if (!client || !selected || !label || !memberAddr || !communityRegistrarAddr) return;
    setStatus("submitting");
    try {
      await client.issueSubname({
        communityRegistrarAddress: communityRegistrarAddr,
        parentName: `${name}.pot`,
        label,
        member: memberAddr,
        role,
        threshold: otherSignatory ? 2 : 1,
        otherSignatories: otherSignatory ? [otherSignatory] : [],
        firstSigner: selected as never,
      });
      setStatus("done");
      setTimeout(() => router.push(`/c/${name}`), 1500);
    } catch (e) {
      setErrMsg(String(e));
      setStatus("error");
    }
  };

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <h2 className="text-2xl font-bold text-neutral-100">
        Invite to <span className="text-violet-400">{name}.pot</span>
      </h2>

      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl px-5 py-4 text-xs text-neutral-500 space-y-1">
        <p>This transaction atomically:</p>
        <ol className="list-decimal list-inside space-y-0.5 text-neutral-400">
          <li>Calls <code>CommunityRegistrar.issue_subname</code> (contract)</li>
          <li>Calls <code>identity.setSubs</code> — subname appears in wallets natively</li>
          <li>Calls <code>proxy.addProxy</code> — grants the role-mapped proxy type</li>
        </ol>
        <p>Wrapped in <code>utility.batchAll</code> → <code>multisig.asMulti</code>. All or nothing.</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm text-neutral-400 mb-1">Subname label</label>
          <div className="flex items-center bg-neutral-800 border border-neutral-700 rounded-xl overflow-hidden">
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value.toLowerCase())}
              placeholder="alice"
              className="flex-1 bg-transparent px-4 py-2.5 text-neutral-100 outline-none"
            />
            <span className="px-3 text-neutral-500 text-sm">.{name}.pot</span>
          </div>
        </div>

        <div>
          <label className="block text-sm text-neutral-400 mb-1">Member address</label>
          <input
            type="text"
            value={memberAddr}
            onChange={(e) => setMemberAddr(e.target.value)}
            placeholder="SS58 address"
            className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2.5 text-sm font-mono text-neutral-200 outline-none focus:border-violet-600"
          />
        </div>

        <div>
          <label className="block text-sm text-neutral-400 mb-1">Role</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2.5 text-sm text-neutral-100"
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r} → proxy: {ROLE_TO_PROXY_TYPE[r]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm text-neutral-400 mb-1">
            Community Registrar contract address
          </label>
          <input
            type="text"
            value={communityRegistrarAddr}
            onChange={(e) => setCommunityRegistrarAddr(e.target.value)}
            placeholder="Contract address"
            className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2.5 text-sm font-mono text-neutral-200 outline-none focus:border-violet-600"
          />
        </div>

        <div>
          <label className="block text-sm text-neutral-400 mb-1">
            Other co-signer (leave blank for single-signer)
          </label>
          <input
            type="text"
            value={otherSignatory}
            onChange={(e) => setOtherSignatory(e.target.value)}
            placeholder="Second signer SS58 address"
            className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2.5 text-sm font-mono text-neutral-200 outline-none focus:border-violet-600"
          />
        </div>

        <button
          onClick={handleInvite}
          disabled={status === "submitting" || !label || !memberAddr || !communityRegistrarAddr}
          className="w-full py-3 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white font-semibold rounded-xl transition-colors"
        >
          {status === "submitting" ? "Waiting for signature…" : "Issue Subname"}
        </button>

        {status === "done" && (
          <div className="bg-green-900/20 border border-green-800 rounded-xl px-4 py-3 text-sm text-green-300">
            Subname issued. Redirecting…
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
