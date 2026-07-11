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

// 이벤트당 하나의 디스패처 번들 — bridge/<event>.mjs 와 1:1.
const HOOK_CASES: HookCase[] = [
  {
    name: 'session-start',
    buildInput: (cwd) => ({
      cwd,
      session_id: 'smoke',
      hook_event_name: 'SessionStart',
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
    name: 'pre-tool-use',
    buildInput: (cwd) => ({
      cwd,
      session_id: 'smoke',
      tool_name: 'Read',
      tool_input: { file_path: join(cwd, 'noop.md') },
      hook_event_name: 'PreToolUse',
    }),
  },
  {
    name: 'post-tool-use',
    buildInput: (cwd) => ({
      cwd,
      session_id: 'smoke',
      tool_name: 'create',
      tool_input: { layer: 2, path: 'noop.md' },
      tool_response: { success: true },
      hook_event_name: 'PostToolUse',
    }),
  },
];

describe('hook bundle smoke tests', () => {
  let cwd: string;

  beforeAll(() => {
    cwd = mkdtempSync(join(tmpdir(), 'maencof-hook-smoke-'));
  });

  afterAll(() => {
    if (cwd) rmSync(cwd, { recursive: true, force: true });
  });

  for (const { name, buildInput } of HOOK_CASES) {
    const bundle = resolve(bridgeDir, `${name}.mjs`);

    it.skipIf(!existsSync(bundle))(
      `${name}.mjs spawns, exits 0, returns valid JSON, stderr clean`,
      () => {
        const result = spawnSync(process.execPath, [bundle], {
          input: JSON.stringify(buildInput(cwd)),
          encoding: 'utf8',
          timeout: 10_000,
          windowsHide: true,
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
