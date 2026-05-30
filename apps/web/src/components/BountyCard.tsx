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

const STATUS_INK: Record<BountyCardProps["status"], string> = {
  Proposed: "var(--muted)",
  Approved: "var(--accent)",
  Funded: "var(--blue-ink)",
  CuratorProposed: "var(--warning)",
  Active: "var(--success)",
  PendingPayout: "var(--pink-ink)",
};

export function BountyCard({
  id, description, value, status, beneficiary, onClaim, onAward, isSigner,
}: BountyCardProps) {
  const displayValue = (Number(value) / 1e14).toFixed(2);

  return (
    <div className="card px-5 py-4">
      <div className="flex items-start justify-between mb-2 gap-4">
        <div className="min-w-0">
          <span className="text-[11px] font-mono uppercase tracking-wider text-[var(--muted)]">
            Bounty #{id}
          </span>
          <p className="text-[14px] text-[var(--text)] mt-1">{description}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-[16px] font-semibold text-[var(--text)]">{displayValue} POT</p>
          <span className="text-[12px] font-medium" style={{ color: STATUS_INK[status] }}>
            {status}
          </span>
        </div>
      </div>

      <div className="flex gap-2 mt-3">
        {status === "PendingPayout" && onClaim && (
          <button
            onClick={() => onClaim(id)}
            className="px-3 py-1.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-[12px] font-semibold uppercase tracking-wider rounded-lg"
          >
            Claim
          </button>
        )}
        {status === "Active" && isSigner && onAward && beneficiary && (
          <button
            onClick={() => onAward(id, beneficiary)}
            className="px-3 py-1.5 text-white text-[12px] font-semibold uppercase tracking-wider rounded-lg"
            style={{ background: "var(--success)" }}
          >
            Award
          </button>
        )}
      </div>
    </div>
  );
}
