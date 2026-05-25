import { keccakAsU8a } from "@polkadot/util-crypto";
import { u8aToHex } from "@polkadot/util";

/**
 * UTS46-normalise a DNS label: lowercase, NFKC, reject non-ASCII after fold.
 * Full UTS46 with IDNA2008 is done server-side; this is a client-side guard.
 */
export function normaliseLabel(label: string): string {
  const folded = label.normalize("NFKC").toLowerCase();
  if (!/^[a-z0-9-]+$/.test(folded)) {
    throw new Error(`Invalid label: "${label}" — must be lowercase alphanumeric or hyphen after UTS46 fold`);
  }
  if (folded.startsWith("-") || folded.endsWith("-")) {
    throw new Error(`Invalid label: "${label}" — cannot start or end with hyphen`);
  }
  return folded;
}

/**
 * Normalise a full dotted name. Each label is independently normalised.
 * The root empty string passes through (used in the zero node).
 */
export function normaliseName(name: string): string {
  if (name === "") return "";
  return name
    .split(".")
    .map((label) => normaliseLabel(label))
    .join(".");
}

export function keccak256(input: Uint8Array): Uint8Array<ArrayBuffer> {
  return keccakAsU8a(input) as Uint8Array<ArrayBuffer>;
}

/**
 * ENS-compatible namehash.
 * Empty name → 32 zero bytes.
 * Otherwise: split on ".", process labels right-to-left,
 *   node = keccak256(node ++ keccak256(label))
 */
export function namehash(name: string): Uint8Array {
  if (name === "") return new Uint8Array(32);
  const labels = name.split(".");
  let node = new Uint8Array(32);
  for (let i = labels.length - 1; i >= 0; i--) {
    const labelHash = keccak256(new TextEncoder().encode(labels[i]));
    const combined = new Uint8Array(64);
    combined.set(node, 0);
    combined.set(labelHash, 32);
    node = keccak256(combined);
  }
  return node;
}

export function namehashHex(name: string): string {
  return u8aToHex(namehash(name));
}

export function labelHash(label: string): Uint8Array {
  return keccak256(new TextEncoder().encode(label));
}
