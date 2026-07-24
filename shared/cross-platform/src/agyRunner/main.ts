#!/usr/bin/env node
/**
 * agy hook runner — bundled to each plugin's `bridge/run-agy.mjs`.
 *
 * agy cannot load Claude-format hooks (matrix §4.3 G5), so the emitted agy `hooks.json`
 * routes each event through this runner instead of straight to the handler bundle. It
 * reads agy's camelCase payload, translates it to the Claude contract, runs the existing
 * handler bundle unchanged, and translates the reply back to agy's shape. The Claude and
 * Codex paths never touch this file.
 *
 * Invoked as: `node run-agy.mjs <ClaudeEvent> <path/to/bridge/handler.mjs>`.
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

import type {
  ClaudeHookEvent,
  ClaudeHookInput,
  ClaudeHookOutput,
} from "../agyHooks/index.js";

import { runAgyHook } from "./runAgyHook.js";
import { claimSessionStartOnce } from "./sessionOnce.js";

const NOOP = { injectSteps: [] };

const claudeEvent = process.argv[2] as ClaudeHookEvent;
const target = process.argv[3] ? resolve(process.argv[3]) : "";

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString("utf8");
}

/** Run the bundled Claude handler, feeding it the translated payload on stdin. */
function runHandler(claudeInput: ClaudeHookInput): ClaudeHookOutput | null {
  if (!target || !existsSync(target)) return null;
  const result = spawnSync(process.execPath, [target], {
    input: JSON.stringify(claudeInput),
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
    // agy gives the hook process no CLAUDE_PLUGIN_ROOT; its cwd is the plugin root
    // (the hooks.json directory), so pass that through for handlers that read the env.
    env: {
      ...process.env,
      CLAUDE_PLUGIN_ROOT: process.env.CLAUDE_PLUGIN_ROOT ?? process.cwd(),
    },
  });
  if (!result.stdout) return null;
  try {
    return result.stdout.trim()
      ? (JSON.parse(result.stdout) as ClaudeHookOutput)
      : {};
  } catch {
    return null;
  }
}

try {
  const raw = await readStdin();
  const agyPayload = raw.trim() ? JSON.parse(raw) : {};
  const conversationId =
    typeof agyPayload.conversationId === "string"
      ? agyPayload.conversationId
      : "";

  const response = runAgyHook({
    agyPayload,
    claudeEvent,
    runHandler,
    claimSessionStartOnce: () => claimSessionStartOnce(conversationId, target),
  });
  process.stdout.write(JSON.stringify(response));
} catch {
  process.stdout.write(JSON.stringify(NOOP));
}
