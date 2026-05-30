"use client";

import { useState } from "react";
import { TEXT_KEYS } from "@pns/sdk";

const WELL_KNOWN_KEYS = [
  TEXT_KEYS.TWITTER,
  TEXT_KEYS.GITHUB,
  TEXT_KEYS.URL,
  TEXT_KEYS.AVATAR,
  TEXT_KEYS.DESCRIPTION,
  TEXT_KEYS.EMAIL,
  TEXT_KEYS.DISCORD,
];

interface RecordEditorProps {
  initial?: Record<string, string>;
  onSave: (records: Record<string, string>) => Promise<void>;
  isSaving?: boolean;
}

export function RecordEditor({ initial = {}, onSave, isSaving }: RecordEditorProps) {
  const [records, setRecords] = useState<Record<string, string>>(initial);
  const [customKey, setCustomKey] = useState("");
  const [customValue, setCustomValue] = useState("");

  const set = (key: string, value: string) => {
    setRecords((r) => ({ ...r, [key]: value }));
  };

  const remove = (key: string) => {
    setRecords((r) => {
      const copy = { ...r };
      delete copy[key];
      return copy;
    });
  };

  const addCustom = () => {
    if (!customKey.trim()) return;
    set(customKey.trim(), customValue.trim());
    setCustomKey("");
    setCustomValue("");
  };

  const inputBase =
    "flex-1 bg-[var(--paper)] border border-[var(--border)] rounded-xl px-3 py-2.5 text-[14px] text-[var(--text)] placeholder:text-[var(--muted)] outline-none focus:border-[var(--accent)] transition-colors";

  return (
    <div className="space-y-3">
      {WELL_KNOWN_KEYS.map((key) => (
        <div key={key} className="flex gap-3 items-center">
          <label className="w-36 text-[12px] text-[var(--muted)] font-mono shrink-0">{key}</label>
          <input
            type="text"
            value={records[key] ?? ""}
            onChange={(e) => set(key, e.target.value)}
            placeholder={`Enter ${key}`}
            className={inputBase}
          />
        </div>
      ))}

      {Object.keys(records)
        .filter((k) => !(WELL_KNOWN_KEYS as readonly string[]).includes(k))
        .map((key) => (
          <div key={key} className="flex gap-3 items-center">
            <label className="w-36 text-[12px] text-[var(--accent)] font-mono shrink-0 truncate">{key}</label>
            <input
              type="text"
              value={records[key]}
              onChange={(e) => set(key, e.target.value)}
              className={inputBase}
            />
            <button
              onClick={() => remove(key)}
              className="text-[12px] text-[var(--error)] hover:underline"
            >
              Remove
            </button>
          </div>
        ))}

      <div className="flex gap-3 items-center pt-3 border-t border-[var(--border)]">
        <input
          type="text"
          value={customKey}
          onChange={(e) => setCustomKey(e.target.value)}
          placeholder="custom.key"
          className="w-36 bg-[var(--paper)] border border-[var(--border)] rounded-xl px-3 py-2 text-[13px] text-[var(--text-2)] placeholder:text-[var(--muted)] outline-none font-mono focus:border-[var(--accent)] transition-colors"
        />
        <input
          type="text"
          value={customValue}
          onChange={(e) => setCustomValue(e.target.value)}
          placeholder="value"
          className={inputBase}
        />
        <button
          onClick={addCustom}
          className="px-4 py-2 bg-[var(--paper)] hover:bg-[var(--accent-soft)] border border-[var(--border)] text-[13px] text-[var(--text)] rounded-xl font-medium transition-colors"
        >
          Add
        </button>
      </div>

      <button
        onClick={() => onSave(records)}
        disabled={isSaving}
        className="w-full py-3 mt-3 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-semibold uppercase tracking-wider text-[13px] rounded-2xl transition-colors disabled:opacity-50 shadow-[0_2px_0_rgba(0,80,120,0.18)]"
      >
        {isSaving ? "Saving…" : "Save Records"}
      </button>
    </div>
  );
}
