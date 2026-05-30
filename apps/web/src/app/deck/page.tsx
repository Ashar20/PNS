"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { SLIDES } from "./slides";

/**
 * PNS pitch deck — full-screen presentation at /deck.
 * Navigate: → / Space / PageDown / J advance · ← / PageUp / K back · Home/End jump · F fullscreen.
 * Rendered as a fixed overlay so it covers the app header/footer for a clean present mode.
 */
export default function DeckPage() {
  const [i, setI] = useState(0);
  const last = SLIDES.length - 1;

  const go = useCallback(
    (n: number) => setI((cur) => Math.min(last, Math.max(0, typeof n === "number" ? n : cur))),
    [last],
  );
  const next = useCallback(() => setI((c) => Math.min(last, c + 1)), [last]);
  const prev = useCallback(() => setI((c) => Math.max(0, c - 1)), []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      switch (e.key) {
        case "ArrowRight":
        case " ":
        case "PageDown":
        case "j":
          e.preventDefault();
          next();
          break;
        case "ArrowLeft":
        case "PageUp":
        case "k":
          e.preventDefault();
          prev();
          break;
        case "Home":
          go(0);
          break;
        case "End":
          go(last);
          break;
        case "f":
          if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
          else document.exitFullscreen?.();
          break;
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev, go, last]);

  const Slide = SLIDES[i].render;

  return (
    <div className="fixed inset-0 z-50 bg-[var(--bg)] overflow-hidden select-none">
      {/* dotted backdrop (mirrors body) */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          backgroundImage: "radial-gradient(rgba(14,26,38,0.05) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }}
      />

      {/* slide stage */}
      <div className="relative h-full w-full flex items-center justify-center px-6 md:px-16">
        <div key={i} className="w-full max-w-[1180px] deck-rise">
          <Slide />
        </div>
      </div>

      {/* click zones for prev / next */}
      <button
        aria-label="Previous slide"
        onClick={prev}
        disabled={i === 0}
        className="absolute left-0 top-0 h-full w-[18%] cursor-w-resize disabled:cursor-default focus:outline-none"
      />
      <button
        aria-label="Next slide"
        onClick={next}
        disabled={i === last}
        className="absolute right-0 top-0 h-full w-[18%] cursor-e-resize disabled:cursor-default focus:outline-none"
      />

      {/* top-left brand + exit */}
      <div className="absolute top-6 left-6 md:left-8 flex items-center gap-3 z-10">
        <Mark />
        <span className="font-mono text-[11px] tracking-[0.18em] text-[var(--muted)] uppercase">
          {SLIDES[i].kicker}
        </span>
      </div>
      <Link
        href="/"
        className="absolute top-6 right-6 md:right-8 z-10 font-mono text-[11px] text-[var(--muted)] hover:text-[var(--text)] transition-colors"
      >
        exit ✕
      </Link>

      {/* bottom bar: progress dots + counter + hint */}
      <div className="absolute bottom-6 left-0 right-0 px-6 md:px-8 flex items-center justify-between z-10">
        <div className="flex items-center gap-1.5">
          {SLIDES.map((s, idx) => (
            <button
              key={s.kicker + idx}
              aria-label={`Go to slide ${idx + 1}`}
              onClick={() => go(idx)}
              className="group p-1.5"
            >
              <span
                className="block h-1.5 rounded-full transition-all duration-300"
                style={{
                  width: idx === i ? 28 : 8,
                  background: idx === i ? "var(--accent)" : "var(--border-strong)",
                }}
              />
            </button>
          ))}
        </div>
        <div className="hidden md:flex items-center gap-4 font-mono text-[11px] text-[var(--muted)]">
          <span className="opacity-70">← → navigate · F fullscreen</span>
          <span className="text-[var(--text-2)]">
            {String(i + 1).padStart(2, "0")} / {String(SLIDES.length).padStart(2, "0")}
          </span>
        </div>
      </div>
    </div>
  );
}

function Mark() {
  return (
    <span className="flex items-center gap-2">
      <svg viewBox="0 0 32 32" className="w-7 h-7" aria-hidden>
        <defs>
          <linearGradient id="deck-mark" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#0080BC" />
            <stop offset="100%" stopColor="#005A86" />
          </linearGradient>
        </defs>
        <path d="M16 2.5 L28 9 L28 23 L16 29.5 L4 23 L4 9 Z" fill="url(#deck-mark)" stroke="#003E5C" strokeWidth="0.5" />
        <path d="M16 8 L22 12 L22 20 L16 24 L10 20 L10 12 Z" fill="white" opacity="0.92" />
      </svg>
      <span className="text-[18px] font-semibold tracking-tight text-[var(--accent)] lowercase">pns</span>
    </span>
  );
}
