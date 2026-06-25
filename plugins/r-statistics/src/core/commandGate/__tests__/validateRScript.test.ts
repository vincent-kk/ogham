import { describe, expect, it } from "vitest";

import { validateRScript } from "../operations/validateRScript.js";

describe("validateRScript", () => {
  it("accepts a clean statistical script", () => {
    const result = validateRScript(
      "fit <- lm(y ~ x, data = df)\nsummary(fit)\nggsave('p.png')",
    );
    expect(result.ok).toBe(true);
    expect(result.blockedCalls).toHaveLength(0);
  });

  it("blocks process-spawning calls", () => {
    const result = validateRScript('system("rm -rf /")');
    expect(result.ok).toBe(false);
    expect(result.blockedCalls).toContain("system");
  });

  it("reports every distinct forbidden call", () => {
    const result = validateRScript(
      'install.packages("x"); setwd("/tmp"); unlink("a"); download.file(u, d)',
    );
    expect(result.ok).toBe(false);
    expect(result.blockedCalls).toEqual(
      expect.arrayContaining([
        "install.packages",
        "setwd",
        "unlink",
        "download.file",
      ]),
    );
  });

  it.each([
    ["system.time({ x <- 1 })", "system"],
    ["system2.helper <- 1", "system2"],
    ["my_url_value <- 3", "url"],
    ["do.call(rbind, list(df1, df2))", "do.call"],
  ])("does not false-positive on %s", (code) => {
    expect(validateRScript(code).ok).toBe(true);
  });

  it.each([
    ['do.call("system", list("cmd"))'],
    ['get("system")("cmd")'],
    ["eval(parse(text=\"system('cmd')\"))"],
  ])("blocks string-dispatch pattern: %s", (code) => {
    expect(validateRScript(code).ok).toBe(false);
  });

  it("blocks shell.exec despite the dotted name", () => {
    const result = validateRScript('shell.exec("calc.exe")');
    expect(result.ok).toBe(false);
    expect(result.blockedCalls).toContain("shell.exec");
  });
});
