/**
 * Full-stack integration tests — run against a live substrate-contracts-node
 * with contracts already deployed (run scripts/deploy.ts first).
 *
 * These tests intentionally exercise real chain calls; no mocking.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { ApiPromise, WsProvider, Keyring } from "@polkadot/api";
import { cryptoWaitReady } from "@polkadot/util-crypto";
import { readFileSync } from "fs";
import { join } from "path";
import { PNSClient } from "../src/client.js";
import { LOCAL_ADDRESSES } from "../src/constants/local.js";
import { namehash, normaliseName } from "../src/namehash.js";

const ROOT = join(import.meta.dirname, "../../..");

function loadAbi(name: string) {
  return JSON.parse(
    readFileSync(join(ROOT, `contracts/${name}/target/ink/${name}.json`), "utf8")
  );
}

let client: PNSClient;
let alice: ReturnType<Keyring["addFromUri"]>;
let bob: ReturnType<Keyring["addFromUri"]>;

beforeAll(async () => {
  await cryptoWaitReady();
  const keyring = new Keyring({ type: "sr25519", ss58Format: 42 });
  alice = keyring.addFromUri("//Alice");
  bob = keyring.addFromUri("//Bob");

  client = new PNSClient({ addresses: LOCAL_ADDRESSES });
  await client.connect();
  client.setAbis({
    registry: loadAbi("registry"),
    resolver: loadAbi("resolver"),
    reverse: loadAbi("reverse"),
    registrar: loadAbi("registrar"),
    community: loadAbi("community"),
    attestation: loadAbi("attestation"),
  });
}, 30_000);

afterAll(async () => {
  await client.disconnect();
});

// Use a unique suffix so repeated runs don't collide on the same node state
const RUN_ID = Date.now().toString(36);
const TEST_LABEL = `testrun${RUN_ID}`;

describe("Registry contract", () => {
  it("recordExists returns false for an unregistered name", async () => {
    const { recordExists } = await import("../src/contracts/registry.js");
    const node = namehash(`${TEST_LABEL}notexist.pot`);
    const caller = alice.address;
    const exists = await recordExists(
      client.api,
      LOCAL_ADDRESSES.registry,
      loadAbi("registry"),
      node,
      caller
    );
    expect(exists).toBe(false);
  }, 15_000);
});

describe("Name registration flow", () => {
  it("registers a new .pot name and resolves it", async () => {
    const label = TEST_LABEL;
    const result = await client.registerName(label, alice.address, alice);
    expect(result.blockHash).toBeTruthy();

    // Query owner via registry
    const { getOwner } = await import("../src/contracts/registry.js");
    const node = namehash(normaliseName(`${label}.pot`));
    const owner = await getOwner(
      client.api,
      LOCAL_ADDRESSES.registry,
      loadAbi("registry"),
      node,
      alice.address
    );
    expect(owner).toBe(alice.address);
  }, 60_000);

  it("resolveName returns the registered owner", async () => {
    const resolved = await client.resolveName(`${TEST_LABEL}.pot`);
    expect(resolved.owner).toBe(alice.address);
  }, 30_000);
});

describe("Resolver: text records", () => {
  it("sets and retrieves a text record", async () => {
    const { setText, getText } = await import("../src/contracts/resolver.js");
    const node = namehash(normaliseName(`${TEST_LABEL}.pot`));
    const abi = loadAbi("resolver");

    await setText(
      client.api,
      LOCAL_ADDRESSES.resolver,
      abi,
      node,
      "com.twitter",
      "@pnstest",
      alice
    );

    const val = await getText(
      client.api,
      LOCAL_ADDRESSES.resolver,
      abi,
      node,
      "com.twitter",
      alice.address
    );
    expect(val).toBe("@pnstest");
  }, 60_000);

  it("getText returns null for a key that was never set", async () => {
    const { getText } = await import("../src/contracts/resolver.js");
    const node = namehash(normaliseName(`${TEST_LABEL}.pot`));
    const val = await getText(
      client.api,
      LOCAL_ADDRESSES.resolver,
      loadAbi("resolver"),
      node,
      "nonexistent.key",
      alice.address
    );
    expect(val).toBeNull();
  }, 15_000);
});

describe("Resolver: addr record", () => {
  it("sets and retrieves an addr record", async () => {
    const { setAddr, getAddr } = await import("../src/contracts/resolver.js");
    const node = namehash(normaliseName(`${TEST_LABEL}.pot`));
    const abi = loadAbi("resolver");

    await setAddr(
      client.api,
      LOCAL_ADDRESSES.resolver,
      abi,
      node,
      alice.address,
      alice
    );

    const addr = await getAddr(
      client.api,
      LOCAL_ADDRESSES.resolver,
      abi,
      node,
      alice.address
    );
    expect(addr).toBe(alice.address);
  }, 60_000);
});

describe("Attestation contract", () => {
  it("issues an attestation and retrieves it", async () => {
    const { attest, getAttestation, listBySubject } = await import(
      "../src/contracts/attestation.js"
    );
    const abi = loadAbi("attestation");
    const issuerNode = namehash(normaliseName(`${TEST_LABEL}.pot`));
    // subject = bob's hypothetical name (doesn't need to be registered for attestation)
    const subjectNode = namehash(normaliseName(`subject${RUN_ID}.pot`));
    const schema = "endorsement.skill";
    const payload = new TextEncoder().encode("rust");

    const result = await attest(
      client.api,
      LOCAL_ADDRESSES.attestation,
      abi,
      issuerNode,
      subjectNode,
      schema,
      payload,
      alice
    );
    expect(result.blockHash).toBeTruthy();
    expect(result.id).toBeGreaterThanOrEqual(0n);

    const record = await getAttestation(
      client.api,
      LOCAL_ADDRESSES.attestation,
      abi,
      result.id,
      alice.address
    );
    expect(record).not.toBeNull();
    expect(record!.schema).toBe(schema);
    expect(record!.revoked).toBe(false);

    const ids = await listBySubject(
      client.api,
      LOCAL_ADDRESSES.attestation,
      abi,
      subjectNode,
      schema,
      alice.address
    );
    expect(ids).toContain(result.id);
  }, 60_000);
});
