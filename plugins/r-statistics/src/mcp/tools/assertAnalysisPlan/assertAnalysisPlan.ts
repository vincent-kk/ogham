import { AssertSeverity, ExecutionMode } from "../../../types/enums.js";
import type { AssertInput, AssertOutput } from "../../../types/assert.js";

import { evaluateHardRules } from "./operations/evaluateHardRules.js";
import { evaluateSoftRules } from "./operations/evaluateSoftRules.js";

/**
 * assert-analysis-plan: the deterministic statistical hard gate. Hard rules
 * always block (interactive + auto). Soft rules warn — allowed in interactive
 * (improve via conversation), blocked in auto (strict reselect). No execution,
 * no natural-language judgement: a pure function of normalized input.
 */
export async function handleAssertAnalysisPlan(
  input: AssertInput,
): Promise<AssertOutput> {
  const hardReasons = evaluateHardRules(input);
  if (hardReasons.length > 0) {
    return {
      allowed: false,
      severity: AssertSeverity.HardBlock,
      reasons: hardReasons,
    };
  }

  const { reasons, recommendedAlternatives } = evaluateSoftRules(input);
  if (reasons.length > 0) {
    return {
      allowed: input.mode === ExecutionMode.Interactive,
      severity: AssertSeverity.SoftWarning,
      reasons,
      recommendedAlternatives:
        recommendedAlternatives.length > 0
          ? recommendedAlternatives
          : undefined,
    };
  }

  return { allowed: true, severity: AssertSeverity.Ok, reasons: [] };
}
