"use client";

import { useState, useEffect } from "react";
import { normaliseName } from "@pns/sdk";

interface NameInputProps {
  value: string;
  onChange: (normalised: string, raw: string) => void;
  placeholder?: string;
  suffix?: string;
  className?: string;
}

export function NameInput({ value, onChange, placeholder = "search name", suffix = ".pot", className = "" }: NameInputProps) {
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
      setError(String(e));
      onChange("", raw);
    }
  }, [raw]);

  return (
    <div className="relative">
      <div className={`flex items-center bg-neutral-800 border ${error ? "border-red-700" : "border-neutral-700"} rounded-xl overflow-hidden ${className}`}>
        <input
          type="text"
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          placeholder={placeholder}
          className="flex-1 bg-transparent px-4 py-3 text-lg text-neutral-100 placeholder:text-neutral-500 outline-none"
          spellCheck={false}
          autoComplete="off"
          autoCapitalize="none"
        />
        <span className="px-4 text-neutral-400 text-lg font-mono">{suffix}</span>
      </div>
      {error && (
        <p className="text-xs text-red-400 mt-1">{error}</p>
      )}
    </div>
  );
}
