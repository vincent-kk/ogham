/** Regression coverage for refusing lens config writes within registered vaults. */
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createDefaultConfig, writeConfig } from "../configLoader.js";
import { configLayers } from "../utils/configLayers.js";

/** Isolated workspace containing every test config and vault. */
let base: string;
/** Registered vault root whose files must remain unchanged. */
let vault: string;
/** Guidance shared by the programmatic writer and the setup skill. */
const guidance =
  "Cannot save lens settings inside a registered vault. Set MAENCOF_LENS_CONFIG_ROOT to a folder outside the vault, or save to the user layer.";

/**
 * Write a raw fixture without invoking config validation or boundary checks.
 * @param path Config path within the isolated workspace.
 * @param document Fixture document to serialize.
 * @returns Nothing; creates fixture parents and writes JSON.
 */
function seed(path: string, document: object): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(document), "utf-8");
}

beforeEach(() => {
  base = mkdtempSync(join(tmpdir(), "lens-write-boundary-"));
  vault = join(base, "vault");
  mkdirSync(vault);
  vi.stubEnv("CLAUDE_CONFIG_DIR", join(base, "host-state"));
});

afterEach(() => {
  vi.unstubAllEnvs();
  rmSync(base, { recursive: true, force: true });
});

describe("writeConfig vault boundary", () => {
  it.each(["", "workspace", "../vault/workspace"])(
    "refuses a project config at a vault-relative folder %s without creating files",
    (folder) => {
      const projectRoot = `${vault}/${folder}`;
      mkdirSync(projectRoot, { recursive: true });
      const before = readdirSync(vault);

      expect(() =>
        writeConfig(
          projectRoot,
          "project",
          createDefaultConfig(vault, "vault"),
        ),
      ).toThrow(guidance);

      expect(readdirSync(vault)).toEqual(before);
      expect(existsSync(join(projectRoot, ".maencof-lens"))).toBe(false);
      expect(existsSync(configLayers(projectRoot).user)).toBe(false);
    },
  );

  it("refuses the user layer when its host-state directory is in a vault", () => {
    vi.stubEnv("CLAUDE_CONFIG_DIR", join(vault, "host-state"));
    const projectRoot = join(base, "project");

    expect(() =>
      writeConfig(projectRoot, "user", createDefaultConfig(vault, "vault")),
    ).toThrow(guidance);

    expect(readdirSync(vault)).toEqual([]);
    expect(existsSync(projectRoot)).toBe(false);
  });

  it.each(["user", "project"] as const)(
    "checks vaults registered in the existing %s layer even when the proposed list replaces them",
    (scope) => {
      const projectRoot = join(vault, "workspace");
      const projectFile = join(projectRoot, ".maencof-lens", "config.json");
      const existingFile =
        scope === "user" ? configLayers(projectRoot).user : projectFile;
      seed(existingFile, createDefaultConfig(vault, "vault"));
      const before = readFileSync(existingFile, "utf-8");

      expect(() =>
        writeConfig(
          projectRoot,
          "project",
          createDefaultConfig(join(base, "other-vault"), "other"),
        ),
      ).toThrow(guidance);

      expect(readFileSync(existingFile, "utf-8")).toBe(before);
      if (scope === "user") expect(existsSync(projectFile)).toBe(false);
    },
  );

  it("checks proposed user vaults even when the project list overrides them", () => {
    vi.stubEnv("CLAUDE_CONFIG_DIR", join(vault, "host-state"));
    const projectRoot = join(base, "project");
    seed(
      join(projectRoot, ".maencof-lens", "config.json"),
      createDefaultConfig(join(base, "other-vault"), "other"),
    );

    expect(() =>
      writeConfig(projectRoot, "user", createDefaultConfig(vault, "vault")),
    ).toThrow(guidance);

    expect(readdirSync(vault)).toEqual([]);
  });

  it("gives relocation guidance when removing every vault from an inside config", () => {
    const projectFile = join(vault, ".maencof-lens", "config.json");
    seed(projectFile, createDefaultConfig(vault, "vault"));
    const before = readFileSync(projectFile, "utf-8");

    expect(() =>
      writeConfig(vault, "project", { version: "1.0", vaults: [] }),
    ).toThrow(guidance);

    expect(readFileSync(projectFile, "utf-8")).toBe(before);
  });

  it("allows a sibling folder with the same path prefix", () => {
    const projectRoot = join(base, "vault-other");
    const config = createDefaultConfig(vault, "vault");

    const written = writeConfig(projectRoot, "project", config);

    expect(written).toBe(join(projectRoot, ".maencof-lens", "config.json"));
    expect(JSON.parse(readFileSync(written, "utf-8"))).toEqual(config);
    expect(existsSync(configLayers(projectRoot).user)).toBe(false);
    expect(readdirSync(vault)).toEqual([]);
  });

  it("allows an explicitly chosen user layer outside the vault", () => {
    const config = createDefaultConfig(vault, "vault");

    const written = writeConfig(vault, "user", config);

    expect(written).toBe(configLayers(vault).user);
    expect(JSON.parse(readFileSync(written, "utf-8"))).toEqual(config);
    expect(readdirSync(vault)).toEqual([]);
  });

  it("rejects a project root symlink into the vault", () => {
    const alias = join(base, "alias");
    symlinkSync(vault, alias, "dir");

    expect(() =>
      writeConfig(alias, "project", createDefaultConfig(vault, "vault")),
    ).toThrow(guidance);

    expect(readdirSync(vault)).toEqual([]);
  });

  it("rejects a config directory symlink into the vault", () => {
    const projectRoot = join(base, "project");
    mkdirSync(projectRoot);
    symlinkSync(vault, join(projectRoot, ".maencof-lens"), "dir");

    expect(() =>
      writeConfig(projectRoot, "project", createDefaultConfig(vault, "vault")),
    ).toThrow(guidance);

    expect(readdirSync(vault)).toEqual([]);
  });

  it("rejects a lexical vault destination even when its config directory points outside", () => {
    const outside = join(base, "outside");
    mkdirSync(outside);
    symlinkSync(outside, join(vault, ".maencof-lens"), "dir");

    expect(() =>
      writeConfig(vault, "project", createDefaultConfig(vault, "vault")),
    ).toThrow(guidance);

    expect(readdirSync(outside)).toEqual([]);
  });
});
