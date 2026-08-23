import { CODEX_HOOK_MATCHER_CAPABILITIES } from "../../constants/hosts.js";
import type { Diagnostic, PluginFacts } from "../../types/index.js";

export function lintHookMatchers(facts: PluginFacts): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  for (const event of CODEX_HOOK_MATCHER_CAPABILITIES.toolMatcherEvents)
    for (const group of facts.hooksFile?.hooks?.[event] ?? []) {
      const tools = group.matcher?.split("|") ?? [];
      for (const fallback of CODEX_HOOK_MATCHER_CAPABILITIES.preToolFallbacks)
        if (tools.includes(fallback.source))
          diagnostics.push({
            level: "warning",
            code: "codex-read-matcher",
            message: `${facts.name}: ${event} matcher "${group.matcher}" — Codex has no ${fallback.source} tool; PreToolUse recovers simple shell reads (cat/head) via the ${fallback.target} channel, but complex reads (pipes/grep) are not tracked`,
          });
      for (const tool of CODEX_HOOK_MATCHER_CAPABILITIES.unsupportedExactTools)
        if (tools.includes(tool))
          diagnostics.push({
            level: "warning",
            code: "codex-unsupported-tool-matcher",
            message: `${facts.name}: ${event} matcher "${group.matcher}" names ${tool}, which Codex does not expose as a hook tool; the Codex adapter removes that exact token`,
          });
    }
  return diagnostics;
}
