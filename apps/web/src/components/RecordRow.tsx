"use client";

const ICON: Record<string, React.ReactNode> = {
  "com.twitter": (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
  ),
  "com.github": (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.4 3-.405 1.02.005 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>
  ),
  "com.discord": (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M20.317 4.37a19.79 19.79 0 0 0-4.885-1.515.07.07 0 0 0-.075.036c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.6 12.6 0 0 0-.617-1.25.077.077 0 0 0-.075-.036A19.74 19.74 0 0 0 3.68 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.08.08 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.027 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.042-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.3 12.3 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.84 19.84 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.42 0-1.333.956-2.418 2.157-2.418 1.21 0 2.176 1.094 2.157 2.418 0 1.335-.956 2.42-2.157 2.42zm7.975 0c-1.183 0-2.157-1.085-2.157-2.42 0-1.333.955-2.418 2.157-2.418 1.21 0 2.176 1.094 2.157 2.418 0 1.335-.946 2.42-2.157 2.42z"/></svg>
  ),
  url: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4"><path d="M10 14a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1.5 1.5"/><path d="M14 10a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1.5-1.5"/></svg>
  ),
  email: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>
  ),
  avatar: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="10" r="3"/><path d="M5.5 19a7 7 0 0 1 13 0"/></svg>
  ),
  description: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4"><path d="M4 6h16M4 12h12M4 18h8"/></svg>
  ),
  dot: (
    <span className="w-1.5 h-1.5 rounded-full bg-[var(--muted)] inline-block" />
  ),
};

function linkFor(key: string, value: string): string | null {
  if (key === "com.twitter") return `https://twitter.com/${value.replace(/^@/, "")}`;
  if (key === "com.github") return `https://github.com/${value}`;
  if (key === "url") return value.startsWith("http") ? value : `https://${value}`;
  if (key === "email") return `mailto:${value}`;
  return null;
}

function labelFor(key: string): string {
  const map: Record<string, string> = {
    "com.twitter": "Twitter",
    "com.github": "GitHub",
    "com.discord": "Discord",
    url: "Website",
    avatar: "Avatar",
    description: "Description",
    email: "Email",
  };
  return map[key] ?? key;
}

export function RecordRow({ recordKey, value }: { recordKey: string; value: string }) {
  const href = linkFor(recordKey, value);
  const icon = ICON[recordKey] ?? ICON.dot;
  const isAvatar = recordKey === "avatar";

  return (
    <div className="flex items-center gap-4 px-6 py-4 hover:bg-[var(--paper)]/60 transition-colors">
      <div className="w-9 h-9 rounded-xl bg-[var(--paper)] flex items-center justify-center text-[var(--text-2)] shrink-0 overflow-hidden">
        {isAvatar && value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={value}
            alt="Avatar"
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          icon
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--muted)] mb-0.5">
          {labelFor(recordKey)}
        </p>
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="text-[14px] text-[var(--text)] hover:text-[var(--accent)] truncate block transition-colors font-medium"
          >
            {value}
          </a>
        ) : (
          <p className="text-[14px] text-[var(--text)] break-words">{value}</p>
        )}
      </div>
    </div>
  );
}

/** Compact icon-only chip for the social row right under the name. */
export function SocialChip({ recordKey, value }: { recordKey: string; value: string }) {
  const href = linkFor(recordKey, value);
  const icon = ICON[recordKey];
  if (!icon || !href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      title={`${labelFor(recordKey)}: ${value}`}
      className="w-9 h-9 rounded-full border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--paper)] flex items-center justify-center text-[var(--text-2)] hover:text-[var(--accent)] transition-colors"
    >
      {icon}
    </a>
  );
}
