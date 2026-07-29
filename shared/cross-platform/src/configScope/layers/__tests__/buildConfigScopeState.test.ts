import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { ConfigLayerPaths } from "../../types/types.js";
import { buildConfigScopeState } from "../index.js";

let root: string;
let layers: ConfigLayerPaths;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "config-scope-state-"));
  layers = {
    user: join(root, "user", "config.json"),
    project: join(root, "project", ".plugin", "config.json"),
  };
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

function seed(path: string, body: string): void {
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(path, body, "utf8");
}

describe("buildConfigScopeState", () => {
  it("reports an empty effective config when both layers are absent", () => {
    const state = buildConfigScopeState(layers);

    expect(state.effective).toEqual({});
    expect(state.overridden).toEqual([]);
    expect(state.warnings).toEqual([]);
    expect(state.paths).toBe(layers);
  });

  it("passes the user layer through when nothing overrides it", () => {
    seed(layers.user, '{"theme":"dark","port":0}');

    const state = buildConfigScopeState(layers);

    expect(state.effective).toEqual({ theme: "dark", port: 0 });
    expect(state.overridden).toEqual([]);
  });

  it("lets the project layer win and lists what it overrode", () => {
    seed(layers.user, '{"theme":"dark","port":0}');
    seed(layers.project as string, '{"theme":"light"}');

    const state = buildConfigScopeState(layers);

    expect(state.effective).toEqual({ theme: "light", port: 0 });
    expect(state.overridden).toEqual(["theme"]);
    expect(state.layers.user).toEqual({ theme: "dark", port: 0 });
    expect(state.layers.project).toEqual({ theme: "light" });
  });

  it("reports a nested partial override by dot path", () => {
    seed(layers.user, '{"renderers":{"mermaid":true,"math":true}}');
    seed(layers.project as string, '{"renderers":{"math":false}}');

    const state = buildConfigScopeState(layers);

    expect(state.effective).toEqual({
      renderers: { mermaid: true, math: false },
    });
    expect(state.overridden).toEqual(["renderers.math"]);
  });

  it("falls back to the user layer when the project layer is damaged", () => {
    seed(layers.user, '{"theme":"dark"}');
    seed(layers.project as string, "{ broken");

    const state = buildConfigScopeState(layers);

    expect(state.effective).toEqual({ theme: "dark" });
    expect(state.warnings).toHaveLength(1);
  });

  it("survives an unsafe key on disk end to end", () => {
    // 디스크 → 파싱 → 병합 → 상태 조립 전 구간을 한 번에 덮는 케이스.
    seed(layers.user, '{"theme":"dark"}');
    seed(layers.project as string, '{"__proto__":{"polluted":"x"}}');

    const state = buildConfigScopeState(layers);

    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    expect(Object.getPrototypeOf(state.effective)).toBe(Object.prototype);
    expect(
      (state.effective as { polluted?: unknown }).polluted,
    ).toBeUndefined();
    expect(state.effective).toEqual({ theme: "dark" });
    expect(state.overridden).toEqual([]);
    expect(state.warnings).toHaveLength(1);
  });

  it("hands the effective config out as a separate object from the layers", () => {
    seed(layers.user, '{"theme":"dark"}');

    const state = buildConfigScopeState(layers);

    expect(state.effective).not.toBe(state.layers.user);
  });
});
