import { DEFAULT_SEED } from "../../../../constants/defaults.js";
import { contractScriptPath } from "../../../../constants/paths.js";
import type { WorkspaceHandle } from "../../../../core/index.js";

/**
 * Build the child process environment: inherit the parent env (R needs PATH /
 * R_HOME), force a UTF-8 locale, and pass the workspace paths + seed + contract
 * location the wrapper reads via Sys.getenv.
 */
export function buildRunEnv(
  workspace: WorkspaceHandle,
  seed: number | undefined,
): NodeJS.ProcessEnv {
  return {
    ...process.env,
    LANG: process.env.LANG ?? "en_US.UTF-8",
    R_STATISTICS_ARTIFACTS_DIR: workspace.artifactsDir,
    R_STATISTICS_DATA_DIR: workspace.dataDir,
    R_STATISTICS_SEED: String(seed ?? DEFAULT_SEED),
    R_STATISTICS_CONTRACT: contractScriptPath(),
  };
}
