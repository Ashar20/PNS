"use client";

import { useMemo, useState } from "react";
import { namehashHex } from "@pns/sdk";

// Soft pastel palettes — paper-warm, no neon.
const PALETTES: Array<[string, string, string, string]> = [
  ["#C7E1F0", "#F2D58F", "#B6DAEC", "#E9B7D9"], // ocean & peach
  ["#FFD1C2", "#FFEBA3", "#FFB8A8", "#F8C8DC"], // sunset
  ["#C7E8C8", "#FFE8A6", "#A8D8AB", "#D9E8B8"], // meadow
  ["#D9C9F5", "#FAD1E6", "#C2B5F0", "#F3CBE0"], // lilac
  ["#FFD9B0", "#FFE7B5", "#FAB18E", "#E8CFA8"], // amber
  ["#A8D8E0", "#D9F0F4", "#88C7D2", "#C7E9EB"], // mist
  ["#E8B5BA", "#FFD3C2", "#D89FA5", "#F2C2B5"], // rose
];

interface AvatarProps {
  seed: string;
  size?: number;
  text?: string;
  /** Resolver text record `avatar` — image URL shown when load succeeds. */
  imageUrl?: string | null;
  className?: string;
}

export function Avatar({ seed, size = 64, text, imageUrl, className = "" }: AvatarProps) {
  const [imgFailed, setImgFailed] = useState(false);
  const showImage = !!imageUrl?.trim() && !imgFailed;

  const { palette, initials } = useMemo(() => {
    let hex: string;
    try {
      hex = namehashHex(seed);
    } catch {
      hex = "0x" + Array.from(seed).reduce((acc, c) => acc + c.charCodeAt(0).toString(16), "");
    }
    const idx = parseInt(hex.slice(2, 4), 16) % PALETTES.length;
    const label = (text ?? seed.replace(/\.pot$/, "")).slice(0, 2).toUpperCase();
    return { palette: PALETTES[idx], initials: label };
  }, [seed, text]);

  const style: React.CSSProperties = {
    width: size,
    height: size,
    fontSize: size * 0.34,
    "--g1": palette[0],
    "--g2": palette[1],
    "--g3": palette[2],
    "--g4": palette[3],
  } as React.CSSProperties;

  return (
    <div
      className={`pns-avatar rounded-full flex items-center justify-center font-medium text-[var(--text)]/70 overflow-hidden shrink-0 ${className}`}
      style={style}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={imageUrl}
          src={imageUrl!.trim()}
          alt={seed}
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
          onError={() => setImgFailed(true)}
        />
      ) : (
        initials
      )}
    </div>
  );
}

/** Wide banner version — same gradient, rectangular */
export function ProfileBanner({ seed, className = "" }: { seed: string; className?: string }) {
  const palette = useMemo(() => {
    let hex: string;
    try {
      hex = namehashHex(seed);
    } catch {
      hex = "0x00";
    }
    const idx = parseInt(hex.slice(2, 4), 16) % PALETTES.length;
    return PALETTES[idx];
  }, [seed]);

  const style: React.CSSProperties = {
    "--c1": palette[0],
    "--c2": palette[1],
    "--c3": palette[3],
  } as React.CSSProperties;

  return <div className={`profile-banner ${className}`} style={style} />;
}
