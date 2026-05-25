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

  return (
    <div className="space-y-4">
      {WELL_KNOWN_KEYS.map((key) => (
        <div key={key} className="flex gap-3 items-center">
          <label className="w-36 text-sm text-neutral-400 font-mono shrink-0">{key}</label>
          <input
            type="text"
            value={records[key] ?? ""}
            onChange={(e) => set(key, e.target.value)}
            placeholder={`Enter ${key}`}
            className="flex-1 bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-600 outline-none focus:border-violet-600"
          />
        </div>
      ))}

      {Object.keys(records)
        .filter((k) => !WELL_KNOWN_KEYS.includes(k))
        .map((key) => (
          <div key={key} className="flex gap-3 items-center">
            <label className="w-36 text-sm text-violet-400 font-mono shrink-0 truncate">{key}</label>
            <input
              type="text"
              value={records[key]}
              onChange={(e) => set(key, e.target.value)}
              className="flex-1 bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-100 outline-none focus:border-violet-600"
            />
            <button onClick={() => remove(key)} className="text-red-500 hover:text-red-400 text-sm">
              Remove
            </button>
          </div>
        ))}

      <div className="flex gap-3 items-center pt-2 border-t border-neutral-700">
        <input
          type="text"
          value={customKey}
          onChange={(e) => setCustomKey(e.target.value)}
          placeholder="custom.key"
          className="w-36 bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-300 placeholder:text-neutral-600 outline-none font-mono"
        />
        <input
          type="text"
          value={customValue}
          onChange={(e) => setCustomValue(e.target.value)}
          placeholder="value"
          className="flex-1 bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-600 outline-none"
        />
        <button
          onClick={addCustom}
          className="px-3 py-2 bg-neutral-700 hover:bg-neutral-600 text-sm text-neutral-200 rounded-lg"
        >
          Add
        </button>
      </div>

      <button
        onClick={() => onSave(records)}
        disabled={isSaving}
        className="w-full py-3 bg-violet-600 hover:bg-violet-500 text-white font-medium rounded-xl transition-colors disabled:opacity-50"
      >
        {isSaving ? "Saving…" : "Save Records"}
      </button>
    </div>
  );
}
