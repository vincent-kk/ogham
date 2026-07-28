import { describe, expect, it } from "vitest";

import { listOverriddenPaths } from "../index.js";

describe("listOverriddenPaths", () => {
  it("returns nothing for an absent layer", () => {
    expect(listOverriddenPaths(null)).toEqual([]);
  });

  it("lists a top-level leaf", () => {
    expect(listOverriddenPaths({ theme: "dark" })).toEqual(["theme"]);
  });

  it("joins nested keys with dots", () => {
    expect(listOverriddenPaths({ renderers: { mermaid: false } })).toEqual([
      "renderers.mermaid",
    ]);
  });

  it("treats an array as a leaf because it is the replacement unit", () => {
    expect(listOverriddenPaths({ vaults: [{ name: "a" }] })).toEqual(["vaults"]);
  });

  it("treats an empty object as a leaf", () => {
    expect(listOverriddenPaths({ renderers: {} })).toEqual(["renderers"]);
  });

  it("treats an explicit null as a leaf", () => {
    expect(listOverriddenPaths({ font: null })).toEqual(["font"]);
  });

  it("lists every sibling leaf", () => {
    expect(
      listOverriddenPaths({ a: 1, b: { c: 2, d: { e: 3 } } }).slice().sort(),
    ).toEqual(["a", "b.c", "b.d.e"]);
  });

  it("skips forbidden keys so the UI never offers to clear them", () => {
    const layer = JSON.parse(
      '{"__proto__":{"polluted":"x"},"constructor":1,"theme":"dark"}',
    ) as Record<string, unknown>;

    expect(listOverriddenPaths(layer)).toEqual(["theme"]);
  });
});
