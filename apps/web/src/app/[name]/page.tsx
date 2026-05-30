"use client";

export const dynamic = "force-dynamic";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { usePNSClient } from "../../hooks/usePNSClient";
import { useWallet } from "../../hooks/useWallet";
import { AttestationFeed } from "../../components/AttestationFeed";
import { Avatar, ProfileBanner } from "../../components/Avatar";
import { RecordRow, SocialChip } from "../../components/RecordRow";
import Link from "next/link";
import { SubnamesPanel } from "../../components/SubnamesPanel";
import { TEXT_KEYS } from "@pns/sdk";

type Tab = "profile" | "subnames" | "ownership" | "more";

function CopyableMono({ value, truncate = false }: { value: string; truncate?: boolean }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button
      onClick={copy}
      className="inline-flex items-center gap-1.5 font-mono text-[12px] text-[var(--text-2)] hover:text-[var(--accent)] transition-colors group"
      title={value}
    >
      <span className={truncate ? "truncate max-w-[180px]" : ""}>{value}</span>
      <span className="opacity-50 group-hover:opacity-100">{copied ? "✓" : "⧉"}</span>
    </button>
  );
}

export default function ProfilePage() {
  const { name } = useParams<{ name: string }>();
  const { client } = usePNSClient();
  const { selected } = useWallet();
  const [tab, setTab] = useState<Tab>("profile");

  const { data: resolved, isLoading } = useQuery({
    queryKey: ["profile", name],
    queryFn: () => client!.resolveName(name),
    enabled: !!client,
  });

  if (isLoading || !resolved) {
    return (
      <div className="max-w-3xl mx-auto py-20 text-center">
        <div className="inline-block w-12 h-12 rounded-full bg-[var(--surface)] border border-[var(--border)] animate-pulse mb-4" />
        <p className="text-[var(--muted)] text-[14px]">
          Resolving <span className="font-mono text-[var(--text)]">{name}</span>…
        </p>
      </div>
    );
  }

  const isOwner = selected?.address === resolved.owner;
  const records = Object.entries(resolved.textRecords);
  const description = resolved.textRecords["description"];
  const avatarUrl = resolved.textRecords[TEXT_KEYS.AVATAR];

  const socialKeys = ["com.twitter", "com.github", "com.discord", "url", "email"];

  return (
    <div className="max-w-[1180px] mx-auto pt-2">
      {/* Banner card with overlapping avatar — matches ENS profile cards */}
      <div className="rounded-[28px] overflow-hidden border border-[var(--border)] bg-[var(--surface)] mb-8">
        <div className="h-44 md:h-52 relative">
          <ProfileBanner seed={resolved.name} className="absolute inset-0" />
        </div>
        <div className="relative px-8 md:px-10 pt-0 pb-7">
          <div className="-mt-16 flex items-end justify-between gap-4">
            <Avatar
              seed={resolved.name}
              size={128}
              imageUrl={avatarUrl}
              className="ring-[6px] ring-[var(--surface)]"
            />
            <div className="flex gap-2 mb-4">
              {isOwner && (
                <Link
                  href={`/${name}/edit`}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-[13px] font-semibold rounded-2xl transition-colors uppercase tracking-wider"
                >
                  Edit profile
                </Link>
              )}
              <Link
                href={`/${name}/attest`}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--surface)] border border-[var(--border)] hover:bg-[var(--paper)] text-[var(--text)] text-[13px] font-medium rounded-2xl transition-colors"
              >
                Attest
              </Link>
            </div>
          </div>

          <div className="mt-5">
            <h1 className="text-[36px] md:text-[44px] font-semibold text-[var(--text)] tracking-[-0.02em] font-mono break-all leading-tight">
              {resolved.name}
            </h1>
            {description && (
              <p className="mt-3 text-[16px] text-[var(--text-2)] leading-relaxed max-w-2xl">
                {description}
              </p>
            )}

            {/* Social chip row */}
            <div className="mt-5 flex flex-wrap gap-2">
              {socialKeys
                .filter((k) => resolved.textRecords[k])
                .map((k) => (
                  <SocialChip key={k} recordKey={k} value={resolved.textRecords[k]} />
                ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-[var(--border)] mb-8 flex gap-8 px-2">
        {([
          ["profile",   "Profile"],
          ["subnames",  "Subnames"],
          ["ownership", "Ownership"],
          ["more",      "More"],
        ] as [Tab, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            data-active={tab === key}
            className="tab text-[14px] font-medium text-[var(--muted)] data-[active=true]:text-[var(--text)] hover:text-[var(--text)] transition-colors"
          >
            {label}
          </button>
        ))}
      </div>

      {/* Body */}
      {tab === "profile" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Records */}
          <div className="lg:col-span-2 card overflow-hidden">
            <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between">
              <h2 className="text-[15px] font-semibold">Records</h2>
              <span className="text-[12px] text-[var(--muted)] font-mono">{records.length}</span>
            </div>
            <div className="divide-y divide-[var(--border)]">
              {records.length === 0 ? (
                <div className="px-6 py-14 text-center">
                  <p className="text-[14px] text-[var(--muted)]">No records set.</p>
                  {isOwner && (
                    <Link href={`/${name}/edit`} className="inline-block mt-3 inline-link text-[14px]">
                      Add your first record
                    </Link>
                  )}
                </div>
              ) : (
                records.map(([key, value]) => (
                  <RecordRow key={key} recordKey={key} value={value} />
                ))
              )}
            </div>
          </div>

          {/* Ownership sidebar */}
          <aside className="space-y-4">
            <div className="card p-6">
              <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--muted)] mb-4">Ownership</p>
              <dl className="space-y-4">
                <div>
                  <dt className="text-[11px] text-[var(--muted)] uppercase tracking-wider mb-1">Address</dt>
                  <dd>{resolved.addr ? <CopyableMono value={resolved.addr} truncate /> : <span className="text-[12px] text-[var(--muted)]">—</span>}</dd>
                </div>
                <div>
                  <dt className="text-[11px] text-[var(--muted)] uppercase tracking-wider mb-1">Manager</dt>
                  <dd><CopyableMono value={resolved.owner} truncate /></dd>
                </div>
                <div>
                  <dt className="text-[11px] text-[var(--muted)] uppercase tracking-wider mb-1">Resolver</dt>
                  <dd>{resolved.resolver ? <CopyableMono value={resolved.resolver} truncate /> : <span className="text-[12px] text-[var(--muted)]">default</span>}</dd>
                </div>
              </dl>
            </div>

            <div className="card p-6">
              <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--muted)] mb-3">Attestations</p>
              {client && (
                <AttestationFeed
                  subjectName={name}
                  fetchFn={() => client.listAttestationsForSubject(name)}
                />
              )}
            </div>
          </aside>
        </div>
      )}

      {tab === "subnames" && (
        <SubnamesPanel
          parentName={resolved.name}
          ownerAddress={resolved.owner}
          isOwner={!!isOwner}
        />
      )}

      {tab === "ownership" && (
        <div className="card p-8">
          <h3 className="text-[16px] font-semibold mb-4">Onchain ownership</h3>
          <p className="text-[14px] text-[var(--text-2)] mb-6 max-w-2xl">
            The Registry contract stores ownership; the PublicResolver stores records. The two
            are decoupled — ownership transfers do not move records.
          </p>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              ["Address", resolved.addr ?? "—"],
              ["Manager", resolved.owner],
              ["Resolver", resolved.resolver ?? "default"],
              ["Name", resolved.name],
            ].map(([k, v]) => (
              <div key={k} className="bg-[var(--paper)] rounded-xl p-4">
                <dt className="text-[11px] uppercase tracking-wider text-[var(--muted)] mb-1.5">{k}</dt>
                <dd className="font-mono text-[12px] break-all text-[var(--text)]">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {tab === "more" && (
        <div className="card p-10 text-center text-[14px] text-[var(--muted)]">
          More actions: transfer ownership, set TTL, batch resolver updates. <span className="serif-italic">Coming soon.</span>
        </div>
      )}
    </div>
  );
}
