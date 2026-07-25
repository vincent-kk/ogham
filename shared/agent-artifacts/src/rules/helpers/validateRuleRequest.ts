import type { RuleDocumentRequest } from "../../types/rules.js";
import { validateRuleDocuments } from "./validateRuleDocuments.js";

export function validateRuleRequest(request: RuleDocumentRequest): void {
  validateRuleDocuments(request.documents);
  const ids = new Set(request.documents.map((document) => document.id));

  for (const id of [...request.desired, ...request.replaceDrift])
    if (!ids.has(id))
      throw new Error(`Unknown rule document id in request: "${id}"`);
}
