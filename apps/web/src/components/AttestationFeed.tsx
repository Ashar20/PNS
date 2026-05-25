"use client";

import { useQuery } from "@tanstack/react-query";
import type { AttestationRecord } from "@pns/sdk";

interface AttestationFeedProps {
  subjectName: string;
  schema?: string;
  fetchFn: () => Promise<AttestationRecord[]>;
}

export function AttestationFeed({ subjectName, schema, fetchFn }: AttestationFeedProps) {
  const { data, isLoading, error } = useQuery<AttestationRecord[]>({
    queryKey: ["attestations", subjectName, schema],
    queryFn: fetchFn,
    staleTime: 30_000,
  });

  if (isLoading) {
    return <div className="text-neutral-500 text-sm">Loading attestations…</div>;
  }
  if (error) {
    return <div className="text-red-400 text-sm">Failed to load attestations</div>;
  }
  if (!data || data.length === 0) {
    return <div className="text-neutral-600 text-sm">No attestations yet</div>;
  }

  return (
    <div className="space-y-3">
      {data.map((a) => (
        <div
          key={a.id.toString()}
          className="bg-neutral-800/50 border border-neutral-700 rounded-lg px-4 py-3"
        >
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-mono text-violet-400">{a.schema}</span>
              <p className="text-sm text-neutral-200 mt-1">
                {new TextDecoder().decode(a.payload)}
              </p>
            </div>
            <span className="text-xs text-neutral-600">#{a.id.toString()}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
