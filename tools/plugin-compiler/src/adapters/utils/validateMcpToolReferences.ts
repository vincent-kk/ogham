import type { PluginFacts } from "../../types/index.js";
import {
  prepareMcpToolReferences,
  type McpToolReferences,
} from "./mcpToolReferences/prepareMcpToolReferences.js";

/**
 * Validate all opt-in references before a builder or lint consumes the mapping.
 * @param facts Canonical plugin inputs, never modified.
 * @returns Prepared references, or null for an unmarked plugin.
 * @throws McpToolReferenceError for invalid markers, names or hook expressions.
 */
export function validateMcpToolReferences(
  facts: PluginFacts,
): McpToolReferences | null {
  return prepareMcpToolReferences(facts);
}
