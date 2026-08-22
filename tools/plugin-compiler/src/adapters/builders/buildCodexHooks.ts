import { CODEX_HOOK_EVENT_SET } from "../../constants/hosts.js";
import type { HookMatcherGroup, PluginFacts } from "../../types/index.js";

const READ_TOOL = "Read";
const BASH_TOOL = "Bash";

/**
 * A PreToolUse matcher of named file tools needs `Bash` appended for Codex: only
 * a matcher that names `Read` (the tool Codex lacks) is trying to catch reads, so
 * a `*` matcher already fires on Bash (maencof) and a `Write|Edit`-only matcher
 * does not care about reads. Skip anything that already lists `Bash`.
 */
function needsBash(matcher: string | undefined): boolean {
  if (!matcher || matcher === "*") return false;
  const tools = matcher.split("|");
  return tools.includes(READ_TOOL) && !tools.includes(BASH_TOOL);
}

/**
 * Rewrite a plugin's Claude hooks into a Codex-specific compatible copy.
 *
 * Unsupported events are omitted. Matching PreToolUse groups gain `Bash`, so a
 * shell read can be promoted by @ogham/cross-platform to the Claude `Read`
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
    rewritten[event] = groups.map((group) => {
      if (event !== "PreToolUse" || !needsBash(group.matcher)) return group;
      changed = true;
      return { ...group, matcher: `${group.matcher}|${BASH_TOOL}` };
    });
  }

  return changed ? { hooks: rewritten } : null;
}
