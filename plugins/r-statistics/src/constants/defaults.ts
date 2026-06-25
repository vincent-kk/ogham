import { Platform } from "../types/enums.js";

/** Default + ceiling for a single R execution. */
export const DEFAULT_TIMEOUT_MS = 120_000;
export const MAX_TIMEOUT_MS = 600_000;

/** Workspace retention before startup pruning reclaims disk. */
export const WORKSPACE_TTL_HOURS = 72;

/** Fixed default RNG seed for reproducibility (set.seed in the contract header). */
export const DEFAULT_SEED = 20260101;

/** Disk permission modes for workspace files. */
export const DIR_MODE = 0o700;
export const FILE_MODE = 0o600;

/**
 * Dispatcher iteration guards (single source — the analyze state machine
 * references these limits; exceeding any moves the pipeline to FAILED).
 */
export const ITERATION_GUARDS = {
  methodology: 3,
  rRepair: 3,
  validator: 2,
  total: 25,
} as const;

/**
 * Pre-built package whitelist (renv lockfile baseline). Dynamic install is
 * forbidden; only these are assumed available to executed R code.
 */
export const PACKAGE_WHITELIST = [
  "stats",
  "broom",
  "ggplot2",
  "rstatix",
  "survival",
  "lme4",
  "MASS",
  "car",
  "gtsummary",
  "arrow",
  "data.table",
  "jsonlite",
  "quarto",
] as const;

/**
 * Statically forbidden R calls (execution safety, not statistical policy):
 * process spawning, filesystem escape, dynamic install, and network access.
 */
export const FORBIDDEN_R_CALLS = [
  "system",
  "system2",
  "shell",
  "shell.exec",
  "pipe",
  "install.packages",
  "remove.packages",
  "setwd",
  "unlink",
  "file.remove",
  "download.file",
  "url",
  "socketConnection",
  "eval",
  "parse",
] as const;

/** Artifact file extensions run_r is allowed to collect from ARTIFACTS_DIR. */
export const ALLOWED_ARTIFACT_EXTENSIONS = [
  ".png",
  ".jpg",
  ".jpeg",
  ".svg",
  ".pdf",
  ".json",
  ".csv",
  ".tsv",
  ".rds",
  ".html",
  ".docx",
  ".txt",
  ".log",
] as const;

/** Output stream truncation ceiling (decoded characters). */
export const MAX_STREAM_CHARS = 100_000;

/**
 * Common Rscript install locations probed after config / env / PATH lookup, by
 * platform. Windows additionally consults the registry (HKLM\SOFTWARE\R-core\R).
 */
export const COMMON_RSCRIPT_PATHS: Record<Platform, string[]> = {
  [Platform.Macos]: [
    "/opt/homebrew/bin/Rscript",
    "/usr/local/bin/Rscript",
    "/Library/Frameworks/R.framework/Resources/bin/Rscript",
    "/usr/bin/Rscript",
  ],
  [Platform.Linux]: [
    "/usr/bin/Rscript",
    "/usr/local/bin/Rscript",
    "/opt/R/bin/Rscript",
  ],
  [Platform.Windows]: ["C:\\Program Files\\R", "C:\\Program Files (x86)\\R"],
};

/** Environment variable that overrides Rscript discovery. */
export const RSCRIPT_ENV_VAR = "R_STATISTICS_RSCRIPT";

/**
 * Approved OS package-manager installers (r-setup consent gate). Only these
 * binaries and these subcommands may be proposed for installing R.
 */
export const INSTALLER_COMMANDS: Record<
  string,
  { command: string; args: string[] }
> = {
  winget: { command: "winget", args: ["install", "RProject.R"] },
  choco: { command: "choco", args: ["install", "r.project"] },
  brew: { command: "brew", args: ["install", "--cask", "r"] },
};
