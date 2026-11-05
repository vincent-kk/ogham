import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { isAbsolute, join, relative } from "node:path";

import * as crossPlatform from "@ogham/cross-platform";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { RSCRIPT_ENV_VAR } from "../../../constants/defaults.js";
import { Platform } from "../../../types/enums.js";
import * as platform from "../../../utils/detectPlatform.js";
import { discoverRscript } from "../operations/discoverRscript.js";

/** Missing executable used to exercise override fallback. */
const BOGUS = "/definitely/not/here/Rscript";
/** Per-case executable directory, removed after discovery assertions. */
let executableDir: string;

describe("discoverRscript", () => {
  beforeEach(() => {
    executableDir = mkdtempSync(join(tmpdir(), "rscript-discovery-"));
  });

  afterEach(() => {
    delete process.env[RSCRIPT_ENV_VAR];
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    rmSync(executableDir, { recursive: true, force: true });
  });

  it("honors the env override when it points to an executable", () => {
    // node's own binary is a real executable, standing in for Rscript.
    process.env[RSCRIPT_ENV_VAR] = process.execPath;
    expect(discoverRscript()).toBe(process.execPath);
  });

  it("ignores a non-existent env override and never returns it", () => {
    process.env[RSCRIPT_ENV_VAR] = BOGUS;
    expect(discoverRscript()).not.toBe(BOGUS);
  });

  it("returns an absolute path for a relative executable override", () => {
    process.env[RSCRIPT_ENV_VAR] = relative(process.cwd(), process.execPath);
    expect(discoverRscript()).toBe(process.execPath);
  });

  it("returns an absolute path for an executable in a relative PATH entry", () => {
    delete process.env[RSCRIPT_ENV_VAR];
    const binaryName = process.platform === "win32" ? "Rscript.exe" : "Rscript";
    const executablePath = join(executableDir, binaryName);
    writeFileSync(executablePath, "", { mode: 0o700 });
    vi.stubEnv("PATH", relative(process.cwd(), executableDir));

    const discovered = discoverRscript();
    expect(discovered).toBe(executablePath);
    expect(isAbsolute(discovered!)).toBe(true);
  });

  it("returns an absolute path for a relative Windows registry installation", () => {
    delete process.env[RSCRIPT_ENV_VAR];
    mkdirSync(join(executableDir, "bin"));
    const executablePath = join(executableDir, "bin", "Rscript.exe");
    writeFileSync(executablePath, "", { mode: 0o700 });
    vi.stubEnv("PATH", "");
    vi.spyOn(platform, "detectPlatform").mockReturnValue(Platform.Windows);
    vi.spyOn(crossPlatform, "spawnCliSync").mockReturnValue({
      code: 0,
      stdout: `InstallPath REG_SZ ${relative(process.cwd(), executableDir)}`,
      stderr: "",
      timedOut: false,
    });

    const discovered = discoverRscript();
    expect(discovered).toBe(executablePath);
    expect(isAbsolute(discovered!)).toBe(true);
  });
});
