import type {
  RuleDocumentManager,
  RuleDocumentManagerOptions,
  RuleDocumentPlan,
} from "../types/rules.js";
import { requireArtifactOwner } from "../validation/index.js";
import { applyRuleExecution } from "./adapters/applyRuleExecution.js";
import { validateRuleDocuments } from "./helpers/validateRuleDocuments.js";
import { validateRuleRequest } from "./helpers/validateRuleRequest.js";
import { planRuleDocuments } from "./planning/planRuleDocuments.js";
import { inspectRuleDocuments } from "./status/inspectRuleDocuments.js";
import type { RuleExecution } from "./types/internal.js";

export function createRuleDocumentManager(
  options: RuleDocumentManagerOptions,
): RuleDocumentManager {
  requireArtifactOwner(options.owner);
  const executions = new WeakMap<RuleDocumentPlan, RuleExecution>();

  return {
    inspect(documents) {
      validateRuleDocuments(documents);
      return inspectRuleDocuments(options, documents);
    },
    plan(request) {
      validateRuleRequest(request);
      const prepared = planRuleDocuments(options, request);
      executions.set(prepared.plan, prepared.execution);
      return prepared.plan;
    },
    apply(plan) {
      const execution = executions.get(plan);
      if (execution === undefined)
        throw new Error("Rule document plan was not created by this manager");

      return applyRuleExecution(plan, execution);
    },
  };
}
