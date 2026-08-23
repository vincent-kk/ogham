import {
  CODEX_HOOK_EVENT_SET,
  CODEX_HOOK_MATCHER_CAPABILITIES,
} from "../../constants/hosts.js";
import type { HookMatcherGroup, PluginFacts } from "../../types/index.js";

const UNSUPPORTED_TOOL_SET = new Set(
  CODEX_HOOK_MATCHER_CAPABILITIES.unsupportedExactTools,
);

/**
 * A PreToolUse matcher of named file tools needs `Bash` appended for Codex: only
 * a matcher that names `Read` (the tool Codex lacks) is trying to catch reads, so
 * a `*` matcher already fires on Bash (maencof) and a `Write|Edit`-only matcher
 * does not care about reads. Skip anything that already lists `Bash`.
 */
function rewriteMatcher(
  event: string,
  matcher: string | undefined,
): string | undefined {
  if (
    !CODEX_HOOK_MATCHER_CAPABILITIES.toolMatcherEvents.includes(event) ||
    !matcher ||
    matcher === "*"
  )
    return matcher;

  const tools = matcher
    .split("|")
    .filter((tool) => !UNSUPPORTED_TOOL_SET.has(tool));
  if (event === "PreToolUse")
    for (const fallback of CODEX_HOOK_MATCHER_CAPABILITIES.preToolFallbacks)
      if (tools.includes(fallback.source) && !tools.includes(fallback.target))
        tools.push(fallback.target);

  return tools.length > 0 ? tools.join("|") : undefined;
}

/**
 * Rewrite a plugin's Claude hooks into a Codex-specific compatible copy.
 *
 * Unsupported events are omitted. Tool matcher capability rewrites are limited
 * to declared tool events; matching PreToolUse groups gain `Bash`, so a shell
 * read can be promoted by @ogham/cross-platform to the Claude `Read`
 * vocabulary. Claude keeps using `hooks/hooks.json` unchanged.
 *
 * @param facts Canonical Claude plugin facts.
 * @returns A dedicated Codex hooks object when filtering or matcher rewriting
 * changes the source, otherwise null so the shared file remains authoritative.
 */
export function buildCodexHooks(
  facts: PluginFacts,
): Record<string, unknown> | null {
  const hooks = facts.hooksFile?.hooks;
  if (!hooks) return null;

  let changed = false;
  const rewritten: Record<string, HookMatcherGroup[]> = {};
  for (const [event, groups] of Object.entries(hooks)) {
    if (!CODEX_HOOK_EVENT_SET.has(event)) {
      changed = true;
      continue;
    }
    const rewrittenGroups: HookMatcherGroup[] = [];
    for (const group of groups) {
      const matcher = rewriteMatcher(event, group.matcher);
      if (matcher === undefined && group.matcher !== undefined) {
        changed = true;
        continue;
      }
      if (matcher !== group.matcher) {
        changed = true;
        rewrittenGroups.push({ ...group, matcher });
      } else rewrittenGroups.push(group);
    }
    if (rewrittenGroups.length > 0) rewritten[event] = rewrittenGroups;
    else if (groups.length > 0) changed = true;
  }

  return changed ? { hooks: rewritten } : null;
}
