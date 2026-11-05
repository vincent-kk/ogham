import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
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

  it.skipIf(process.platform === "win32")(
    "preserves an absolute override with parent traversal after a POSIX symlink",
    () => {
      mkdirSync(join(executableDir, "real", "sub"), { recursive: true });
      writeFileSync(join(executableDir, "real", "Rscript"), "", { mode: 0o700 });
      symlinkSync(join(executableDir, "real", "sub"), join(executableDir, "link"));
      const override = `${executableDir}/link/../Rscript`;
      process.env[RSCRIPT_ENV_VAR] = override;

      expect(discoverRscript()).toBe(override);
    },
  );

  it.skipIf(process.platform === "win32")(
    "rejects a relative POSIX symlink override whose normalized path is not executable",
    () => {
      mkdirSync(join(executableDir, "real", "sub"), { recursive: true });
      writeFileSync(join(executableDir, "real", "Rscript"), "", { mode: 0o700 });
      symlinkSync(join(executableDir, "real", "sub"), join(executableDir, "link"));
      process.env[RSCRIPT_ENV_VAR] =
        `${relative(process.cwd(), executableDir)}/link/../Rscript`;

      expect(discoverRscript()).not.toBe(join(executableDir, "Rscript"));
    },
  );

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
