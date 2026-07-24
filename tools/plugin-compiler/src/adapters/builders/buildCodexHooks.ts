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
 * Rewrite a plugin's Claude hooks into a Codex-specific copy that adds `Bash` to
 * every PreToolUse matcher naming file tools, so Codex fires the hook on a shell
 * read (`cat foo`) — @ogham/cross-platform `parseBashRead` then promotes it to
 * Read for the same handler, recovering the read-context injection that a
 * `Read|Write|Edit` matcher silently loses on Codex (it has no Read tool).
 *
 * The whole hooks object is copied — Codex reads all its events from this one
 * file once the manifest points at it — and only the matching PreToolUse groups
 * change. Claude keeps using `hooks/hooks.json` unchanged, so it pays no cost.
 *
 * Returns null when nothing changes (a `*` matcher already catches Bash, or the
 * plugin has no read-catching matcher), so that plugin's Codex manifest keeps
 * pointing at the shared file and no redundant copy is emitted.
 */
export function buildCodexHooks(
  facts: PluginFacts,
): Record<string, unknown> | null {
  const hooks = facts.hooksFile?.hooks;
  if (!hooks) return null;

  let changed = false;
  const rewritten: Record<string, HookMatcherGroup[]> = {};
  for (const [event, groups] of Object.entries(hooks))
    rewritten[event] = groups.map((group) => {
      if (event !== "PreToolUse" || !needsBash(group.matcher)) return group;
      changed = true;
      return { ...group, matcher: `${group.matcher}|${BASH_TOOL}` };
    });

  return changed ? { hooks: rewritten } : null;
}
