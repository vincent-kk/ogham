import { describe, it, expect } from "vitest";

import { checkParens } from "../operations/checkParens.js";
import { checkFieldTags } from "../operations/checkFieldTags.js";
import { lintQuery } from "../index.js";

describe("checkParens", () => {
  it("returns no issues for balanced and nested delimiters", () => {
    expect(checkParens("(cancer[mh] OR tumor)")).toEqual([]);
  });

  it("flags unbalanced parentheses as an error", () => {
    const [issue] = checkParens("(a OR b");
    expect(issue?.severity).toBe("error");
    expect(issue?.code).toBe("UNBALANCED_PARENS");
  });

  it("flags unbalanced brackets as an error", () => {
    const [issue] = checkParens("cancer[mh");
    expect(issue?.severity).toBe("error");
    expect(issue?.code).toBe("UNBALANCED_BRACKETS");
  });

  it("flags mismatched nesting as an error", () => {
    expect(checkParens("([)]")[0]?.severity).toBe("error");
  });
});

describe("checkFieldTags", () => {
  it("warns that a quoted phrase disables ATM", () => {
    const [issue] = checkFieldTags('"breast cancer"');
    expect(issue?.severity).toBe("warning");
    expect(issue?.code).toBe("PHRASE_DISABLES_ATM");
  });

  it("warns that a wildcard disables expansion", () => {
    const [issue] = checkFieldTags("neoplasm*");
    expect(issue?.severity).toBe("warning");
    expect(issue?.code).toBe("WILDCARD_DISABLES_EXPANSION");
  });

  it("returns no warnings for a clean term", () => {
    expect(checkFieldTags("neoplasms[mh]")).toEqual([]);
  });
});

describe("lintQuery", () => {
  it("marks a clean MeSH query ok with no issues", () => {
    const result = lintQuery("neoplasms[mh]");
    expect(result.ok).toBe(true);
    expect(result.issues).toEqual([]);
  });

  it("aggregates checks and sets ok=false when an error is present", () => {
    const result = lintQuery("(neoplasm* OR tumor");
    expect(result.ok).toBe(false);
    expect(result.issues.some((i) => i.code === "UNBALANCED_PARENS")).toBe(
      true,
    );
    expect(
      result.issues.some((i) => i.code === "WILDCARD_DISABLES_EXPANSION"),
    ).toBe(true);
  });

  it("stays ok=true when only warnings are present", () => {
    const result = lintQuery('"breast cancer"');
    expect(result.ok).toBe(true);
    expect(result.issues).toHaveLength(1);
  });
});
