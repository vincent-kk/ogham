import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { binaries, discover } from "../discover.js";

describe("discover", () => {
  let tmp: string;
  let cacheFile: string;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), "xp-discover-"));
    cacheFile = join(tmp, "binaries.json");
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it("finds node and reports a version", async () => {
    const status = await discover("node", { cacheFile });
    expect(status.available).toBe(true);
    expect(status.path).toBeDefined();
    expect(status.version).toBeDefined();
    expect(status.installHint).toBeUndefined();
  });

  it("returns available:false for an unknown binary", async () => {
    const status = await discover("definitely-not-a-real-cli-9999", {
      cacheFile,
      refresh: true,
    });
    expect(status.available).toBe(false);
    expect(status.path).toBeUndefined();
  });

  it("writes cache to the provided cacheFile", async () => {
    await discover("node", { cacheFile });
    expect(existsSync(cacheFile)).toBe(true);
    const data = JSON.parse(readFileSync(cacheFile, "utf8"));
    expect(data.node).toBeDefined();
    expect(typeof data.node.cachedAt).toBe("number");
  });

  it("uses cache on subsequent calls", async () => {
    await discover("node", { cacheFile });
    const tampered = { node: { available: false, cachedAt: Date.now() } };
    writeFileSync(cacheFile, JSON.stringify(tampered));
    const status = await discover("node", { cacheFile });
    expect(status.available).toBe(false);
  });

  it("refresh: true bypasses cache and re-discovers", async () => {
    const tampered = { node: { available: false, cachedAt: Date.now() } };
    writeFileSync(cacheFile, JSON.stringify(tampered));
    const status = await discover("node", { cacheFile, refresh: true });
    expect(status.available).toBe(true);
  });

  it("binaries.ensureNode wraps discover", async () => {
    const status = await binaries.ensureNode({ cacheFile });
    expect(status.bin).toBe("node");
    expect(status.available).toBe(true);
  });
});
