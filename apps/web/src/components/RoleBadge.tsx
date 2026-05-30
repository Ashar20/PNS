import { ROLE_TO_PROXY_TYPE } from "@pns/sdk";

const ROLE_STYLES: Record<string, { bg: string; ink: string; border: string }> = {
  admin:     { bg: "rgba(200, 49, 47, 0.10)",  ink: "var(--error)",     border: "rgba(200, 49, 47, 0.25)" },
  treasurer: { bg: "rgba(178, 107, 0, 0.10)",  ink: "var(--warning)",   border: "rgba(178, 107, 0, 0.28)" },
  voter:     { bg: "var(--blue-tint)",          ink: "var(--blue-ink)",  border: "rgba(0, 128, 188, 0.22)" },
  staker:    { bg: "var(--green-tint)",         ink: "var(--green-ink)", border: "rgba(31, 127, 47, 0.22)" },
  judge:     { bg: "var(--pink-tint)",          ink: "var(--pink-ink)",  border: "rgba(196, 33, 104, 0.22)" },
};

interface RoleBadgeProps {
  role: string;
}

export function RoleBadge({ role }: RoleBadgeProps) {
  const proxyType = ROLE_TO_PROXY_TYPE[role.toLowerCase()] ?? "Any";
  const style = ROLE_STYLES[role.toLowerCase()] ?? {
    bg: "var(--paper)",
    ink: "var(--text-2)",
    border: "var(--border)",
  };

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[12px] font-medium"
      style={{ background: style.bg, color: style.ink, borderColor: style.border }}
      title={`Substrate proxy type: ${proxyType}`}
    >
      {role}
      <span className="opacity-60 text-[10px] font-mono">({proxyType})</span>
    </span>
  );
}
