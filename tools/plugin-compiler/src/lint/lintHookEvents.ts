import { CODEX_HOOK_EVENT_SET } from "../constants/hosts.js";
import type { Diagnostic, PluginFacts } from "../types/adapter.js";

/** Flags hook events Codex would silently ignore (outside its 10-event set). */
export function lintHookEvents(facts: PluginFacts): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  for (const event of Object.keys(facts.hooksFile?.hooks ?? {}))
    if (!CODEX_HOOK_EVENT_SET.has(event))
      diagnostics.push({
        level: "warning",
        code: "codex-unknown-event",
        message: `${facts.name}: hooks event "${event}" is not a Codex hook event — Codex ignores it silently`,
      });
  return diagnostics;
}
