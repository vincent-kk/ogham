import type { PluginIR } from "../../types/ir.js";
import type { HostProfile } from "../../types/profile.js";

/**
 * Surface hook capability loss so it is never silent. Codex drops every hook;
 * agy drops once-per-session-heavy events (SessionEnd — its `Stop` fires per
 * turn, not per session) and needs a runner once-guard for SessionStart.
 * `mcp-lifecycle` hooks are intentionally runtime-handled (MCP server shutdown)
 * and are NOT a loss on any host, so they never warn. Returns human-readable
 * warnings (empty when the host runs the surviving hooks natively).
 */
export function lintHooks(ir: PluginIR, profile: HostProfile): string[] {
  const lost = ir.hooks.filter((h) => h.fallback !== "mcp-lifecycle");
  if (!lost.length) return [];

  if (profile.hooks.form === "none") {
    const events = [...new Set(lost.map((h) => h.event))].join(", ");
    return [
      `all hooks dropped (${events}) — Codex has no plugin hooks; compensate via AGENTS.md / MCP-boot sweep`,
    ];
  }
  if (profile.hooks.form !== "agy-named-groups") return [];

  const events = new Set(lost.map((h) => h.event));
  const warnings: string[] = [];
  if (events.has("SessionEnd"))
    warnings.push(
      "SessionEnd dropped on agy (its Stop fires per turn, not per session) — compensate via MCP-boot sweep; recap/commit-type work is a capability loss",
    );
  if (events.has("SubagentStart"))
    warnings.push("SubagentStart dropped on agy (no equivalent event)");
  if (events.has("SessionStart"))
    warnings.push(
      "SessionStart → agy PreInvocation needs the runner once-guard (Stage D) to avoid re-running each invocation",
    );
  return warnings;
}
