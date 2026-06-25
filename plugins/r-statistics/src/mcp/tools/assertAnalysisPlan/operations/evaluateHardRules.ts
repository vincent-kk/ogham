import { HardRuleCode, MethodFamily, Severity } from "../../../../types/enums.js";
import type { AssertInput, AssertReason } from "../../../../types/assert.js";

import { TECHNIQUE_RULES } from "./ruleset.js";

const GROUP_FAMILIES: ReadonlySet<MethodFamily> = new Set([
  MethodFamily.Parametric,
  MethodFamily.Nonparametric,
]);

const MIN_PER_GROUP = 2;
const SEVERE_EPV = 5;

function hard(code: HardRuleCode, message: string): AssertReason {
  return { code, severity: Severity.Hard, message };
}

/**
 * Deterministic always-block rules from normalized input fields: outcome ↔
 * method mismatch, sample too small, low expected counts without Fisher, and
 * missing required inputs. No natural-language judgement.
 */
export function evaluateHardRules(input: AssertInput): AssertReason[] {
  const reasons: AssertReason[] = [];
  const { method, datasetMeta } = input;
  const rule = TECHNIQUE_RULES[method.technique];

  if (!datasetMeta.outcomeType) {
    reasons.push(
      hard(
        HardRuleCode.MissingRequiredInput,
        "datasetMeta.outcomeType is required to evaluate method fit.",
      ),
    );
  }

  if (
    rule &&
    datasetMeta.outcomeType &&
    !rule.outcomeTypes.includes(datasetMeta.outcomeType)
  ) {
    reasons.push(
      hard(
        HardRuleCode.OutcomeMethodMismatch,
        `Outcome type '${datasetMeta.outcomeType}' is incompatible with ` +
          `'${method.technique}' (expects ${rule.outcomeTypes.join(", ")}).`,
      ),
    );
  }

  const family = rule?.family ?? method.family;
  if (
    GROUP_FAMILIES.has(family) &&
    datasetMeta.sampleSize !== undefined &&
    datasetMeta.groupCount !== undefined &&
    datasetMeta.groupCount > 0 &&
    datasetMeta.sampleSize / datasetMeta.groupCount < MIN_PER_GROUP
  ) {
    reasons.push(
      hard(
        HardRuleCode.SampleTooSmall,
        `Per-group sample size is below ${MIN_PER_GROUP} ` +
          `(n=${datasetMeta.sampleSize}, groups=${datasetMeta.groupCount}).`,
      ),
    );
  }

  if (
    family === MethodFamily.Regression &&
    datasetMeta.eventsPerVariable !== undefined &&
    datasetMeta.eventsPerVariable < SEVERE_EPV
  ) {
    reasons.push(
      hard(
        HardRuleCode.SampleTooSmall,
        `Events-per-variable (${datasetMeta.eventsPerVariable}) is severely ` +
          `insufficient for a stable regression fit.`,
      ),
    );
  }

  if (method.technique === "chi_square" && datasetMeta.expectedCountsBelow5) {
    reasons.push(
      hard(
        HardRuleCode.ExpectedCountLow,
        "Many expected counts < 5 for chi-square; use fisher_exact.",
      ),
    );
  }

  return reasons;
}
