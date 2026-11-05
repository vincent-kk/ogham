/** Regression coverage for validation of the effective configuration before saving. */
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { LensConfig } from "../../configSchema/index.js";
import { writeConfig } from "../configLoader.js";
import { configLayers } from "../utils/configLayers.js";

/** Isolated project and host-state root removed after every case. */
let projectRoot: string;
/** Canonical project-layer path used to detect writes before validation. */
let projectFile: string;
/** Guard-valid config with empty layers to expose unintended normalization. */
const validConfig: LensConfig = {
  version: "1.0",
  vaults: [
    { name: "personal", path: "/vaults/personal", layers: [], default: false },
  ],
};
/** Invalid effective configuration whose empty vault list must be rejected. */
const emptyConfig: LensConfig = { version: "1.0", vaults: [] };

/**
 * Seed a raw disk layer without going through the operation under test.
 * @param path Absolute config-layer path under the isolated test root.
 * @param document Raw document to serialize without validation.
 * @returns Nothing; creates the parent directory and writes fixture JSON.
 */
function seed(path: string, document: object): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(document), "utf-8");
}

beforeEach(() => {
  projectRoot = mkdtempSync(join(tmpdir(), "lens-write-validation-"));
  projectFile = join(projectRoot, ".maencof-lens", "config.json");
  vi.stubEnv("CLAUDE_CONFIG_DIR", join(projectRoot, "host-state"));
});

afterEach(() => {
  vi.unstubAllEnvs();
  rmSync(projectRoot, { recursive: true, force: true });
});

describe("writeConfig merged validation", () => {
  it("rejects an empty project vault list without creating a config file", () => {
    expect(() => writeConfig(projectRoot, "project", emptyConfig)).toThrow(
      "Cannot write project config: merged configuration has no valid vault list.",
    );
    expect(existsSync(projectFile)).toBe(false);
  });

  it("preserves an existing layer when the proposed merge is invalid", () => {
    seed(projectFile, validConfig);
    const before = readFileSync(projectFile, "utf-8");

    expect(() => writeConfig(projectRoot, "project", emptyConfig)).toThrow();

    expect(readFileSync(projectFile, "utf-8")).toBe(before);
  });

  it("stores the input unchanged without normalizing its fields", () => {
    const written = writeConfig(projectRoot, "project", validConfig);

    expect(written).toBe(projectFile);
    expect(JSON.parse(readFileSync(written, "utf-8"))).toEqual(validConfig);
  });

  it("accepts an empty user vault list when project overrides it with valid vaults", () => {
    seed(projectFile, validConfig);

    const written = writeConfig(projectRoot, "user", emptyConfig);

    expect(written).toBe(configLayers(projectRoot).user);
    expect(JSON.parse(readFileSync(written, "utf-8"))).toEqual(emptyConfig);
    expect(JSON.parse(readFileSync(projectFile, "utf-8"))).toEqual(validConfig);
  });

  it("rejects a valid user document when project overrides it with an empty list", () => {
    seed(projectFile, emptyConfig);
    const userFile = configLayers(projectRoot).user;

    expect(() => writeConfig(projectRoot, "user", validConfig)).toThrow(
      "Cannot write user config: merged configuration has no valid vault list.",
    );

    expect(existsSync(userFile)).toBe(false);
    expect(JSON.parse(readFileSync(projectFile, "utf-8"))).toEqual(emptyConfig);
  });

  it("rejects an empty project override despite a valid user document", () => {
    seed(configLayers(projectRoot).user, validConfig);

    expect(() => writeConfig(projectRoot, "project", emptyConfig)).toThrow();

    expect(existsSync(projectFile)).toBe(false);
    expect(
      JSON.parse(readFileSync(configLayers(projectRoot).user, "utf-8")),
    ).toEqual(validConfig);
  });
});
