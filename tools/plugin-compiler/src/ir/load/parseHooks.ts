import { readFileSync } from "node:fs";
import type { HookFallback, HookIR, LogicalEvent } from "../../types/ir.js";

/** Default rewiring intent per event, used when a host lacks the event (agy). */
const FALLBACK: Partial<Record<LogicalEvent, HookFallback>> = {
  SessionStart: "pre-invocation-once",
  UserPromptSubmit: "pre-invocation-once",
  SessionEnd: "stale-sweep",
  SubagentStart: "drop",
};

interface RawHooks {
  hooks?: Record<string, Array<{ matcher?: string; hooks?: RawHandler[] }>>;
}
interface RawHandler {
  type?: string;
  command?: string;
  timeout?: number;
}

/**
 * Parse `definitions/hooks.json` (tokenized: `{{pluginRoot}}`) into a flat
 * HookIR list. Only `command` handlers are carried; each gets a fallback — the
 * plugin.yaml `hooks:` override for its event if present, else the event default.
 */
export function parseHooks(
  hooksFile: string,
  overrides: Record<string, HookFallback> = {},
): HookIR[] {
  const json = JSON.parse(readFileSync(hooksFile, "utf8")) as RawHooks;
  const out: HookIR[] = [];
  for (const [event, groups] of Object.entries(json.hooks ?? {}))
    for (const group of groups)
      for (const handler of group.hooks ?? []) {
        if (handler.type && handler.type !== "command") continue;
        if (!handler.command) continue;
        out.push({
          event: event as LogicalEvent,
          matcher: group.matcher ?? "*",
          command: handler.command,
          timeout: handler.timeout,
          fallback: overrides[event] ?? FALLBACK[event as LogicalEvent],
        });
      }
  return out;
}
