import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { buildWrapperScript } from "../operations/buildWrapperScript.js";

/** Canonical contract used to verify the wrapper's managed library setup. */
const contractPath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../../../../shared/contract.R",
);

describe("run_r wrapper contract", () => {
  it("sources the contract unconditionally so a missing path cannot bypass it", () => {
    const wrapped = buildWrapperScript('cat("user code ran")');
    expect(wrapped).toContain(
      '.rstat_contract <- Sys.getenv("R_STATISTICS_CONTRACT")\n' +
        "source(.rstat_contract)\n",
    );
  });

  it("loads the contract before init and user code", () => {
    const wrapped = buildWrapperScript("library(jsonlite)");
    expect(wrapped.indexOf("source(.rstat_contract)")).toBeLessThan(
      wrapped.indexOf('if (exists(".rstat_init")) .rstat_init()'),
    );
    expect(
      wrapped.indexOf('if (exists(".rstat_init")) .rstat_init()'),
    ).toBeLessThan(wrapped.indexOf("library(jsonlite)"));
  });

  it("prepends R_STATISTICS_LIB to .libPaths before packages are loaded", async () => {
    const contract = await readFile(contractPath, "utf8");
    expect(contract).toContain('Sys.getenv("R_STATISTICS_LIB")');
    expect(contract).toContain(".libPaths(c(.rstat_lib, .libPaths()))");
  });
});
