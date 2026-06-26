import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { buildWrapperScript } from "../operations/buildWrapperScript.js";

const contractPath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../../../../shared/contract.R",
);

describe("run_r wrapper contract", () => {
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
