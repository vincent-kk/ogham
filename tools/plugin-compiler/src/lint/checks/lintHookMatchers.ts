import type { Diagnostic, PluginFacts } from "../../types/index.js";

const TOOL_MATCHER_EVENTS = ["PreToolUse", "PostToolUse"] as const;

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
