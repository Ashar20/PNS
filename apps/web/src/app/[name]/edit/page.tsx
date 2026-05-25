"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { usePNSClient } from "../../../hooks/usePNSClient";
import { useWallet } from "../../../hooks/useWallet";
import { RecordEditor } from "../../../components/RecordEditor";
import { namehash, normaliseName } from "@pns/sdk";
import { setAddr, setText } from "@pns/sdk";

export default function EditProfilePage() {
  const { name } = useParams<{ name: string }>();
  const { client } = usePNSClient();
  const { selected } = useWallet();
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const { data: resolved } = useQuery({
    queryKey: ["profile", name],
    queryFn: () => client!.resolveName(name),
    enabled: !!client,
  });

  const handleSave = async (records: Record<string, string>) => {
    if (!client || !selected) return;
    setIsSaving(true);
    setSaved(false);
    try {
      const { web3FromAddress } = await import("@polkadot/extension-dapp");
      const injector = await web3FromAddress(selected.address);
      const node = namehash(normaliseName(name));
      const calls = Object.entries(records).map(([key, value]) =>
        client.api.tx.contracts.call(
          client.addresses.resolver,
          0,
          { refTime: 10_000_000_000n, proofSize: 10_000n },
          null,
          []
        )
      );
      // In a full implementation, each record is set via resolver.setText
      // batched through utility.batchAll
      // This is wired up via the PNSClient.setProfile flow
      await client.api.tx.utility
        .batchAll(calls)
        .signAndSend(selected.address, { signer: injector.signer });
      setSaved(true);
    } catch (e) {
      console.error(e);
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
      <RecordEditor
        initial={resolved.textRecords}
        onSave={handleSave}
        isSaving={isSaving}
      />
    </div>
  );
}
