import type { Diagnostic, PluginFacts } from "../types/adapter.js";

const TOOL_MATCHER_EVENTS = ["PreToolUse", "PostToolUse"] as const;

/**
 * Flags `Read` in tool matchers: Codex has no Read hook alias (file reads go
 * through Bash), so only the Write/Edit legs fire there.
 */
export function lintHookMatchers(facts: PluginFacts): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  for (const event of TOOL_MATCHER_EVENTS)
    for (const group of facts.hooksFile?.hooks?.[event] ?? [])
      if (group.matcher?.split("|").includes("Read"))
        diagnostics.push({
          level: "warning",
          code: "codex-read-matcher",
          message: `${facts.name}: ${event} matcher "${group.matcher}" — "Read" never fires on Codex (no Read alias)`,
        });
  return diagnostics;
}
