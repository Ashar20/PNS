"use client";

interface BountyCardProps {
  id: number;
  description: string;
  value: bigint;
  status: "Proposed" | "Approved" | "Funded" | "CuratorProposed" | "Active" | "PendingPayout";
  beneficiary?: string;
  onClaim?: (id: number) => Promise<void>;
  onAward?: (id: number, beneficiary: string) => Promise<void>;
  isSigner?: boolean;
}

const STATUS_STYLES: Record<BountyCardProps["status"], string> = {
  Proposed: "text-neutral-400",
  Approved: "text-blue-400",
  Funded: "text-cyan-400",
  CuratorProposed: "text-yellow-400",
  Active: "text-green-400",
  PendingPayout: "text-violet-400",
};

export function BountyCard({
  id,
  description,
  value,
  status,
  beneficiary,
  onClaim,
  onAward,
  isSigner,
}: BountyCardProps) {
  // 14 decimals POT
  const displayValue = (Number(value) / 1e14).toFixed(2);

  return (
    <div className="bg-neutral-800/50 border border-neutral-700 rounded-xl px-4 py-4">
      <div className="flex items-start justify-between mb-2">
        <div>
          <span className="text-xs text-neutral-500">Bounty #{id}</span>
          <p className="text-sm text-neutral-200 mt-1">{description}</p>
        </div>
        <div className="text-right">
          <p className="text-base font-semibold text-neutral-100">{displayValue} POT</p>
          <span className={`text-xs ${STATUS_STYLES[status]}`}>{status}</span>
        </div>
      </div>

      <div className="flex gap-2 mt-3">
        {status === "PendingPayout" && onClaim && (
          <button
            onClick={() => onClaim(id)}
            className="px-3 py-1.5 bg-violet-600 hover:bg-violet-500 text-white text-xs font-medium rounded-lg"
          >
            Claim
          </button>
        )}
        {status === "Active" && isSigner && onAward && beneficiary && (
          <button
            onClick={() => onAward(id, beneficiary)}
            className="px-3 py-1.5 bg-green-700 hover:bg-green-600 text-white text-xs font-medium rounded-lg"
          >
            Award
          </button>
        )}
      </div>
    </div>
  );
}
