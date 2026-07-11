import { stableJson } from "../../json/stableJson.js";
import type { HookIR, PluginIR } from "../../types/ir.js";
import type { FileMap } from "../../types/output.js";
import type { HostProfile } from "../../types/profile.js";

/** Approximate Claude tool matcher → agy tool matcher (refined by Stage 1 smoke). */
const MATCHER: Record<string, string> = {
  Read: "view_file",
  Write: "write_to_file",
  Edit: "replace_file_content",
};

interface AgyTarget {
  event: string;
  grouped: boolean;
}

/**
 * Decide how a hook maps onto agy, or null if it must NOT become an agy hook.
 *
 * agy's `Stop` fires at the end of *every* execution loop (per turn), like
 * Claude's `Stop` — NOT once per session. So a once-per-session event whose work
 * is heavy (SessionEnd cleanup / vault commit / recap) must never map to `Stop`;
 * that would run the heavy work every turn. Such hooks are dropped here and
 * compensated out-of-band (MCP-server-boot stale sweep). The decision follows the
 * hook's `fallback`, not a fixed event table:
 *
 *  - PreToolUse / PostToolUse   → native agy events (grouped, matcher-translated).
 *  - fallback pre-invocation-once → agy `PreInvocation` (per model call; needs the
 *    runner once-guard — Stage D — to fire only on the first invocation).
 *  - fallback stop              → agy `Stop` (opt-in; only for genuinely lightweight
 *    per-turn-end work).
 *  - fallback stale-sweep / drop / none → dropped (no safe agy hook).
 */
function agyTarget(hook: HookIR): AgyTarget | null {
  if (hook.event === "PreToolUse")
    return { event: "PreToolUse", grouped: true };
  if (hook.event === "PostToolUse")
    return { event: "PostToolUse", grouped: true };
  switch (hook.fallback) {
    case "pre-invocation-once":
      return { event: "PreInvocation", grouped: false };
    case "stop":
      return { event: "Stop", grouped: false };
    default:
      return null; // stale-sweep / mcp-lifecycle / drop / undefined — deferred to MCP-boot sweep, MCP shutdown, or lost
  }
}

/**
 * Emit lifecycle hooks per host:
 *  - claude-json: reproduce `hooks/hooks.json` by substituting `{{pluginRoot}}`
 *    into the raw text (structure-preserving → semantically identical).
 *  - agy-named-groups: rebuild `hooks.json` in agy's named-group form, mapping
 *    events by fallback and dropping once-per-session-heavy events (see agyTarget).
 *  - none: emit nothing (Codex has no plugin hooks).
 */
export function emitHooks(ir: PluginIR, profile: HostProfile): FileMap {
  const files: FileMap = new Map();
  const { form, root } = profile.hooks;
  if (form === "none" || root === null || !ir.hooks.length) return files;

  if (form === "claude-json") {
    if (!ir.hooksRaw) return files;
    const substituted = ir.hooksRaw.replaceAll("{{pluginRoot}}", root);
    const lifecycle = new Set(
      ir.hooks
        .filter((h) => h.fallback === "mcp-lifecycle")
        .map((h) => h.event),
    );
    // Byte-fidelity passthrough unless some event is MCP-lifecycle-owned, in which
    // case that event is filtered out of the Claude hooks.json (handled by the server).
    const text =
      lifecycle.size === 0
        ? substituted
        : filterClaudeEvents(substituted, lifecycle);
    if (text) files.set("hooks/hooks.json", Buffer.from(text, "utf8"));
  } else if (form === "agy-named-groups") {
    const json = buildAgyHooks(ir.hooks, ir.name, root);
    if (json) files.set("hooks.json", Buffer.from(json, "utf8"));
  }
  return files;
}

/** Remove given event keys from a Claude hooks.json; null if none remain. */
function filterClaudeEvents(
  rawJson: string,
  dropped: Set<string>,
): string | null {
  const obj = JSON.parse(rawJson) as { hooks?: Record<string, unknown> };
  if (obj.hooks) for (const event of dropped) delete obj.hooks[event];
  if (!obj.hooks || Object.keys(obj.hooks).length === 0) return null;
  return stableJson(obj);
}

/** Build agy named-group hooks.json, or null if no hook survives mapping. */
function buildAgyHooks(
  hooks: HookIR[],
  plugin: string,
  root: string,
): string | null {
  const named: Record<string, Record<string, unknown[]>> = {};
  for (const hook of hooks) {
    const target = agyTarget(hook);
    if (!target) continue;
    const handler = {
      type: "command",
      command: hook.command.replaceAll("{{pluginRoot}}", root),
      ...(hook.timeout ? { timeout: hook.timeout } : {}),
    };
    const group = (named[`${plugin}-${hook.event}`] ??= {});
    const list = (group[target.event] ??= []);
    list.push(
      target.grouped
        ? { matcher: translateMatcher(hook.matcher), hooks: [handler] }
        : handler,
    );
  }
  return Object.keys(named).length ? stableJson(named) : null;
}

function translateMatcher(matcher: string): string {
  if (matcher === "*" || matcher === "") return matcher;
  return matcher
    .split("|")
    .map((tool) => MATCHER[tool] ?? tool)
    .join("|");
}
