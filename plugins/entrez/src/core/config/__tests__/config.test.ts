import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, stat, writeFile, chmod } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { loadConfig } from "../operations/loadConfig.js";
import { saveConfig } from "../operations/saveConfig.js";
import { loadCredentials } from "../operations/loadCredentials.js";
import { saveCredentials } from "../operations/saveCredentials.js";
import { resolveRateLimit } from "../operations/resolveRateLimit.js";
import { RateLimit } from "../../../types/enums.js";

let dir: string;
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "entrez-cfg-"));
});
afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("config load/save", () => {
  it("returns null when config is absent (not configured)", async () => {
    expect(await loadConfig(join(dir, "config.json"))).toBeNull();
  });

  it("round-trips config with defaults applied", async () => {
    const p = join(dir, "config.json");
    await saveConfig({ tool: "t", email: "e@x.com" }, p);
    const cfg = await loadConfig(p);
    expect(cfg?.tool).toBe("t");
    expect(cfg?.default_db).toBe("pubmed");
    expect(cfg?.date_tag).toBe(true);
  });

  it("writes config.json with 0o600 permissions", async () => {
    const p = join(dir, "config.json");
    await saveConfig({ tool: "t", email: "e@x.com" }, p);
    const s = await stat(p);
    expect(s.mode & 0o777).toBe(0o600);
  });

  it("tightens a pre-existing loose config file on load", async () => {
    const p = join(dir, "config.json");
    await writeFile(p, JSON.stringify({ tool: "t", email: "e@x.com" }));
    await chmod(p, 0o644);
    await loadConfig(p);
    expect((await stat(p)).mode & 0o077).toBe(0);
  });
});

describe("credentials & rate limit", () => {
  it("returns {} when credentials are absent", async () => {
    expect(await loadCredentials(join(dir, "credentials.json"))).toEqual({});
  });

  it("round-trips api_key with 0o600 permissions", async () => {
    const p = join(dir, "credentials.json");
    await saveCredentials({ api_key: "KEY" }, p);
    expect((await loadCredentials(p)).api_key).toBe("KEY");
    expect((await stat(p)).mode & 0o777).toBe(0o600);
  });

  it("resolves 10/s with a key, 3/s without", () => {
    expect(resolveRateLimit({ api_key: "KEY" })).toEqual({
      limit: RateLimit.WITH_KEY,
      perSec: 10,
    });
    expect(resolveRateLimit({})).toEqual({
      limit: RateLimit.NO_KEY,
      perSec: 3,
    });
  });
});
