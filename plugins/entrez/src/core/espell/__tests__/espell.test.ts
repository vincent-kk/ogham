import { describe, it, expect } from "vitest";

import { shouldRespell } from "../operations/shouldRespell.js";
import { runEspell, type EspellFn } from "../operations/runEspell.js";

describe("shouldRespell", () => {
  it("respells when the union came back empty", () => {
    expect(shouldRespell({ unionTotal: 0 })).toBe(true);
  });

  it("respells when ESearch raised a spelling warning", () => {
    expect(shouldRespell({ unionTotal: 50, hasSpellingWarning: true })).toBe(
      true,
    );
  });

  it("respells when the union total is below the threshold", () => {
    expect(shouldRespell({ unionTotal: 3, threshold: 10 })).toBe(true);
  });

  it("keeps a healthy union (above threshold, no warning)", () => {
    expect(
      shouldRespell({ unionTotal: 100, hasSpellingWarning: false, threshold: 10 }),
    ).toBe(false);
  });

  it("keeps a nonzero union when no threshold and no warning apply", () => {
    expect(shouldRespell({ unionTotal: 5 })).toBe(false);
  });
});

describe("runEspell", () => {
  // Injected fakes stand in for the ESpell adapter so the module stays offline.
  const respondWith =
    (reply: string): EspellFn =>
    async () =>
      reply;

  it("reports a correction when the adapter returns a different string", async () => {
    const result = await runEspell("asthmaa", respondWith("asthma"));
    expect(result).toEqual({
      original: "asthmaa",
      corrected: "asthma",
      hasCorrection: true,
    });
  });

  it("reports no correction when the adapter echoes the input", async () => {
    const result = await runEspell("asthma", respondWith("asthma"));
    expect(result.hasCorrection).toBe(false);
    expect(result.corrected).toBeUndefined();
  });

  it("reports no correction when the adapter returns an empty string", async () => {
    const result = await runEspell("asthma", respondWith(""));
    expect(result.hasCorrection).toBe(false);
    expect(result.corrected).toBeUndefined();
  });
});
