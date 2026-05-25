"use client";

export const dynamic = "force-dynamic";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { usePNSClient } from "../../hooks/usePNSClient";
import { useWallet } from "../../hooks/useWallet";
import { RoleBadge } from "../../components/RoleBadge";
import { JudgementBadge } from "../../components/JudgementBadge";
import { AttestationFeed } from "../../components/AttestationFeed";
import Link from "next/link";

export default function ProfilePage() {
  const { name } = useParams<{ name: string }>();
  const { client } = usePNSClient();
  const { selected } = useWallet();

  const { data: resolved, isLoading } = useQuery({
    queryKey: ["profile", name],
    queryFn: () => client!.resolveName(name),
    enabled: !!client,
  });

  if (isLoading || !resolved) {
    return <div className="text-neutral-500">Loading {name}…</div>;
  }

  const isOwner = selected?.address === resolved.owner;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      {/* Sidebar */}
      <aside className="space-y-4">
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl px-5 py-5">
          <h1 className="text-2xl font-bold text-neutral-100 break-all">{resolved.name}</h1>
          {resolved.textRecords["description"] && (
            <p className="text-neutral-400 text-sm mt-2">{resolved.textRecords["description"]}</p>
          )}
          {resolved.addr && (
            <p className="font-mono text-xs text-neutral-500 mt-3 break-all">{resolved.addr}</p>
          )}
        </div>

        {isOwner && (
          <Link
            href={`/${name}/edit`}
            className="block text-center py-2.5 border border-neutral-700 rounded-xl text-sm text-neutral-300 hover:bg-neutral-800 transition-colors"
          >
            Edit Profile
          </Link>
        )}

        <Link
          href={`/${name}/attest`}
          className="block text-center py-2.5 border border-neutral-700 rounded-xl text-sm text-neutral-300 hover:bg-neutral-800 transition-colors"
        >
          Attest
        </Link>
      </aside>

      {/* Main content */}
      <div className="md:col-span-2 space-y-8">
        {/* Text records */}
        <section>
          <h2 className="text-sm uppercase tracking-wider text-neutral-500 mb-3">Records</h2>
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl divide-y divide-neutral-800">
            {Object.entries(resolved.textRecords).length === 0 ? (
              <p className="px-5 py-4 text-sm text-neutral-600">No records set</p>
            ) : (
              Object.entries(resolved.textRecords).map(([key, value]) => (
                <div key={key} className="flex px-5 py-3 gap-4">
                  <span className="text-xs font-mono text-neutral-500 w-36 shrink-0">{key}</span>
                  <span className="text-sm text-neutral-200 break-all">{value}</span>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Attestations */}
        <section>
          <h2 className="text-sm uppercase tracking-wider text-neutral-500 mb-3">Attestations</h2>
          {client && (
            <AttestationFeed
              subjectName={name}
              fetchFn={() => client.listAttestationsForSubject(name)}
            />
          )}
        </section>
      </div>
    </div>
  );
}
