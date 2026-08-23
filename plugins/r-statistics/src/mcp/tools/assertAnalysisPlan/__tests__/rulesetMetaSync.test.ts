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
    for (const technique of Object.keys(TECHNIQUE_RULES))
      expect(() => readMeta(technique)).not.toThrow();
  });

  // Driven by the ruleset rather than a mirrored technique list, so a technique
  // added to TECHNIQUE_RULES is covered without editing this file. Every drift
  // is collected before asserting, so one run names all of them.
  it("mirrors family + assumption ids in meta.yaml for every technique", () => {
    const drift = Object.entries(TECHNIQUE_RULES).flatMap(
      ([technique, rule]) => {
        const yaml = readMeta(technique);
        const expectedAssumptions = rule.assumptions.map((a) => a.id).sort();
        const problems: string[] = [];
        if (scalar(yaml, "technique") !== technique)
          problems.push(`technique=${scalar(yaml, "technique")}`);
        if (scalar(yaml, "family") !== rule.family)
          problems.push(`family=${scalar(yaml, "family")} want ${rule.family}`);
        const ids = assumptionIds(yaml);
        if (ids.join(",") !== expectedAssumptions.join(","))
          problems.push(
            `assumptions=${ids.join("|")} want ${expectedAssumptions.join("|")}`,
          );
        return problems.length ? [`${technique}: ${problems.join("; ")}`] : [];
      },
    );
    expect(drift).toEqual([]);
  });
});
