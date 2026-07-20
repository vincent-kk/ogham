import { AGY_RUNNER_BRIDGE } from "../../constants/adapterPaths.js";
import type { PluginFacts } from "../../types/index.js";

/**
 * Pull the handler bundle (`bridge/<name>.mjs`) out of a Claude hook command.
 * Claude commands run as `node "${CLAUDE_PLUGIN_ROOT}/libs/run.cjs"
 * "${CLAUDE_PLUGIN_ROOT}/bridge/<name>.mjs"`; only the handler lives under
 * `bridge/`, so the first (and only) `bridge/*.mjs` match is it.
 */
function handlerBridge(command: string | undefined): string | null {
  const match = command?.match(/bridge\/[\w.-]+\.mjs/);
  return match ? match[0] : null;
}

/**
 * Translate a plugin's Claude PreToolUse hooks into agy's named-group
 * `hooks.json`. Only PreToolUse is emitted: it is the one hook whose value
 * survives on agy — the model is forced to honour a `{decision:"deny"}` (gating,
 * live-measured). SessionStart/UserPromptSubmit inject context via
 * PreInvocation, which agy 1.1.2 parses but does not render, so wiring them
 * would ship dead weight that spawns on every model turn. PostToolUse has no
 * agy translation yet (the runner throws), so it is left out too.
 *
 * Each handler is routed through `bridge/run-agy.mjs` (the bundled agyRunner),
 * which reads agy's camelCase payload, runs the same Claude handler bundle, and
 * translates the reply back. The matcher is `*` (all tools) rather than a
 * translated tool regex — agy's tool vocabulary differs from Claude's, and the
 * runner already no-ops (allow) on tools the guard does not care about, so `*`
 * is both simpler and robust against unenumerated agy tool aliases.
 *
 * Returns null when the plugin has no PreToolUse handler, so plugins without one
 * (cennad, maencof-lens) emit no agy `hooks.json`.
 */
export function buildAgyHooks(
  facts: PluginFacts,
): Record<string, unknown> | null {
  const groups = facts.hooksFile?.hooks?.PreToolUse;
  if (!groups) return null;

  const handlers = groups
    .flatMap((group) => group.hooks ?? [])
    .map((hook) => handlerBridge(hook.command))
    .filter((bridge): bridge is string => bridge !== null)
    .map((bridge) => ({
      type: "command",
      command: `node ${AGY_RUNNER_BRIDGE} PreToolUse ${bridge}`,
    }));

  if (handlers.length === 0) return null;

  return {
    [facts.name]: {
      PreToolUse: [{ matcher: "*", hooks: handlers }],
    },
  };
}
