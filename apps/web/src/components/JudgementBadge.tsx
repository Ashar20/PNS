type JudgementKind = "Unknown" | "FeePaid" | "Reasonable" | "KnownGood" | "OutOfDate" | "LowQuality" | "Erroneous";

interface JudgementBadgeProps {
  judgement: JudgementKind;
}

const JUDGEMENT_STYLES: Record<JudgementKind, string> = {
  Unknown: "bg-neutral-800 text-neutral-400 border-neutral-700",
  FeePaid: "bg-neutral-800 text-neutral-300 border-neutral-700",
  Reasonable: "bg-blue-900/40 text-blue-300 border-blue-700",
  KnownGood: "bg-green-900/40 text-green-300 border-green-700",
  OutOfDate: "bg-orange-900/40 text-orange-300 border-orange-700",
  LowQuality: "bg-yellow-900/40 text-yellow-400 border-yellow-700",
  Erroneous: "bg-red-900/40 text-red-400 border-red-700",
};

const JUDGEMENT_ICONS: Record<JudgementKind, string> = {
  Unknown: "?",
  FeePaid: "$",
  Reasonable: "✓",
  KnownGood: "✓✓",
  OutOfDate: "↺",
  LowQuality: "△",
  Erroneous: "✗",
};

export function JudgementBadge({ judgement }: JudgementBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-medium ${JUDGEMENT_STYLES[judgement] ?? JUDGEMENT_STYLES.Unknown}`}
      title={`Identity judgement: ${judgement}`}
    >
      <span>{JUDGEMENT_ICONS[judgement] ?? "?"}</span>
      {judgement}
    </span>
  );
}
