import { readFileSync } from "node:fs";
import { basename } from "node:path";
import type { AgentIR } from "../../types/ir.js";

/**
 * Parse one `definitions/agents/<name>.md` into an AgentIR — just the name and
 * the whole tokenized text. The frontmatter is not yaml-parsed here (tokenized
 * `tools:` grants are not valid YAML); Codex extracts its fields tolerantly.
 */
export function parseAgent(agentFile: string): AgentIR {
  return {
    name: basename(agentFile, ".md"),
    rawText: readFileSync(agentFile, "utf8"),
  };
}
