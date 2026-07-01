import { describe, expect, it } from "vitest";

import { Platform } from "../../../../types/enums.js";
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

  it("sets the managed R library env used by Windows run_r and installs", () => {
    const env = buildRunEnv(workspace, undefined, Platform.Windows);
    expect(env.R_STATISTICS_LIB).toMatch(
      /[\\/]plugins[\\/]r-statistics[\\/]runtime[\\/]r-lib$/,
    );
    expect(env.R_LIBS_USER).toBe(env.R_STATISTICS_LIB);
  });

  it("does not override the existing R_LIBS_USER outside Windows", () => {
    const previous = process.env.R_LIBS_USER;
    process.env.R_LIBS_USER = "/Users/vincent/R/library";
    try {
      const env = buildRunEnv(workspace, undefined, Platform.Macos);
      expect(env.R_STATISTICS_LIB).toMatch(
        /[\\/]plugins[\\/]r-statistics[\\/]runtime[\\/]r-lib$/,
      );
      expect(env.R_LIBS_USER).toBe("/Users/vincent/R/library");
    } finally {
      if (previous === undefined) delete process.env.R_LIBS_USER;
      else process.env.R_LIBS_USER = previous;
    }
  });

  it("passes through Windows toolchain env vars without inheriting arbitrary vars", () => {
    const previous = {
      LOCALAPPDATA: process.env.LOCALAPPDATA,
      APPDATA: process.env.APPDATA,
      USERPROFILE: process.env.USERPROFILE,
      PROCESSOR_ARCHITECTURE: process.env.PROCESSOR_ARCHITECTURE,
      RANDOM_WINDOWS_SECRET: process.env.RANDOM_WINDOWS_SECRET,
    };
    process.env.LOCALAPPDATA = "C:\\Users\\vincent\\AppData\\Local";
    process.env.APPDATA = "C:\\Users\\vincent\\AppData\\Roaming";
    process.env.USERPROFILE = "C:\\Users\\vincent";
    process.env.PROCESSOR_ARCHITECTURE = "AMD64";
    process.env.RANDOM_WINDOWS_SECRET = "do-not-copy";
    try {
      const env = buildRunEnv(workspace, undefined);
      expect(env.LOCALAPPDATA).toBe(process.env.LOCALAPPDATA);
      expect(env.APPDATA).toBe(process.env.APPDATA);
      expect(env.USERPROFILE).toBe(process.env.USERPROFILE);
      expect(env.PROCESSOR_ARCHITECTURE).toBe(
        process.env.PROCESSOR_ARCHITECTURE,
      );
      expect(env.RANDOM_WINDOWS_SECRET).toBeUndefined();
    } finally {
      for (const [key, value] of Object.entries(previous))
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
    }
  });

  it("passes through the toolchain/locale env R needs", () => {
    process.env.PATH = process.env.PATH ?? "/usr/bin";
    const env = buildRunEnv(workspace, undefined);
    expect(env.PATH).toBe(process.env.PATH);
    expect(env.LANG).toBeDefined();
  });
});
