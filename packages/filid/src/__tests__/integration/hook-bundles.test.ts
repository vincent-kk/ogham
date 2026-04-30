import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const here = fileURLToPath(import.meta.url);
const packageRoot = resolve(here, '../../../..');
const bridgeDir = resolve(packageRoot, 'bridge');

interface HookCase {
  name: string;
  buildInput: (cwd: string) => Record<string, unknown>;
}

const HOOK_CASES: HookCase[] = [
  {
    name: 'pre-tool-use',
    buildInput: (cwd) => ({
      cwd,
      session_id: 'smoke',
      tool_name: 'Read',
      tool_input: { file_path: join(cwd, 'noop.txt') },
      hook_event_name: 'PreToolUse',
    }),
  },
  {
    name: 'agent-enforcer',
    buildInput: (cwd) => ({
      cwd,
      session_id: 'smoke',
      agent_type: 'general-purpose',
      hook_event_name: 'SubagentStart',
    }),
  },
  {
    name: 'user-prompt-submit',
    buildInput: (cwd) => ({
      cwd,
      session_id: 'smoke',
      prompt: 'hello',
      hook_event_name: 'UserPromptSubmit',
    }),
  },
  {
    name: 'session-cleanup',
    buildInput: (cwd) => ({
      cwd,
      session_id: 'smoke',
      hook_event_name: 'SessionEnd',
    }),
  },
  {
    name: 'setup',
    buildInput: (cwd) => ({
      cwd,
      session_id: 'smoke',
      hook_event_name: 'SessionStart',
    }),
  },
];

describe('hook bundle smoke tests', () => {
  let cwd: string;

  beforeAll(() => {
    cwd = mkdtempSync(join(tmpdir(), 'filid-hook-smoke-'));
  });

  afterAll(() => {
    if (cwd) rmSync(cwd, { recursive: true, force: true });
  });

  for (const { name, buildInput } of HOOK_CASES) {
    const bundle = resolve(bridgeDir, `${name}.mjs`);

    it.skipIf(!existsSync(bundle))(
      `${name}.mjs spawns, exits 0, returns valid JSON, stderr clean`,
      () => {
        const result = spawnSync('node', [bundle], {
          input: JSON.stringify(buildInput(cwd)),
          encoding: 'utf8',
          timeout: 10_000,
        });

        expect(result.status).toBe(0);
        expect(() => JSON.parse(result.stdout)).not.toThrow();
        expect(result.stderr).not.toMatch(
          /Dynamic require|Cannot find module|^Error:/m,
        );
      },
    );
  }
});
