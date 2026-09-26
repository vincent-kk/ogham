import {
  McpToolReferenceError,
  validateMcpToolReferences,
} from "../../adapters/index.js";
import type { Diagnostic, PluginFacts } from "../../types/index.js";

/**
 * Report explicit MCP adaptation failures before adapter planning.
 * @param facts Canonical inputs shared with adapter builders, left unchanged.
 * @returns Typed error diagnostics, or an empty list for valid/absent opt-in.
 * @throws Error when validation raises an unrelated programming failure.
 */
export function lintMcpToolReferences(facts: PluginFacts): Diagnostic[] {
  try {
    validateMcpToolReferences(facts);
    return [];
  } catch (error) {
    if (!(error instanceof McpToolReferenceError)) throw error;
    return [
      {
        level: "error",
        code: error.code,
        message: `${facts.name}: ${error.message}`,
      },
    ];
  }
}
