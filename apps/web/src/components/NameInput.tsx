"use client";

import { useState, useEffect } from "react";
import { normaliseName } from "@pns/sdk";

interface NameInputProps {
  value: string;
  onChange: (normalised: string, raw: string) => void;
  onEnter?: () => void;
  placeholder?: string;
  suffix?: string;
  size?: "md" | "lg" | "xl";
  className?: string;
}

const SIZE_STYLES: Record<NonNullable<NameInputProps["size"]>, string> = {
  md: "text-[15px] px-5 py-3 rounded-2xl",
  lg: "text-[17px] px-6 py-4 rounded-2xl",
  xl: "text-[22px] px-7 py-5 rounded-[28px]",
};

export function NameInput({
  value,
  onChange,
  onEnter,
  placeholder = "search names",
  suffix = ".pot",
  size = "lg",
  className = "",
}: NameInputProps) {
  const [raw, setRaw] = useState(value);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!raw) {
      setError(null);
      onChange("", "");
      return;
    }
    try {
      const full = raw.includes(".") ? raw : `${raw}${suffix}`;
      const normalised = normaliseName(full);
      setError(null);
      onChange(normalised, raw);
    } catch (e) {
      setError(String(e).replace("Error: ", ""));
      onChange("", raw);
    }
  }, [raw]);

  return (
    <div className={className}>
      <div
        className={`pill-input flex items-center ${SIZE_STYLES[size]} ${
          error ? "border-[var(--error)]" : ""
        }`}
      >
        <input
          type="text"
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onEnter?.()}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-[var(--text)] placeholder:text-[var(--muted)] outline-none font-medium"
          spellCheck={false}
          autoComplete="off"
          autoCapitalize="none"
        />
        <span className="text-[var(--muted)] font-mono ml-2 select-none">{suffix}</span>
      </div>
      {error && <p className="text-[12px] text-[var(--error)] mt-2 ml-2">{error}</p>}
    </div>
  );
}
