import {
  HardRuleCode,
  MethodFamily,
  Severity,
  type OutcomeType,
} from "../../../../types/enums.js";
import type { AssertInput, AssertReason } from "../../../../types/assert.js";

import { TECHNIQUE_RULES, type TechniqueRule } from "./ruleset.js";

const GROUP_FAMILIES: ReadonlySet<MethodFamily> = new Set([
  MethodFamily.Parametric,
  MethodFamily.Nonparametric,
]);

const MIN_PER_GROUP = 2;
const SEVERE_EPV = 5;

function hard(code: HardRuleCode, message: string): AssertReason {
  return { code, severity: Severity.Hard, message };
}

function checkOutcomeMismatch(
  rule: TechniqueRule | undefined,
  technique: string,
  outcomeType: OutcomeType,
): AssertReason | null {
  if (rule && !rule.outcomeTypes.includes(outcomeType)) {
    return hard(
      HardRuleCode.OutcomeMethodMismatch,
      `Outcome type '${outcomeType}' is incompatible with ` +
        `'${technique}' (expects ${rule.outcomeTypes.join(", ")}).`,
    );
  }
  return null;
}

function checkGroupSize(
  family: MethodFamily,
  sampleSize: number | undefined,
  groupCount: number | undefined,
): AssertReason | null {
  if (
    GROUP_FAMILIES.has(family) &&
    sampleSize !== undefined &&
    groupCount !== undefined &&
    groupCount > 0 &&
    sampleSize / groupCount < MIN_PER_GROUP
  ) {
    return hard(
      HardRuleCode.SampleTooSmall,
      `Per-group sample size is below ${MIN_PER_GROUP} ` +
        `(n=${sampleSize}, groups=${groupCount}).`,
    );
  }
  return null;
}

function checkEpv(
  family: MethodFamily,
  eventsPerVariable: number | undefined,
): AssertReason | null {
  if (
    (family === MethodFamily.Regression || family === MethodFamily.Survival) &&
    eventsPerVariable !== undefined &&
    eventsPerVariable < SEVERE_EPV
  ) {
    return hard(
      HardRuleCode.SampleTooSmall,
      `Events-per-variable (${eventsPerVariable}) is severely ` +
        `insufficient for a stable regression fit.`,
    );
  }
  return null;
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

  if (datasetMeta.outcomeType) {
    const r = checkOutcomeMismatch(rule, method.technique, datasetMeta.outcomeType);
    if (r) reasons.push(r);
  }

  const family = rule?.family ?? method.family;

  const groupSizeReason = checkGroupSize(family, datasetMeta.sampleSize, datasetMeta.groupCount);
  if (groupSizeReason) reasons.push(groupSizeReason);

  const epvReason = checkEpv(family, datasetMeta.eventsPerVariable);
  if (epvReason) reasons.push(epvReason);

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
