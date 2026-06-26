import { DEFAULT_SEED } from "../../../../constants/defaults.js";
import {
  contractScriptPath,
  MANAGED_R_LIB_DIR,
} from "../../../../constants/paths.js";
import type { WorkspaceHandle } from "../../../../core/index.js";
import { Platform } from "../../../../types/enums.js";
import { detectPlatform } from "../../../../utils/detectPlatform.js";

/** Non-secret parent env vars R genuinely needs; the full env is NOT inherited. */
const INHERITED_ENV_KEYS = [
  "PATH",
  "HOME",
  "R_HOME",
  "R_LIBS",
  "R_LIBS_USER",
  "R_LIBS_SITE",
  "LANG",
  "LC_ALL",
  "LC_CTYPE",
  "TZ",
  "TMPDIR",
  "TMP",
  "TEMP",
  "LOCALAPPDATA",
  "APPDATA",
  "USERPROFILE",
  "PROCESSOR_ARCHITECTURE",
] as const;

/**
 * Build the child process environment. Inherits only an allowlist of non-secret
 * toolchain/locale vars — NEVER the full `process.env`, which may carry agent
 * API tokens the executed (untrusted) R could read via `Sys.getenv`. Forces a
 * UTF-8 locale and passes the workspace paths + seed + contract location the
 * wrapper reads via `Sys.getenv`.
 */
export function buildRunEnv(
  workspace: WorkspaceHandle,
  seed: number | undefined,
  platform: Platform = detectPlatform(),
): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {};
  for (const key of INHERITED_ENV_KEYS) {
    const value = process.env[key];
    if (value !== undefined) env[key] = value;
  }
  const runEnv: NodeJS.ProcessEnv = {
    ...env,
    LANG: process.env.LANG ?? "en_US.UTF-8",
    R_STATISTICS_ARTIFACTS_DIR: workspace.artifactsDir,
    R_STATISTICS_DATA_DIR: workspace.dataDir,
    R_STATISTICS_SEED: String(seed ?? DEFAULT_SEED),
    R_STATISTICS_CONTRACT: contractScriptPath(),
    R_STATISTICS_LIB: MANAGED_R_LIB_DIR,
  };
  if (platform === Platform.Windows) {
    runEnv.R_LIBS_USER = MANAGED_R_LIB_DIR;
  }
  return runEnv;
}
