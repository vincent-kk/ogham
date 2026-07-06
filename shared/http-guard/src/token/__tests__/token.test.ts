import { describe, expect, it } from "vitest";

import { generateToken } from "../generateToken.js";
import { verifyToken } from "../verifyToken.js";

describe("session token", () => {
  // --- basic ---

  it("generateToken returns a 32-char hex string", () => {
    const token = generateToken();
    expect(token).toMatch(/^[0-9a-f]{32}$/);
  });

  it("verifyToken accepts an equal pair", () => {
    expect(verifyToken("deadbeef", "deadbeef")).toBe(true);
  });

  it("verifyToken rejects a mismatched pair", () => {
    expect(verifyToken("deadbeef", "feedface")).toBe(false);
  });

  // --- complex ---

  it("generateToken yields a fresh value each call", () => {
    expect(generateToken()).not.toBe(generateToken());
  });

  it("verifyToken rejects on length mismatch without throwing", () => {
    expect(verifyToken("short", "muchlongertoken")).toBe(false);
  });

  it("verifyToken rejects an empty provided token against a real one", () => {
    expect(verifyToken(generateToken(), "")).toBe(false);
  });
});
