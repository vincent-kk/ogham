import { describe, expect, it } from "vitest";

import { buildRunEnv } from "../operations/buildRunEnv.js";

const workspace = {
  workspaceId: "ws_env",
  dir: "/tmp/ws_env",
  artifactsDir: "/tmp/ws_env/artifacts",
  dataDir: "/tmp/ws_env/data",
};

describe("buildRunEnv", () => {
  it("excludes non-allowlisted parent env vars (no secret leakage)", () => {
    process.env.FAKE_SECRET_TOKEN = "sk-leak";
    try {
      const env = buildRunEnv(workspace, 7);
      expect(env.FAKE_SECRET_TOKEN).toBeUndefined();
      expect(env.R_STATISTICS_ARTIFACTS_DIR).toBe(workspace.artifactsDir);
      expect(env.R_STATISTICS_SEED).toBe("7");
    } finally {
      delete process.env.FAKE_SECRET_TOKEN;
    }
  });

  it("passes through the toolchain/locale env R needs", () => {
    process.env.PATH = process.env.PATH ?? "/usr/bin";
    const env = buildRunEnv(workspace, undefined);
    expect(env.PATH).toBe(process.env.PATH);
    expect(env.LANG).toBeDefined();
  });
});
