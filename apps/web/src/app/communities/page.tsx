"use client";

export const dynamic = "force-dynamic";

import Link from "next/link";

export default function CommunitiesPage() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-neutral-100">Communities</h2>
        <Link
          href="/communities/new"
          className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-xl transition-colors"
        >
          New Community
        </Link>
      </div>
      <p className="text-neutral-500 text-sm">
        Communities are parent names owned by multisig accounts. Members get subnames, roles
        (native proxy types), and verifiable reputation from the identity pallet.
      </p>
      {/* In production, this list is populated by querying CommunityRegistrar deployment events */}
      <div className="text-neutral-600 text-sm border border-neutral-800 rounded-2xl px-6 py-8 text-center">
        No communities found. Deploy a community to get started.
      </div>
    </div>
  );
}
