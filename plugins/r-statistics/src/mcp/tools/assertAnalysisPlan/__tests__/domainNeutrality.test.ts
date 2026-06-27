import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  PACKAGE_USE_CASES,
  PACKAGE_WHITELIST,
} from "../../../../constants/defaults.js";

const pluginRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../../../..",
);

const forbiddenApplicationTerms = [
  /\bcontrol\b/i,
  /\btreatment\b/i,
  /\bintervention\b/i,
  /\bevent_30d\b/i,
  /\brisk_band\b/i,
  /\bpatient\b/i,
  /\bclinical\b/i,
  /\bmedical\b/i,
  /\bmedicine\b/i,
  /처치/,
] as const;

function walkFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    return statSync(path).isDirectory() ? walkFiles(path) : [path];
  });
}

function readRelative(path: string): string {
  return readFileSync(join(pluginRoot, path), "utf8");
}

describe("domain neutrality contract", () => {
  it("keeps public examples and sample variable names application-neutral", () => {
    const checkedFiles = [
      "README.md",
      "README-ko_kr.md",
      ...walkFiles(join(pluginRoot, ".sample")).filter((path) =>
        [".csv", ".md"].includes(extname(path)),
      ),
    ];

    const violations = checkedFiles.flatMap((path) => {
      const text = readFileSync(path, "utf8");
      return forbiddenApplicationTerms
        .filter((term) => term.test(text))
        .map((term) => `${path.replace(`${pluginRoot}/`, "")}: ${term}`);
    });

    expect(violations).toEqual([]);
  });

  it("exposes at least one non-clinical use-case bundle alongside survival", () => {
    expect(PACKAGE_USE_CASES.map((useCase) => useCase.key)).toEqual(
      expect.arrayContaining(["survival", "timeSeries"]),
    );
    expect(PACKAGE_WHITELIST).toEqual(expect.arrayContaining(["forecast"]));
  });

  it("documents that sample/default examples must not imply an application domain", () => {
    expect(readRelative("INTENT.md")).toContain(
      "샘플·예시·기본값은 응용 도메인을 암시하지 않는다",
    );
  });
});
