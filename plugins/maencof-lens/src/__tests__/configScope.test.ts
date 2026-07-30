import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { beforeEach, describe, expect, it } from "vitest";

import { configLayers } from "../config/configLoader/utils/configLayers.js";
import {
  loadConfig,
  loadConfigScope,
  writeConfig,
} from "../config/configLoader/index.js";

let projectRoot: string;
let userDir: string;

const USER_VAULT = {
  name: "personal",
  path: "/vaults/personal",
  layers: [2, 3],
  default: true,
};
const PROJECT_VAULT = {
  name: "team",
  path: "/vaults/team",
  layers: [2],
  default: true,
};

beforeEach(() => {
  projectRoot = mkdtempSync(join(tmpdir(), "lens-scope-"));
  userDir = mkdtempSync(join(tmpdir(), "lens-user-"));
  process.env.CLAUDE_CONFIG_DIR = userDir;
});

function seed(path: string, document: Record<string, unknown>): void {
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(path, JSON.stringify(document), "utf8");
}

/**
 * Vault configuration now resolves across two layers, so a repository can
 * point at its own vault without disturbing the vaults a person uses
 * everywhere else.
 */
describe("config namespaces", () => {
  it("returns null when neither layer exists", () => {
    expect(loadConfig(projectRoot)).toBeNull();
  });

  it("uses the user layer when the project has none", () => {
    seed(configLayers(projectRoot).user, {
      version: "1.0",
      vaults: [USER_VAULT],
    });

    expect(loadConfig(projectRoot)?.vaults[0]?.name).toBe("personal");
  });

  it("replaces the vault list wholesale when the project names one", () => {
    seed(configLayers(projectRoot).user, {
      version: "1.0",
      vaults: [USER_VAULT],
    });
    seed(configLayers(projectRoot).project as string, {
      version: "1.0",
      vaults: [PROJECT_VAULT],
    });

    const config = loadConfig(projectRoot);
    // Arrays replace rather than concatenate — that is what lets a project
    // narrow the vault set instead of only adding to it.
    expect(config?.vaults).toHaveLength(1);
    expect(config?.vaults[0]?.name).toBe("team");
  });

  it("keeps the personal vaults when the project layer omits the key", () => {
    seed(configLayers(projectRoot).user, {
      version: "1.0",
      vaults: [USER_VAULT],
    });
    seed(configLayers(projectRoot).project as string, { version: "1.0" });

    expect(loadConfig(projectRoot)?.vaults[0]?.name).toBe("personal");
  });

  it("writes each layer without disturbing the other", () => {
    writeConfig(projectRoot, "user", { version: "1.0", vaults: [USER_VAULT] });
    const written = writeConfig(projectRoot, "project", {
      version: "1.0",
      vaults: [PROJECT_VAULT],
    });

    expect(written).toBe(join(projectRoot, ".maencof-lens", "config.json"));
    const user = JSON.parse(
      readFileSync(configLayers(projectRoot).user, "utf8"),
    ) as { vaults: { name: string }[] };
    expect(user.vaults[0]?.name).toBe("personal");
  });

  it("reports the vault list as overridden when the project names it", () => {
    seed(configLayers(projectRoot).user, {
      version: "1.0",
      vaults: [USER_VAULT],
    });
    seed(configLayers(projectRoot).project as string, {
      version: "1.0",
      vaults: [PROJECT_VAULT],
    });

    expect(loadConfigScope(projectRoot).overridden).toContain("vaults");
  });
});
