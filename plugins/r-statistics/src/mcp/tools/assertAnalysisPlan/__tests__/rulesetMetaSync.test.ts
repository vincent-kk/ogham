import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { TECHNIQUE_RULES } from "../operations/ruleset.js";

// The TS ruleset is the deterministic runtime authority; the meta.yaml catalog
// mirrors it for the agents. This test fails the build if they drift.
const methodsDir = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../../../../skills/analyze/references/methods",
);

function readMeta(technique: string): string {
  return readFileSync(join(methodsDir, technique, "meta.yaml"), "utf8");
}

function scalar(yaml: string, key: string): string | undefined {
  return yaml.match(new RegExp(`^${key}:\\s*(\\S+)`, "m"))?.[1];
}

function assumptionIds(yaml: string): string[] {
  return [...yaml.matchAll(/^\s*- id:\s*(\S+)/gm)].map((m) => m[1]).sort();
}

describe("meta.yaml ↔ ruleset.ts consistency", () => {
  it("every ruleset technique has a readable meta.yaml", () => {
    for (const technique of Object.keys(TECHNIQUE_RULES)) {
      expect(() => readMeta(technique)).not.toThrow();
    }
  });

  it.each(Object.entries(TECHNIQUE_RULES))(
    "%s mirrors family + assumption ids in meta.yaml",
    (technique, rule) => {
      const yaml = readMeta(technique);
      expect(scalar(yaml, "technique")).toBe(technique);
      expect(scalar(yaml, "family")).toBe(rule.family);
      expect(assumptionIds(yaml)).toEqual(
        rule.assumptions.map((a) => a.id).sort(),
      );
    },
  );
});
