"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { usePNSClient } from "../../../hooks/usePNSClient.js";
import { RoleBadge } from "../../../components/RoleBadge.jsx";
import { BountyCard } from "../../../components/BountyCard.jsx";
import Link from "next/link";

export default function CommunityPage() {
  const { name } = useParams<{ name: string }>();
  const { client } = usePNSClient();

  const { data: members, isLoading } = useQuery({
    queryKey: ["community-members", name],
    queryFn: () => client!.listMembers(`${name}.pot`),
    enabled: !!client,
  });

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-neutral-100">{name}.pot</h2>
          <p className="text-neutral-500 text-sm mt-1">Community</p>
        </div>
        <Link
          href={`/c/${name}/invite`}
          className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-xl transition-colors"
        >
          Invite Member
        </Link>
      </div>

      <section>
        <h3 className="text-sm uppercase tracking-wider text-neutral-500 mb-3">Members</h3>
        {isLoading && <p className="text-neutral-500 text-sm">Loading…</p>}
        {!isLoading && (!members || members.length === 0) && (
          <p className="text-neutral-600 text-sm">No members yet.</p>
        )}
        <div className="space-y-2">
          {members?.map((m) => (
            <div
              key={m.account}
              className="flex items-center justify-between bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium text-neutral-200">{m.subname}</p>
                <p className="text-xs font-mono text-neutral-500 mt-0.5">
                  {m.account.slice(0, 12)}…
                </p>
              </div>
              <RoleBadge role={m.role} />
            </div>
          ))}
        </div>
      </section>

      <section>
        <h3 className="text-sm uppercase tracking-wider text-neutral-500 mb-3">Bounties</h3>
        <p className="text-neutral-600 text-sm">
          Active bounties appear here. Post a bounty via the treasury to reward contributions.
        </p>
      </section>
    </div>
  );
}
