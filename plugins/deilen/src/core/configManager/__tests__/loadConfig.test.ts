import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import { CONFIG_PATH } from "../../../constants/paths.js";
import { atomicWrite } from "../../../lib/atomicWrite.js";
import { CONFIG_VERSION } from "../../../types/config.js";
import { loadConfig } from "../operations/loadConfig.js";

describe("loadConfig", () => {
  it("migrates a pre-versioning 45 to 600 and persists the bump", async () => {
    await atomicWrite(
      CONFIG_PATH,
      JSON.stringify({ collect_timeout_seconds: 45 }),
    );
    await expect(loadConfig()).resolves.toMatchObject({
      collect_timeout_seconds: 600,
      config_version: CONFIG_VERSION,
    });
    expect(JSON.parse(await readFile(CONFIG_PATH, "utf8"))).toMatchObject({
      collect_timeout_seconds: 600,
      config_version: CONFIG_VERSION,
    });
  });

  it("preserves a deliberate 45 stored at the current version", async () => {
    await atomicWrite(
      CONFIG_PATH,
      JSON.stringify({
        collect_timeout_seconds: 45,
        config_version: CONFIG_VERSION,
      }),
    );
    await expect(loadConfig()).resolves.toMatchObject({
      collect_timeout_seconds: 45,
    });
  });

  it("keeps a non-default legacy value while stamping the version", async () => {
    await atomicWrite(
      CONFIG_PATH,
      JSON.stringify({ collect_timeout_seconds: 30 }),
    );
    await expect(loadConfig()).resolves.toMatchObject({
      collect_timeout_seconds: 30,
      config_version: CONFIG_VERSION,
    });
  });
});
