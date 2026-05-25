"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { NameInput } from "./NameInput";

export function HomeSearch() {
  const router = useRouter();
  const [normalised, setNormalised] = useState("");

  const handleSearch = () => {
    if (!normalised) return;
    router.push(`/search?q=${encodeURIComponent(normalised)}`);
  };

  return (
    <div className="w-full max-w-xl">
      <NameInput
        value=""
        onChange={(n) => setNormalised(n)}
        placeholder="find your name"
        suffix=".pot"
        className="text-xl"
      />
      <button
        onClick={handleSearch}
        disabled={!normalised}
        className="w-full mt-4 py-3 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white font-semibold rounded-xl transition-colors"
      >
        Search
      </button>
    </div>
  );
}
