import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { type ConfigLayerPaths, env } from "@ogham/cross-platform";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { loadConfig } from "../operations/loadConfig.js";
import { loadConfigScope } from "../operations/loadConfigScope.js";
import { saveConfig } from "../operations/saveConfig.js";

let root: string;
let layers: ConfigLayerPaths;
let counter = 0;

beforeEach(async () => {
  counter += 1;
  root = join(tmpdir(), `entrez-scope-${Date.now()}-${counter}`);
  await mkdir(root, { recursive: true });
  layers = {
    user: join(root, "user", "config.json"),
    project: join(root, "workspace", ".entrez", "config.json"),
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
 * Contact details now resolve across two layers, so one repository can
 * declare its own tool name without touching the person's default. The
 * api_key stays user-only and is deliberately not layered.
 */
describe("config namespaces", () => {
  it("reports not configured when neither layer exists", async () => {
    await expect(loadConfig(layers)).resolves.toBeNull();
  });

  it("uses the user layer alone", async () => {
    await seed(layers.user, { tool: "user-tool", email: "u@x.com" });

    await expect(loadConfig(layers)).resolves.toMatchObject({
      tool: "user-tool",
    });
  });

  it("lets the project layer override one field and inherit the rest", async () => {
    await seed(layers.user, { tool: "user-tool", email: "u@x.com" });
    await seed(layers.project as string, { tool: "project-tool" });

    const config = await loadConfig(layers);
    expect(config?.tool).toBe("project-tool");
    // A project layer naming only `tool` cannot satisfy the schema alone —
    // it works because validation happens after the merge.
    expect(config?.email).toBe("u@x.com");
  });

  it("stays unconfigured when the two layers together are still incomplete", async () => {
    await seed(layers.project as string, { tool: "project-tool" });

    // `email` is required; a project layer without it is not a setup.
    await expect(loadConfig(layers)).resolves.toBeNull();
  });

  it("writes each layer without disturbing the other", async () => {
    await saveConfig("user", { tool: "user-tool", email: "u@x.com" }, layers);
    await saveConfig("project", { tool: "project-tool" }, layers);

    const user = JSON.parse(await readFile(layers.user, "utf-8")) as {
      tool: string;
    };
    expect(user.tool).toBe("user-tool");
    expect(loadConfigScope(layers).overridden).toEqual(["tool"]);
  });

  // Windows has no POSIX mode bits: stat reports 0o666 for every writable file
  // and chmod only toggles the read-only attribute, so the 0o600 contract is
  // unobservable there.
  it.skipIf(env.isWindows)("writes both layers owner-only", async () => {
    await saveConfig("user", { tool: "t", email: "e@x.com" }, layers);
    await saveConfig("project", { tool: "t" }, layers);

    expect((await stat(layers.user)).mode & 0o777).toBe(0o600);
    expect((await stat(layers.project as string)).mode & 0o777).toBe(0o600);
  });

  it("drops an ignore file beside the project layer on creation", async () => {
    await saveConfig("project", { tool: "t" }, layers);

    const ignore = await readFile(
      join(layers.project as string, "..", ".gitignore"),
      "utf-8",
    );
    expect(ignore).toContain("config.json");
    expect(ignore).toContain("credentials.json");
  });

  it("leaves an existing ignore file exactly as found", async () => {
    const directory = join(layers.project as string, "..");
    await mkdir(directory, { recursive: true });
    await writeFile(join(directory, ".gitignore"), "# ours\n", "utf-8");

    await saveConfig("project", { tool: "t" }, layers);

    expect(await readFile(join(directory, ".gitignore"), "utf-8")).toBe(
      "# ours\n",
    );
  });
});
