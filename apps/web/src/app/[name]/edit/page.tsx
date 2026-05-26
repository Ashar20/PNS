"use client";

export const dynamic = "force-dynamic";

import { useParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { usePNSClient } from "../../../hooks/usePNSClient";
import { useWallet } from "../../../hooks/useWallet";
import { RecordEditor } from "../../../components/RecordEditor";
import { namehash, normaliseName, setText, setAddr, setName } from "@pns/sdk";

export default function EditProfilePage() {
  const { name } = useParams<{ name: string }>();
  const { client } = usePNSClient();
  const { selected } = useWallet();
  const queryClient = useQueryClient();

  const [savingRecords, setSavingRecords] = useState(false);
  const [savingAddr, setSavingAddr] = useState(false);
  const [settingPrimary, setSettingPrimary] = useState(false);

  const [addrInput, setAddrInput] = useState("");
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const { data: resolved } = useQuery({
    queryKey: ["profile", name],
    queryFn: () => client!.resolveName(name as string),
    enabled: !!client,
  });

  useEffect(() => {
    if (resolved?.addr && !addrInput) setAddrInput(resolved.addr);
  // only run when resolved first loads
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolved?.addr]);

  const { data: primaryName } = useQuery({
    queryKey: ["primary-name", selected?.address],
    queryFn: () => client!.resolveAddress(selected!.address),
    enabled: !!client && !!selected,
  });

  const abis = client ? (client as unknown as { abis: Record<string, unknown> }).abis : null;

  const requireDev = () => {
    if (!selected) { setMsg({ type: "err", text: "Connect a wallet first." }); return false; }
    if (selected.source !== "dev" || !selected.signer) {
      setMsg({ type: "err", text: "Extension wallet signing not yet wired. Use a dev account (Alice/Bob)." });
      return false;
    }
    return true;
  };

  const handleSaveRecords = async (records: Record<string, string>) => {
    if (!client || !abis || !requireDev()) return;
    setSavingRecords(true);
    setMsg(null);
    try {
      const node = namehash(normaliseName(name as string));
      for (const [key, value] of Object.entries(records)) {
        if (!value) continue;
        await setText(client.api, client.addresses.resolver, abis.resolver, node, key, value, selected!.signer!);
      }
      await queryClient.invalidateQueries({ queryKey: ["profile", name] });
      setMsg({ type: "ok", text: "Text records saved." });
    } catch (e) {
      setMsg({ type: "err", text: String(e) });
    } finally {
      setSavingRecords(false);
    }
  };

  const handleSaveAddr = async () => {
    if (!client || !abis || !requireDev()) return;
    if (!addrInput.trim()) { setMsg({ type: "err", text: "Enter an address." }); return; }
    setSavingAddr(true);
    setMsg(null);
    try {
      const node = namehash(normaliseName(name as string));
      await setAddr(client.api, client.addresses.resolver, abis.resolver, node, addrInput.trim(), selected!.signer!);
      await queryClient.invalidateQueries({ queryKey: ["profile", name] });
      setMsg({ type: "ok", text: "Address record saved." });
    } catch (e) {
      setMsg({ type: "err", text: String(e) });
    } finally {
      setSavingAddr(false);
    }
  };

  const handleSetPrimary = async () => {
    if (!client || !abis || !requireDev()) return;
    setSettingPrimary(true);
    setMsg(null);
    try {
      await setName(client.api, client.addresses.reverseRegistrar, abis.reverse, name as string, selected!.signer!);
      await queryClient.invalidateQueries({ queryKey: ["primary-name", selected?.address] });
      setMsg({ type: "ok", text: `${name} is now your primary name.` });
    } catch (e) {
      setMsg({ type: "err", text: String(e) });
    } finally {
      setSettingPrimary(false);
    }
  };

  const isPrimary = primaryName === name;

  if (!resolved) {
    return <div className="text-neutral-500">Loading…</div>;
  }

  return (
    <div className="max-w-xl mx-auto space-y-8">
      <h2 className="text-2xl font-bold text-neutral-100">Edit {name}</h2>

      {msg && (
        <div className={`rounded-xl px-4 py-3 text-sm ${msg.type === "ok" ? "bg-green-900/20 border border-green-800 text-green-300" : "bg-red-900/20 border border-red-800 text-red-300"}`}>
          {msg.text}
        </div>
      )}

      {/* Primary name */}
      <section className="bg-neutral-900 border border-neutral-800 rounded-2xl px-6 py-5 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-neutral-100">Primary name</h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              This is what your address resolves to. Shows in wallets and explorers.
            </p>
          </div>
          {isPrimary && (
            <span className="text-xs text-green-400 font-medium px-2 py-1 bg-green-900/20 rounded-lg">
              Current primary
            </span>
          )}
        </div>
        {primaryName && !isPrimary && (
          <p className="text-xs text-neutral-400">
            Current primary: <span className="text-neutral-200 font-mono">{primaryName}</span>
          </p>
        )}
        <button
          onClick={handleSetPrimary}
          disabled={settingPrimary || isPrimary}
          className="w-full py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white text-sm font-medium rounded-xl transition-colors"
        >
          {settingPrimary ? "Setting…" : isPrimary ? "Already your primary name" : `Set ${name} as primary`}
        </button>
      </section>

      {/* Address record */}
      <section className="bg-neutral-900 border border-neutral-800 rounded-2xl px-6 py-5 space-y-3">
        <div>
          <h3 className="font-semibold text-neutral-100">Address record</h3>
          <p className="text-xs text-neutral-500 mt-0.5">
            The account this name points to when resolved.
          </p>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={addrInput}
            onChange={(e) => setAddrInput(e.target.value)}
            placeholder="5GrwvaEF… (SS58 address)"
            className="flex-1 bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-600 outline-none focus:border-violet-600 font-mono"
          />
          <button
            onClick={handleSaveAddr}
            disabled={savingAddr}
            className="px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white text-sm font-medium rounded-xl transition-colors"
          >
            {savingAddr ? "Saving…" : "Save"}
          </button>
        </div>
        {selected && (
          <button
            onClick={() => setAddrInput(selected.address)}
            className="text-xs text-violet-400 hover:text-violet-300"
          >
            Use my address ({selected.address.slice(0, 12)}…)
          </button>
        )}
      </section>

      {/* Text records */}
      <section className="space-y-3">
        <div>
          <h3 className="font-semibold text-neutral-100">Text records</h3>
          <p className="text-xs text-neutral-500 mt-0.5">
            Social links, description, avatar, and any custom keys.
          </p>
        </div>
        <RecordEditor
          initial={resolved.textRecords}
          onSave={handleSaveRecords}
          isSaving={savingRecords}
        />
      </section>
    </div>
  );
}
