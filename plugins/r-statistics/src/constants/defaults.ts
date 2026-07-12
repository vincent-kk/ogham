import { Platform } from "../types/enums.js";

/** Default + ceiling for a single R execution. */
export const DEFAULT_TIMEOUT_MS = 120_000;
export const MAX_TIMEOUT_MS = 600_000;

/** Workspace retention before startup pruning reclaims disk. */
export const WORKSPACE_TTL_HOURS = 72;

/** Max async jobs retained in the in-memory registry (oldest terminal evicted). */
export const MAX_TRACKED_JOBS = 200;

/** Input bounds for run_r (reject runaway/abuse payloads before execution). */
export const MAX_SCRIPT_CHARS = 1_000_000;
export const MAX_DATA_REFS = 64;

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
 * Events-per-variable (EPV) gates. The common EPV >= 10 screening heuristic is
 * traced to Peduzzi et al. 1996 and clinical prediction-model practice; it can
 * be conservative when applied to other regression contexts. The lower hard
 * threshold only blocks fits that are severely unstable.
 */
export const EPV_SOFT_GUIDANCE_THRESHOLD = 10;
export const EPV_SEVERE_BLOCK_THRESHOLD = 5;

/**
 * Always installed by setup — the execution contract and the bulk of the
 * shipped methods depend on these (`jsonlite` backs run_r's own I/O).
 */
export const REQUIRED_PACKAGES = [
  "broom",
  "rstatix",
  "car",
  "data.table",
  "jsonlite",
] as const;

/** Method-referenced optional packages — part of the run_r baseline. */
const BASELINE_OPTIONAL = [
  "ggplot2",
  "survival",
  "lme4",
  "MASS",
  "forecast",
  "gtsummary",
  "arrow",
  "quarto",
] as const;

/**
 * Pre-built package whitelist (renv lockfile baseline): REQUIRED ∪
 * method-referenced optional ∪ base `stats`. What executed R code may assume
 * present after a standard setup. Use-case bundles (PACKAGE_USE_CASES) may pull
 * companions beyond this baseline; those install on demand through setup's
 * consent-gated terminal channel — run_r itself never installs.
 */
export const PACKAGE_WHITELIST = [
  "stats",
  ...REQUIRED_PACKAGES,
  ...BASELINE_OPTIONAL,
] as const;

/**
 * setup use-case catalog. Instead of asking package-by-package, setup asks
 * which analyses/outputs the user needs and installs each selected bundle's
 * packages in one pass. Labels/summaries are English; the skill localizes them
 * at prompt time. Bundles may include companions beyond PACKAGE_WHITELIST.
 * Needs not covered here are resolved dynamically by the skill.
 */
export const PACKAGE_USE_CASES = [
  {
    key: "visualization",
    label: "Graphs & visualization",
    summary: "Plot and chart artifacts (most methods' figures need this)",
    packages: ["ggplot2", "ggpubr", "patchwork"],
  },
  {
    key: "survival",
    label: "Survival analysis",
    summary: "Cox proportional hazards and survival curves",
    packages: ["survival", "survminer"],
  },
  {
    key: "mixedModels",
    label: "Mixed-effects / multilevel models",
    summary: "lme4 mixed models with p-values and marginal means",
    packages: ["lme4", "lmerTest", "emmeans"],
  },
  {
    key: "countModels",
    label: "Count models (negative binomial, Poisson)",
    summary: "Count regression with overdispersion and robust SE",
    packages: ["MASS", "sandwich", "lmtest"],
  },
  {
    key: "timeSeries",
    label: "Time-series forecasting",
    summary: "Forecasting workflows for ordered observations over time",
    packages: ["forecast", "tsibble"],
  },
  {
    key: "trendTests",
    label: "Non-parametric trend detection",
    summary: "Mann-Kendall / Sen's slope trend tests robust to autocorrelation",
    packages: ["modifiedmk", "trend"],
  },
  {
    key: "tables",
    label: "Publication summary tables",
    summary: "gtsummary tables with gt and Word (flextable) rendering",
    packages: ["gtsummary", "gt", "flextable"],
  },
  {
    key: "bigData",
    label: "Large / columnar data input",
    summary: "Parquet and Feather data files",
    packages: ["arrow"],
  },
  {
    key: "reporting",
    label: "Report rendering",
    summary:
      "Quarto / R Markdown documents (R packages; Quarto CLI is separate)",
    packages: ["quarto", "knitr", "rmarkdown"],
  },
] as const;

/**
 * Statically forbidden R calls (execution safety, not statistical policy):
 * process spawning, filesystem escape, dynamic install, and network access.
 */
export const FORBIDDEN_R_CALLS = [
  "system",
  "source",
  "sys.source",
  "makeCluster",
  "makePSOCKcluster",
  "makeForkCluster",
  "serverSocket",
  "Sys.setenv",
  "file.symlink",
  "Sys.junction",
  "get0",
  "mget",
  "match.fun",
  "getFunction",
  "getAnywhere",
  "getFromNamespace",
  "getExportedValue",
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
 * Approved OS package-manager installers (setup consent gate). Only these
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
