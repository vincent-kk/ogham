import type { RuleActionDecision } from "../types/internal.js";

export interface RuleActionFacts {
  readonly desired: boolean;
  readonly deployed: boolean;
  readonly contentAvailable: boolean;
  readonly matches: boolean;
  readonly replaceDrift: boolean;
}

export function decideRuleAction(facts: RuleActionFacts): RuleActionDecision {
  if (!facts.desired)
    return { action: facts.deployed ? "remove" : "unchanged" };

  if (!facts.contentAvailable)
    return {
      action: "skip",
      reason: "template content is unavailable",
    };

  if (!facts.deployed) return { action: "copy" };
  if (facts.matches) return { action: "unchanged" };
  if (facts.replaceDrift) return { action: "update" };
  return {
    action: "drift",
    reason: "deployed content differs from the template",
  };
}
