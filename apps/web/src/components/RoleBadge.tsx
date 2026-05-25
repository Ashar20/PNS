import { ROLE_TO_PROXY_TYPE } from "@pns/sdk";

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-red-900/40 text-red-300 border-red-800",
  treasurer: "bg-yellow-900/40 text-yellow-300 border-yellow-800",
  voter: "bg-blue-900/40 text-blue-300 border-blue-800",
  staker: "bg-green-900/40 text-green-300 border-green-800",
  judge: "bg-purple-900/40 text-purple-300 border-purple-800",
};

interface RoleBadgeProps {
  role: string;
}

export function RoleBadge({ role }: RoleBadgeProps) {
  const proxyType = ROLE_TO_PROXY_TYPE[role.toLowerCase()] ?? "Any";
  const colorClass = ROLE_COLORS[role.toLowerCase()] ?? "bg-neutral-800 text-neutral-300 border-neutral-700";

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-medium ${colorClass}`}
      title={`Substrate proxy type: ${proxyType}`}
    >
      {role}
      <span className="opacity-60 text-[10px]">({proxyType})</span>
    </span>
  );
}
