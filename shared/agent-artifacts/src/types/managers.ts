import type { InstructionSectionManager } from "./instructions.js";
import type { McpServerManager } from "./mcp.js";
import type { RuleDocumentManager } from "./rules.js";

export interface ArtifactManager {
  readonly rules: RuleDocumentManager;
  readonly instructions: InstructionSectionManager;
  readonly mcp: McpServerManager;
}
