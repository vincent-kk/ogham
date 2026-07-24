import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import { claimSessionStartOnce } from "../sessionOnce.js";

describe("claimSessionStartOnce", () => {
  it("claims once per conversation, then declines the same pair", () => {
    const conv = randomUUID();
    expect(claimSessionStartOnce(conv, "/plugins/filid/bridge/setup.mjs")).toBe(
      true,
    );
    expect(claimSessionStartOnce(conv, "/plugins/filid/bridge/setup.mjs")).toBe(
      false,
    );
  });

  it("keys on the handler path, so each plugin's SessionStart claims separately", () => {
    const conv = randomUUID();
    expect(claimSessionStartOnce(conv, "/plugins/a/bridge/setup.mjs")).toBe(
      true,
    );
    expect(claimSessionStartOnce(conv, "/plugins/b/bridge/setup.mjs")).toBe(
      true,
    );
  });

  it("treats a different conversation as a fresh claim", () => {
    const target = "/plugins/filid/bridge/setup.mjs";
    expect(claimSessionStartOnce(randomUUID(), target)).toBe(true);
    expect(claimSessionStartOnce(randomUUID(), target)).toBe(true);
  });

  it("cannot dedupe without a conversation id, so it always claims", () => {
    const target = "/plugins/filid/bridge/setup.mjs";
    expect(claimSessionStartOnce("", target)).toBe(true);
    expect(claimSessionStartOnce("", target)).toBe(true);
  });
});
