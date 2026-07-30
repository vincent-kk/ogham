import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { ConfigLayerPaths } from "@ogham/cross-platform";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  loadConfig,
  loadConfigScope,
  saveConfig,
} from "../core/configManager/index.js";

let root: string;
let layers: ConfigLayerPaths;
let counter = 0;

const SITE = {
  base_url: "https://user.atlassian.net",
  is_cloud: true,
  ssl_verify: true,
  timeout: 30000,
};

beforeEach(async () => {
  counter += 1;
  root = join(tmpdir(), `atlassian-scope-${Date.now()}-${counter}`);
  await mkdir(root, { recursive: true });
  layers = {
    user: join(root, "user", "config.json"),
    project: join(root, "workspace", ".atlassian", "config.json"),
  };
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

async function seed(
  path: string,
  document: Record<string, unknown>,
): Promise<void> {
  await mkdir(join(path, ".."), { recursive: true });
  await writeFile(path, JSON.stringify(document), "utf-8");
}

/**
 * The site config now resolves across two layers, so one repository can point
 * at a different Atlassian instance than the person's default. Credentials
 * stay user-only and are deliberately not layered — that is the point.
 */
describe("config namespaces", () => {
  it("returns an empty config when neither layer exists", async () => {
    await expect(loadConfig(layers)).resolves.toEqual({});
  });

  it("uses the user layer alone", async () => {
    await seed(layers.user, { jira: [SITE] });

    const config = await loadConfig(layers);
    expect(config.jira?.[0]?.base_url).toBe("https://user.atlassian.net");
  });

  it("lets the project layer point at a different site", async () => {
    await seed(layers.user, { jira: [SITE] });
    await seed(layers.project as string, {
      jira: [{ ...SITE, base_url: "https://project.atlassian.net" }],
    });

    const config = await loadConfig(layers);
    expect(config.jira?.[0]?.base_url).toBe("https://project.atlassian.net");
  });

  it("replaces the site list wholesale rather than concatenating", async () => {
    await seed(layers.user, {
      jira: [SITE, { ...SITE, base_url: "https://second.atlassian.net" }],
    });
    await seed(layers.project as string, {
      jira: [{ ...SITE, base_url: "https://only.atlassian.net" }],
    });

    const config = await loadConfig(layers);
    expect(config.jira).toHaveLength(1);
  });

  it("keeps a service the project layer did not mention", async () => {
    await seed(layers.user, { jira: [SITE], confluence: [SITE] });
    await seed(layers.project as string, {
      jira: [{ ...SITE, base_url: "https://project.atlassian.net" }],
    });

    const config = await loadConfig(layers);
    expect(config.confluence?.[0]?.base_url).toBe("https://user.atlassian.net");
  });

  it("writes each layer without disturbing the other", async () => {
    await saveConfig("user", { jira: [SITE] }, layers);
    await saveConfig(
      "project",
      { jira: [{ ...SITE, base_url: "https://project.atlassian.net" }] },
      layers,
    );

    const user = JSON.parse(await readFile(layers.user, "utf-8")) as {
      jira: { base_url: string }[];
    };
    expect(user.jira[0]?.base_url).toBe("https://user.atlassian.net");
    expect(loadConfigScope(layers).overridden).toEqual(["jira"]);
  });

  it.skipIf(process.platform === "win32")(
    "writes both layers owner-only",
    async () => {
      await saveConfig("user", { jira: [SITE] }, layers);
      await saveConfig("project", { jira: [SITE] }, layers);

      expect((await stat(layers.user)).mode & 0o777).toBe(0o600);
      expect((await stat(layers.project as string)).mode & 0o777).toBe(0o600);
    },
  );

  it("drops an ignore file beside the project layer on creation", async () => {
    await saveConfig("project", { jira: [SITE] }, layers);

    const ignore = await readFile(
      join(layers.project as string, "..", ".gitignore"),
      "utf-8",
    );
    // Both files are listed: credentials are user-only today, and the line
    // costs nothing while making a future mistake visible.
    expect(ignore).toContain("config.json");
    expect(ignore).toContain("credentials.json");
  });

  it("leaves an existing ignore file exactly as found", async () => {
    const directory = join(layers.project as string, "..");
    await mkdir(directory, { recursive: true });
    await writeFile(join(directory, ".gitignore"), "# ours\n", "utf-8");

    await saveConfig("project", { jira: [SITE] }, layers);

    expect(await readFile(join(directory, ".gitignore"), "utf-8")).toBe(
      "# ours\n",
    );
  });
});
