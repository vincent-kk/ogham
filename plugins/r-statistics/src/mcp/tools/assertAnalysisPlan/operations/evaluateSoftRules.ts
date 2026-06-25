import { Severity } from "../../../../types/enums.js";
import type { AssertInput, AssertReason } from "../../../../types/assert.js";

import { TECHNIQUE_RULES } from "./ruleset.js";

export interface SoftEvaluation {
  reasons: AssertReason[];
  recommendedAlternatives: string[];
}

function soft(code: string, message: string): AssertReason {
  return { code, severity: Severity.Soft, message };
}

/**
 * Evaluate the chosen technique's soft assumptions against the supplied
 * assumption-check artifacts: a violated (passed=false) assumption warns and
 * surfaces its recommended alternatives; a missing artifact warns "unverified".
 */
export function evaluateSoftRules(input: AssertInput): SoftEvaluation {
  const rule = TECHNIQUE_RULES[input.method.technique];
  if (!rule) return { reasons: [], recommendedAlternatives: [] };

  const byId = new Map(
    (input.assumptionArtifacts ?? []).map((a) => [a.assumptionId, a]),
  );
  const reasons: AssertReason[] = [];
  const alternatives = new Set<string>();

  for (const assumption of rule.assumptions) {
    const artifact = byId.get(assumption.id);
    if (artifact === undefined) {
      reasons.push(
        soft(
          `${assumption.id}_unverified`,
          `Assumption '${assumption.id}' was not verified (no ${assumption.check} artifact).`,
        ),
      );
      continue;
    }
    if (!artifact.passed) {
      reasons.push(
        soft(
          `${assumption.id}_violated`,
          `Assumption '${assumption.id}' failed (${assumption.check}).`,
        ),
      );
      for (const alt of assumption.recommend ?? []) alternatives.add(alt);
    }
  }

  return { reasons, recommendedAlternatives: [...alternatives] };
}
