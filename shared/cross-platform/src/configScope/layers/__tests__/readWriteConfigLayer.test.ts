import {
  mkdtempSync,
  mkdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { ConfigLayerPaths } from "../../types/types.js";
import { readConfigLayers, writeConfigLayer } from "../index.js";

let root: string;
let layers: ConfigLayerPaths;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "config-scope-"));
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

describe("readConfigLayers", () => {
  it("reports both layers absent without warning", () => {
    expect(readConfigLayers(layers)).toEqual({
      user: null,
      project: null,
      warnings: [],
    });
  });

  it("reads the user layer alone", () => {
    seed(layers.user, '{"theme":"dark"}');

    const documents = readConfigLayers(layers);

    expect(documents.user).toEqual({ theme: "dark" });
    expect(documents.project).toBeNull();
  });

  it("reads the project layer alone", () => {
    seed(layers.project as string, '{"theme":"light"}');

    const documents = readConfigLayers(layers);

    expect(documents.user).toBeNull();
    expect(documents.project).toEqual({ theme: "light" });
  });

  it("returns null with a warning for damaged JSON instead of throwing", () => {
    seed(layers.user, "{ not json");

    const documents = readConfigLayers(layers);

    expect(documents.user).toBeNull();
    expect(documents.warnings).toHaveLength(1);
    expect(documents.warnings[0]).toContain("failed to parse JSON");
  });

  it("rejects a top-level array with a warning", () => {
    seed(layers.user, "[1,2,3]");

    const documents = readConfigLayers(layers);

    expect(documents.user).toBeNull();
    expect(documents.warnings[0]).toContain("must be a JSON object");
  });

  it("rejects a top-level string with a warning", () => {
    seed(layers.user, '"just a string"');

    const documents = readConfigLayers(layers);

    expect(documents.user).toBeNull();
    expect(documents.warnings[0]).toContain("must be a JSON object");
  });

  it("keeps an unsafe key in the raw document but warns about it", () => {
    // 정화는 병합이 담당한다. 읽기 계층은 파일에 있는 그대로를 보여준다.
    seed(layers.user, '{"__proto__":{"polluted":"x"},"theme":"dark"}');

    const documents = readConfigLayers(layers);

    expect(documents.user).not.toBeNull();
    expect(Object.hasOwn(documents.user as object, "__proto__")).toBe(true);
    expect(documents.warnings).toHaveLength(1);
    expect(documents.warnings[0]).toContain('unsafe key "__proto__"');
  });

  it("reports a nested unsafe key by dot path", () => {
    seed(layers.user, '{"a":{"constructor":1}}');

    expect(readConfigLayers(layers).warnings[0]).toContain(
      'unsafe key "a.constructor"',
    );
  });

  it("skips the project layer entirely when its path is null", () => {
    const documents = readConfigLayers({ user: layers.user, project: null });

    expect(documents.project).toBeNull();
    expect(documents.warnings).toEqual([]);
  });
});

describe("writeConfigLayer", () => {
  it("round-trips a user document", () => {
    writeConfigLayer(layers, "user", { theme: "dark" });

    expect(readConfigLayers(layers).user).toEqual({ theme: "dark" });
  });

  it("creates the missing project directory", () => {
    const written = writeConfigLayer(layers, "project", { theme: "light" });

    expect(written).toBe(layers.project);
    expect(readConfigLayers(layers).project).toEqual({ theme: "light" });
  });

  it("throws rather than silently writing user when project has no path", () => {
    expect(() =>
      writeConfigLayer({ user: layers.user, project: null }, "project", {}),
    ).toThrow(/no project root/);
  });

  it.skipIf(process.platform === "win32")(
    "applies an owner-only file mode when asked",
    () => {
      writeConfigLayer(
        layers,
        "user",
        { token: "secret" },
        { fileMode: 0o600 },
      );

      expect(statSync(layers.user).mode & 0o777).toBe(0o600);
    },
  );

  it.skipIf(process.platform === "win32")(
    "applies an owner-only directory mode when asked",
    () => {
      writeConfigLayer(
        layers,
        "project",
        { theme: "dark" },
        { directoryMode: 0o700 },
      );

      expect(statSync(join(layers.project as string, "..")).mode & 0o777).toBe(
        0o700,
      );
    },
  );
});
