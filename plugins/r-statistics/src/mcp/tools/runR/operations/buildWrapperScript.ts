/**
 * Wrap user R code with the execution contract: force UTF-8, source the shipped
 * contract.R (defining the artifact helpers + `.rstat_init`/`.rstat_finalize`),
 * run the user slot, then finalize (manifest.json + sessionInfo). Paths, seed,
 * and the contract location arrive via environment variables, keeping the
 * generated wrapper minimal and the contract centralized.
 */
export function buildWrapperScript(userCode: string): string {
  return [
    "# r-statistics generated wrapper — do not edit",
    // invisible(): Rscript auto-prints top-level visible values; without it the
    // locale string leaks to the front of stdout.
    'invisible(Sys.setlocale("LC_ALL", ""))',
    'options(encoding = "UTF-8", warn = 1)',
    '.rstat_contract <- Sys.getenv("R_STATISTICS_CONTRACT")',
    "if (nzchar(.rstat_contract) && file.exists(.rstat_contract)) {",
    "  source(.rstat_contract)",
    "}",
    'if (exists(".rstat_init")) .rstat_init()',
    "# --- user code begins ---",
    userCode,
    "# --- user code ends ---",
    'if (exists(".rstat_finalize")) .rstat_finalize()',
    "",
  ].join("\n");
}
