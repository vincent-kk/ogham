import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

import type { HookName, HookResult } from './hookRunnerLayerA.js';

export interface HookRunOptions {
  env?: Record<string, string>;
  cwd?: string;
}

export interface HookRunResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  parsed: HookResult;
}

interface RawHookPayload {
  continue?: unknown;
  hookSpecificOutput?: {
    hookEventName?: unknown;
    additionalContext?: unknown;
  };
}

function parseStdout(stdout: string): HookResult {
  if (!stdout.trim()) return { continue: false };
  try {
    const raw = JSON.parse(stdout) as RawHookPayload;
    const event = raw.hookSpecificOutput?.hookEventName;
    const ctx = raw.hookSpecificOutput?.additionalContext;
    return {
      continue: raw.continue === true,
      hookEventName:
        event === 'SessionStart' || event === 'UserPromptSubmit'
          ? event
          : undefined,
      additionalContext: typeof ctx === 'string' ? ctx : undefined,
    };
  } catch {
    return { continue: false };
  }
}

export function runHookLayerB(
  name: HookName,
  opts: HookRunOptions = {},
): HookRunResult {
  const bridgeDir = process.env.COGAIR_E2E_BRIDGE;
  if (!bridgeDir) {
    throw new Error('COGAIR_E2E_BRIDGE not set');
  }
  const script = resolve(bridgeDir, `${name}.mjs`);
  const result = spawnSync(process.execPath, [script], {
    cwd: opts.cwd,
    env: { ...process.env, ...(opts.env ?? {}) },
    encoding: 'utf8',
  });
  const stdout = result.stdout ?? '';
  const stderr = result.stderr ?? '';
  return {
    exitCode: result.status ?? -1,
    stdout,
    stderr,
    parsed: parseStdout(stdout),
  };
}
