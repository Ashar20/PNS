"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { usePNSClient } from "../hooks/usePNSClient";
import { useWallet } from "../hooks/useWallet";
import {
  ROLE_TO_PROXY_TYPE,
  buildApproveCommunityRegistrarTx,
  buildPersistRegistrarMetaTx,
  planIssueSubnameAsOwner,
  isApprovedForAll,
} from "@pns/sdk";
import { signAndSendTx } from "../lib/signer";

const ROLES = Object.keys(ROLE_TO_PROXY_TYPE);

interface SubnamesPanelProps {
  parentName: string;
  ownerAddress: string;
  isOwner: boolean;
}

export function SubnamesPanel({ parentName, ownerAddress, isOwner }: SubnamesPanelProps) {
  const { client } = usePNSClient();
  const { selected } = useWallet();
  const queryClient = useQueryClient();

  const [label, setLabel] = useState("");
  const [memberAddr, setMemberAddr] = useState("");
  const [role, setRole] = useState("voter");
  const [status, setStatus] = useState<"idle" | "enabling" | "minting" | "done" | "error">("idle");
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const abis = client ? (client as unknown as { abis: Record<string, unknown> }).abis : null;

  const { data: registrarAddr, refetch: refetchRegistrar } = useQuery({
    queryKey: ["community-registrar", parentName],
    queryFn: () => client!.getCommunityRegistrar(parentName, ownerAddress),
    enabled: !!client,
  });

  const { data: registrarApproved, refetch: refetchApproval } = useQuery({
    queryKey: ["registrar-approved", parentName, registrarAddr, ownerAddress],
    queryFn: async () => {
      return isApprovedForAll(
        client!.api,
        client!.addresses.registry,
        abis!.registry,
        ownerAddress,
        registrarAddr!,
        ownerAddress
      );
    },
    enabled: !!client && !!abis && !!registrarAddr,
  });

  const { data: members = [], isLoading, refetch: refetchMembers } = useQuery({
    queryKey: ["subnames", parentName, ownerAddress, registrarAddr],
    queryFn: () => client!.listSubnames(parentName, ownerAddress),
    enabled: !!client,
  });

  const enableSubnames = async () => {
    if (!client || !selected || !abis) {
      setErrMsg("Connect a wallet to enable subnames.");
      setStatus("error");
      return;
    }
    setStatus("enabling");
    setErrMsg(null);
    try {
      const res = await fetch("/api/community-registrar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parentName,
          ownerAddress: selected.address,
        }),
      });
      const json = (await res.json()) as { address?: string; error?: string };
      if (!res.ok || !json.address) {
        throw new Error(json.error ?? "Deploy failed");
      }
      const tx = buildPersistRegistrarMetaTx(client.api, {
        parentName,
        registryAddress: client.addresses.registry,
        registryAbi: abis.registry,
        resolverAddress: client.addresses.resolver,
        resolverAbi: abis.resolver,
        registrarAddress: json.address,
        index: [],
      });
      await signAndSendTx(tx, selected);
      await refetchRegistrar();
      setStatus("idle");
    } catch (e) {
      setErrMsg(String(e).replace("Error: ", ""));
      setStatus("error");
    }
  };

  const approveRegistrar = async () => {
    if (!client || !registrarAddr || !selected || !abis) {
      setErrMsg("Connect a wallet to approve the registrar.");
      setStatus("error");
      return;
    }
    setStatus("enabling");
    setErrMsg(null);
    try {
      const tx = buildApproveCommunityRegistrarTx(client.api, {
        registryAddress: client.addresses.registry,
        registryAbi: abis.registry,
        registrarAddress: registrarAddr,
      });
      await signAndSendTx(tx, selected);
      await refetchApproval();
      setStatus("idle");
    } catch (e) {
      setErrMsg(String(e).replace("Error: ", ""));
      setStatus("error");
    }
  };

  const mintSubname = async () => {
    if (!client || !registrarAddr || !selected || !abis) {
      setErrMsg("Connect a wallet to mint subnames.");
      setStatus("error");
      return;
    }
    if (!label.trim() || !memberAddr.trim()) {
      setErrMsg("Label and member address are required.");
      setStatus("error");
      return;
    }
    setStatus("minting");
    setErrMsg(null);
    try {
      if (registrarApproved === false) {
        const approveTx = buildApproveCommunityRegistrarTx(client.api, {
          registryAddress: client.addresses.registry,
          registryAbi: abis.registry,
          registrarAddress: registrarAddr,
        });
        await signAndSendTx(approveTx, selected);
        await refetchApproval();
      }
      const txs = await planIssueSubnameAsOwner(client.api, {
        registryAddress: client.addresses.registry,
        registryAbi: abis.registry,
        parentName,
        label: label.trim().toLowerCase(),
        member: memberAddr.trim(),
        role,
        communityRegistrarAddress: registrarAddr,
        communityAbi: abis.community,
        resolverAddress: client.addresses.resolver,
        resolverAbi: abis.resolver,
        ownerAddress: selected.address,
      });
      for (const tx of txs) {
        await signAndSendTx(tx, selected);
      }
      setLabel("");
      setMemberAddr("");
      setStatus("done");
      await Promise.all([
        refetchMembers(),
        queryClient.invalidateQueries({ queryKey: ["profile", parentName] }),
      ]);
      setTimeout(() => setStatus("idle"), 2000);
    } catch (e) {
      setErrMsg(String(e).replace("Error: ", ""));
      setStatus("error");
    }
  };

  if (!isOwner) {
    return (
      <div className="card p-8 text-center text-[14px] text-[var(--muted)]">
        Only the name owner can issue subnames under <span className="font-mono text-[var(--text)]">{parentName}</span>.
        {members.length > 0 && (
          <ul className="mt-6 text-left space-y-2">
            {members.map((m) => (
              <li key={m.subname} className="font-mono text-[13px] text-[var(--text-2)]">
                <Link href={`/${m.subname}`} className="text-[var(--accent)] hover:underline">
                  {m.subname}
                </Link>
                {" · "}
                {m.role}
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  if (!registrarAddr) {
    return (
      <div className="card p-8 space-y-4">
        <p className="text-[14px] text-[var(--text-2)]">
          Enable subnames to mint <span className="font-mono">alice.{parentName}</span> style names.
          This deploys a <code className="font-mono text-[var(--accent)]">CommunityRegistrar</code> for your
          name and stores its address on your resolver.
        </p>
        <button
          onClick={enableSubnames}
          disabled={status === "enabling" || !selected}
          className="px-5 py-2.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-40 text-white font-semibold rounded-xl text-[13px] uppercase tracking-wider"
        >
          {status === "enabling" ? "Deploying…" : "Enable subnames"}
        </button>
        {errMsg && (
          <p className="text-[12px] text-[var(--error)] border border-[var(--error)]/25 rounded-lg px-3 py-2">
            {errMsg}
          </p>
        )}
      </div>
    );
  }

  const inputBase =
    "w-full bg-[var(--paper)] border border-[var(--border)] rounded-xl px-3.5 py-2.5 text-[14px] text-[var(--text)] outline-none focus:border-[var(--accent)]";

  return (
    <div className="space-y-6">
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between">
          <h2 className="text-[15px] font-semibold">Members</h2>
          <span className="text-[12px] text-[var(--muted)] font-mono">
            {isLoading ? "…" : members.length} subname{members.length === 1 ? "" : "s"}
          </span>
        </div>
        <div className="divide-y divide-[var(--border)]">
          {members.length === 0 ? (
            <p className="px-6 py-10 text-center text-[14px] text-[var(--muted)]">No subnames yet.</p>
          ) : (
            members.map((m) => (
              <div key={m.subname} className="px-6 py-4 flex items-center justify-between gap-4">
                <div>
                  <Link
                    href={`/${m.subname}`}
                    className="font-mono text-[15px] font-semibold text-[var(--accent)] hover:underline"
                  >
                    {m.subname}
                  </Link>
                  <p className="text-[12px] text-[var(--muted)] mt-1">
                    {m.role} · <span className="font-mono">{m.account.slice(0, 14)}…</span>
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="card p-6 space-y-4">
        {registrarApproved === false && (
          <div className="rounded-xl border border-[var(--warning)]/30 bg-[var(--warning)]/10 px-4 py-3 space-y-2">
            <p className="text-[13px] text-[var(--text-2)]">
              The registrar must be approved on the Registry before it can create subnames.
            </p>
            <button
              type="button"
              onClick={approveRegistrar}
              disabled={status === "enabling"}
              className="text-[12px] font-semibold text-[var(--accent)] hover:underline"
            >
              Approve registrar →
            </button>
          </div>
        )}

        <div>
          <h3 className="text-[15px] font-semibold text-[var(--text)]">Mint subname</h3>
          <p className="text-[12px] text-[var(--muted)] mt-1">
            One <code className="font-mono">utility.batchAll</code>:{" "}
            <code className="font-mono">issue_subname</code>
            {abis && " (+ identity / proxy when the chain supports them)"}
          </p>
        </div>

        <div>
          <label className="text-[12px] text-[var(--muted)] mb-1 block">Label</label>
          <div className="flex items-center bg-[var(--paper)] border border-[var(--border)] rounded-xl overflow-hidden">
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value.toLowerCase())}
              placeholder="alice"
              className="flex-1 bg-transparent px-3.5 py-2.5 font-mono outline-none"
            />
            <span className="px-3 text-[13px] text-[var(--muted)]">.{parentName}</span>
          </div>
        </div>

        <div>
          <label className="text-[12px] text-[var(--muted)] mb-1 block">Member address</label>
          <input
            type="text"
            value={memberAddr}
            onChange={(e) => setMemberAddr(e.target.value)}
            placeholder="SS58 address"
            className={inputBase + " font-mono"}
          />
          {selected && (
            <button
              type="button"
              onClick={() => setMemberAddr(selected.address)}
              className="text-[12px] text-[var(--accent)] mt-1.5 hover:underline"
            >
              Use my address ({selected.address.slice(0, 12)}…)
            </button>
          )}
        </div>

        <div>
          <label className="text-[12px] text-[var(--muted)] mb-1 block">Role</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className={inputBase}
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r} → {ROLE_TO_PROXY_TYPE[r]}
              </option>
            ))}
          </select>
        </div>

        {status === "done" && (
          <p className="text-[13px] text-[var(--success)]">Subname minted.</p>
        )}
        {errMsg && (
          <p className="text-[12px] text-[var(--error)] border border-[var(--error)]/25 rounded-lg px-3 py-2">
            {errMsg}
          </p>
        )}

        <button
          onClick={mintSubname}
          disabled={status === "minting" || !label || !memberAddr}
          className="w-full py-3 bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-40 text-white font-semibold rounded-xl text-[13px] uppercase tracking-wider"
        >
          {status === "minting" ? "Signing…" : "Mint subname · 1 signature"}
        </button>

        <p className="text-[10px] font-mono text-[var(--muted)] break-all">
          registrar {registrarAddr.slice(0, 18)}…
        </p>
      </div>
    </div>
  );
}
