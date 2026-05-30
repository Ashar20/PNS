import Link from "next/link";

type Theme = "green" | "pink" | "blue";

interface SampleProfileCardProps {
  name: string;
  registered: string;
  bio: string;
  links: { kind: "twitter" | "github" | "email" | "url"; value: string }[];
  theme: Theme;
  avatarUrl?: string;
}

const THEMES: Record<Theme, { bg: string; tint: string; ink: string; pill: string; chip: string }> = {
  green: { bg: "var(--green-bg)", tint: "var(--green-tint)", ink: "var(--green-ink)", pill: "var(--green-pill)", chip: "var(--green-chip)" },
  pink: { bg: "var(--pink-bg)", tint: "var(--pink-tint)", ink: "var(--pink-ink)", pill: "var(--pink-pill)", chip: "var(--pink-chip)" },
  blue: { bg: "var(--blue-bg)", tint: "var(--blue-tint)", ink: "var(--blue-ink)", pill: "var(--blue-pill)", chip: "var(--blue-chip)" },
};

const ICONS: Record<string, React.ReactNode> = {
  twitter: <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>,
  github: <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.4 3-.405 1.02.005 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>,
  email: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>,
  url: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20"/></svg>,
};

export function SampleProfileCard({ name, registered, bio, links, theme, avatarUrl }: SampleProfileCardProps) {
  const t = THEMES[theme];
  const initials = name.replace(/\.pot$/, "").slice(0, 2).toUpperCase();

  return (
    <Link href={`/${name}`} className="block group">
      <div className="rounded-3xl overflow-hidden border border-[var(--border)]" style={{ background: t.tint }}>
        {/* Banner */}
        <div className="h-32 relative" style={{ background: t.bg }}>
          {/* Avatar overlapping the band */}
          <div
            className="absolute left-7 -bottom-10 w-[88px] h-[88px] rounded-full ring-[5px] ring-[var(--bg)] overflow-hidden flex items-center justify-center font-semibold text-[28px]"
            style={{ background: t.tint, color: t.ink }}
          >
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt={name}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              initials
            )}
          </div>
        </div>

        <div className="pt-14 px-7 pb-6">
          {/* Name pill */}
          <span
            className="inline-block px-3 py-1.5 rounded-md text-white font-semibold text-[15px]"
            style={{ background: t.pill }}
          >
            {name}
          </span>

          {/* Registered row */}
          <div className="flex items-center gap-1.5 mt-3 text-[13px]" style={{ color: t.ink }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
              <rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18M8 3v4M16 3v4"/>
            </svg>
            <span>Registered</span>
            <span className="font-semibold">{registered}</span>
          </div>

          {/* Bio */}
          <p className="mt-4 text-[14px] leading-relaxed font-medium" style={{ color: t.ink }}>
            {bio}
          </p>

          <div className="mt-5 mb-3 h-px" style={{ background: `${t.ink}26` }} />

          {/* Links */}
          <p className="text-[13px] font-semibold mb-3" style={{ color: t.ink }}>links</p>
          <div className="flex flex-wrap gap-2">
            {links.map(({ kind, value }) => (
              <span
                key={kind + value}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[13px] font-medium"
                style={{ background: t.chip, color: t.ink }}
              >
                {ICONS[kind]}
                <span className="truncate max-w-[140px]">{value}</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </Link>
  );
}
