import { existsSync } from "fs";
import { join } from "path";

/** Monorepo root (directory that contains `contracts/` and `packages/`). */
export function findRepoRoot(): string {
  let dir = process.cwd();
  for (let i = 0; i < 8; i++) {
    const wasm = join(dir, "contracts", "community", "target", "ink", "community.wasm");
    if (existsSync(wasm)) return dir;
    const parent = join(dir, "..");
    if (parent === dir) break;
    dir = parent;
  }

  throw new Error(
    "community.wasm not found. From the repo root run: cd contracts/community && cargo contract build --release"
  );
}

export function communityArtifactPaths(root: string): { abiPath: string; wasmPath: string } {
  const base = join(root, "contracts", "community", "target", "ink");
  return {
    abiPath: join(base, "community.json"),
    wasmPath: join(base, "community.wasm"),
  };
}
