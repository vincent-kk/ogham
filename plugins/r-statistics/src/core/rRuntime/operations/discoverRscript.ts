import {
  accessSync,
  constants,
  existsSync,
  readdirSync,
  statSync,
} from "node:fs";
import { delimiter, join } from "node:path";

import { spawnCliSync } from "@ogham/cross-platform";

import {
  COMMON_RSCRIPT_PATHS,
  RSCRIPT_ENV_VAR,
} from "../../../constants/defaults.js";
import { Platform } from "../../../types/enums.js";
import { detectPlatform } from "../../../utils/detectPlatform.js";

function isExecutableFile(candidate: string): boolean {
  try {
    if (!statSync(candidate).isFile()) return false;
    if (process.platform !== "win32") accessSync(candidate, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

function scanPath(binName: string): string | null {
  for (const dir of (process.env.PATH ?? "").split(delimiter)) {
    if (!dir) continue;
    const candidate = join(dir, binName);
    if (isExecutableFile(candidate)) return candidate;
  }
  return null;
}

function queryWindowsRegistry(): string | null {
  const result = spawnCliSync(
    "reg",
    ["query", "HKLM\\SOFTWARE\\R-core\\R", "/v", "InstallPath"],
    { timeoutMs: 3000 },
  );
  if (result.code !== 0 || !result.stdout) return null;
  const match = result.stdout.match(/InstallPath\s+REG_SZ\s+(.+)/);
  if (!match) return null;
  const candidate = join(match[1].trim(), "bin", "Rscript.exe");
  return isExecutableFile(candidate) ? candidate : null;
}

function discoverWindows(): string | null {
  const fromRegistry = queryWindowsRegistry();
  if (fromRegistry) return fromRegistry;
  for (const base of COMMON_RSCRIPT_PATHS[Platform.Windows]) {
    if (!existsSync(base)) continue;
    try {
      for (const version of readdirSync(base)) {
        const candidate = join(base, version, "bin", "Rscript.exe");
        if (isExecutableFile(candidate)) return candidate;
      }
    } catch {
      // unreadable base — skip
    }
  }
  return null;
}

/**
 * Resolve an Rscript binary: env override → PATH → platform common paths →
 * (Windows) registry `HKLM\SOFTWARE\R-core\R`. Returns null when none is found,
 * letting the caller surface R_NOT_FOUND + the setup guidance.
 */
export function discoverRscript(): string | null {
  const platform = detectPlatform();

  const envOverride = process.env[RSCRIPT_ENV_VAR];
  if (envOverride && isExecutableFile(envOverride)) return envOverride;

  const fromPath = scanPath(
    platform === Platform.Windows ? "Rscript.exe" : "Rscript",
  );
  if (fromPath) return fromPath;

  if (platform === Platform.Windows) return discoverWindows();

  for (const candidate of COMMON_RSCRIPT_PATHS[platform])
    if (isExecutableFile(candidate)) return candidate;

  return null;
}
