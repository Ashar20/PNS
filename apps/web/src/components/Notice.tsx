export function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-[1180px] mx-auto px-6 mb-6">
      <div
        className="rounded-2xl px-5 py-3 text-[14px] leading-relaxed"
        style={{
          background: "var(--notice-bg)",
          border: "1px solid var(--notice-border)",
          color: "var(--notice-ink)",
        }}
      >
        <span className="font-semibold mr-1">Notice:</span>
        {children}
      </div>
    </div>
  );
}
