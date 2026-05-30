"use client";

import { useQuery } from "@tanstack/react-query";
import type { AttestationRecord } from "@pns/sdk";

interface AttestationFeedProps {
  subjectName: string;
  schema?: string;
  fetchFn: () => Promise<AttestationRecord[]>;
}

const SCHEMA_COLOR: Record<string, string> = {
  "verified.kyc": "var(--blue-ink)",
  "verified.email": "var(--blue-ink)",
  "endorsement.skill": "var(--pink-ink)",
  "endorsement.contribution": "var(--green-ink)",
};

export function AttestationFeed({ subjectName, schema, fetchFn }: AttestationFeedProps) {
  const { data, isLoading, error } = useQuery<AttestationRecord[]>({
    queryKey: ["attestations", subjectName, schema],
    queryFn: fetchFn,
    staleTime: 30_000,
  });

  if (isLoading) return <p className="text-[13px] text-[var(--muted)]">Loading…</p>;
  if (error) return <p className="text-[13px] text-[var(--error)]">Failed to load attestations</p>;
  if (!data || data.length === 0)
    return <p className="text-[13px] text-[var(--muted)]">No attestations yet.</p>;

  return (
    <div className="space-y-2.5">
      {data.map((a) => {
        const color = SCHEMA_COLOR[a.schema] ?? "var(--text-2)";
        return (
          <div key={a.id.toString()} className="bg-[var(--paper)] rounded-xl p-3.5">
            <div className="flex items-center justify-between mb-1">
              <span
                className="text-[10px] font-mono uppercase tracking-wider font-semibold"
                style={{ color }}
              >
                {a.schema}
              </span>
              <span className="text-[10px] text-[var(--muted)] font-mono">#{a.id.toString()}</span>
            </div>
            <p className="text-[13px] text-[var(--text)] break-words">
              {new TextDecoder().decode(a.payload)}
            </p>
          </div>
        );
      })}
    </div>
  );
}
