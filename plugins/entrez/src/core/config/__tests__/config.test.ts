import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, stat, writeFile, chmod } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { env } from "@ogham/cross-platform/env";

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

  // Windows has no POSIX mode bits: stat reports 0o666 for every writable file
  // and chmod only toggles the read-only attribute, so the 0o600 contract is
  // unobservable there. It stays covered on the POSIX runners.
  it.skipIf(env.isWindows)(
    "writes config.json with 0o600 permissions",
    async () => {
      const p = join(dir, "config.json");
      await saveConfig({ tool: "t", email: "e@x.com" }, p);
      const s = await stat(p);
      expect(s.mode & 0o777).toBe(0o600);
    },
  );

  // POSIX-only for the same reason: chmod(0o644) does not loosen anything on
  // Windows, so there is nothing for load to tighten.
  it.skipIf(env.isWindows)(
    "tightens a pre-existing loose config file on load",
    async () => {
      const p = join(dir, "config.json");
      await writeFile(p, JSON.stringify({ tool: "t", email: "e@x.com" }));
      await chmod(p, 0o644);
      await loadConfig(p);
      expect((await stat(p)).mode & 0o077).toBe(0);
    },
  );
});

describe("credentials & rate limit", () => {
  it("returns {} when credentials are absent", async () => {
    expect(await loadCredentials(join(dir, "credentials.json"))).toEqual({});
  });

  it("round-trips api_key", async () => {
    const p = join(dir, "credentials.json");
    await saveCredentials({ api_key: "KEY" }, p);
    expect((await loadCredentials(p)).api_key).toBe("KEY");
  });

  // Split from the round-trip so Windows keeps the round-trip coverage and
  // skips only the mode bits it cannot express (see config load/save above).
  it.skipIf(env.isWindows)(
    "writes credentials.json with 0o600 permissions",
    async () => {
      const p = join(dir, "credentials.json");
      await saveCredentials({ api_key: "KEY" }, p);
      expect((await stat(p)).mode & 0o777).toBe(0o600);
    },
  );

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
