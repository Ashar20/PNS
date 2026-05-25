import { describe, it, expect } from "vitest";
import { namehash, normaliseLabel, normaliseName, labelHash } from "../src/namehash.js";
import { u8aToHex } from "@polkadot/util";

describe("namehash", () => {
  it("empty string returns 32 zero bytes", () => {
    expect(namehash("")).toEqual(new Uint8Array(32));
  });

  it("is deterministic", () => {
    expect(namehash("alice.pot")).toEqual(namehash("alice.pot"));
  });

  it("different names produce different hashes", () => {
    expect(u8aToHex(namehash("alice.pot"))).not.toBe(u8aToHex(namehash("bob.pot")));
  });

  it("subname differs from parent", () => {
    expect(u8aToHex(namehash("alice.bandit-dao.pot"))).not.toBe(
      u8aToHex(namehash("bandit-dao.pot"))
    );
  });

  it("matches ENS reference vector for 'eth'", () => {
    // Reference: namehash("eth") from ENS docs
    const expected = "0x93cdeb708b7545dc668eb9280176169d1c33cfd8ed6f04690a0bcc88a93fc4ae";
    expect(u8aToHex(namehash("eth"))).toBe(expected);
  });

  it("matches ENS reference vector for 'foo.eth'", () => {
    const expected = "0xde9b09fd7c5f901e23a3f19fecc54828e9c848539801e86591bd9801b019f84f";
    expect(u8aToHex(namehash("foo.eth"))).toBe(expected);
  });
});

describe("normaliseLabel", () => {
  it("lowercases ASCII", () => {
    expect(normaliseLabel("ALICE")).toBe("alice");
  });

  it("rejects labels with spaces", () => {
    expect(() => normaliseLabel("hello world")).toThrow();
  });

  it("rejects leading hyphen", () => {
    expect(() => normaliseLabel("-alice")).toThrow();
  });

  it("rejects trailing hyphen", () => {
    expect(() => normaliseLabel("alice-")).toThrow();
  });

  it("accepts valid hyphenated label", () => {
    expect(normaliseLabel("bandit-dao")).toBe("bandit-dao");
  });
});

describe("normaliseName", () => {
  it("normalises each label independently", () => {
    expect(normaliseName("Alice.POT")).toBe("alice.pot");
  });

  it("empty string passthrough", () => {
    expect(normaliseName("")).toBe("");
  });
});

describe("roleToProxyType", () => {
  it("maps roles correctly", async () => {
    const { roleToProxyType } = await import("../src/pallets/proxy.js");
    expect(roleToProxyType("admin")).toBe("Any");
    expect(roleToProxyType("treasurer")).toBe("NonTransfer");
    expect(roleToProxyType("voter")).toBe("Governance");
    expect(roleToProxyType("staker")).toBe("Staking");
    expect(roleToProxyType("judge")).toBe("IdentityJudgement");
  });

  it("throws for unknown role", async () => {
    const { roleToProxyType } = await import("../src/pallets/proxy.js");
    expect(() => roleToProxyType("unknown-role")).toThrow();
  });
});
