"use client";

export const dynamic = "force-dynamic";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { usePNSClient } from "../../../hooks/usePNSClient";
import { useWallet } from "../../../hooks/useWallet";
import { RecordEditor } from "../../../components/RecordEditor";
import { namehash, normaliseName, setText, setAddr } from "@pns/sdk";

export default function EditProfilePage() {
  const { name } = useParams<{ name: string }>();
  const { client } = usePNSClient();
  const { selected } = useWallet();
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const { data: resolved } = useQuery({
    queryKey: ["profile", name],
    queryFn: () => client!.resolveName(name as string),
    enabled: !!client,
  });

  const handleSave = async (records: Record<string, string>) => {
    if (!client || !selected) return;
    if (selected.source !== "dev" || !selected.signer) {
      setErrMsg("Extension wallet signing not yet wired up. Use a dev account.");
      return;
    }
    setIsSaving(true);
    setSaved(false);
    setErrMsg(null);
    try {
      const node = namehash(normaliseName(name as string));
      const abis = (client as unknown as { abis: Record<string, unknown> }).abis;
      for (const [key, value] of Object.entries(records)) {
        if (!value) continue;
        await setText(client.api, client.addresses.resolver, abis.resolver, node, key, value, selected.signer);
      }
      setSaved(true);
    } catch (e) {
      setErrMsg(String(e));
    } finally {
      setIsSaving(false);
    }
  };

  if (!resolved) {
    return <div className="text-neutral-500">Loading…</div>;
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <h2 className="text-2xl font-bold text-neutral-100">Edit {name}</h2>
      {saved && (
        <div className="bg-green-900/20 border border-green-800 rounded-xl px-4 py-3 text-sm text-green-300">
          Records saved successfully.
        </div>
      )}
      {errMsg && (
        <div className="bg-red-900/20 border border-red-800 rounded-xl px-4 py-3 text-sm text-red-300">
          {errMsg}
        </div>
      )}
      <RecordEditor
        initial={resolved.textRecords}
        onSave={handleSave}
        isSaving={isSaving}
      />
    </div>
  );
}
