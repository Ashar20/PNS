type JudgementKind = "Unknown" | "FeePaid" | "Reasonable" | "KnownGood" | "OutOfDate" | "LowQuality" | "Erroneous";

interface JudgementBadgeProps {
  judgement: JudgementKind;
}

const STYLE: Record<JudgementKind, { bg: string; ink: string; border: string; icon: string }> = {
  Unknown:    { bg: "var(--paper)",      ink: "var(--muted)",       border: "var(--border)",                  icon: "?"  },
  FeePaid:    { bg: "var(--paper)",      ink: "var(--text-2)",      border: "var(--border)",                  icon: "$"  },
  Reasonable: { bg: "var(--blue-tint)",  ink: "var(--blue-ink)",    border: "rgba(0, 128, 188, 0.22)",        icon: "✓"  },
  KnownGood:  { bg: "var(--green-tint)", ink: "var(--green-ink)",   border: "rgba(31, 127, 47, 0.22)",        icon: "✓✓" },
  OutOfDate:  { bg: "rgba(178, 107, 0, 0.10)",  ink: "var(--warning)", border: "rgba(178, 107, 0, 0.28)",     icon: "↺"  },
  LowQuality: { bg: "rgba(178, 107, 0, 0.10)",  ink: "var(--warning)", border: "rgba(178, 107, 0, 0.28)",     icon: "△"  },
  Erroneous:  { bg: "rgba(200, 49, 47, 0.10)",  ink: "var(--error)",   border: "rgba(200, 49, 47, 0.25)",     icon: "✗"  },
};

export function JudgementBadge({ judgement }: JudgementBadgeProps) {
  const s = STYLE[judgement] ?? STYLE.Unknown;
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[12px] font-medium"
      style={{ background: s.bg, color: s.ink, borderColor: s.border }}
      title={`Identity judgement: ${judgement}`}
    >
      <span>{s.icon}</span>
      {judgement}
    </span>
  );
}
