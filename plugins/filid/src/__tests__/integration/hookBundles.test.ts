import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

const here = fileURLToPath(import.meta.url);
const packageRoot = resolve(here, '../../../..');
const bridgeDir = resolve(packageRoot, 'bridge');

interface HookCase {
  name: string;
  buildInput: (cwd: string) => Record<string, unknown>;
}

const HOOK_CASES: HookCase[] = [
  {
    name: 'setup',
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

describe('spike mode gate — built bundle behavior', () => {
  const preToolBundle = resolve(bridgeDir, 'pre-tool-use.mjs');
  const promptBundle = resolve(bridgeDir, 'user-prompt-submit.mjs');
  let repo: string;

  function makeRepo(branch: string): void {
    repo = mkdtempSync(join(tmpdir(), 'filid-spike-smoke-'));
    mkdirSync(join(repo, '.git'), { recursive: true });
    writeFileSync(join(repo, '.git', 'HEAD'), `ref: refs/heads/${branch}\n`);
    mkdirSync(join(repo, '.filid'), { recursive: true });
    writeFileSync(join(repo, '.filid', 'config.json'), '{}');
  }

  function runBundle(
    bundle: string,
    input: Record<string, unknown>,
  ): { hookSpecificOutput?: Record<string, unknown> } {
    const result = spawnSync('node', [bundle], {
      input: JSON.stringify(input),
      encoding: 'utf8',
      timeout: 10_000,
      env: { ...process.env, CLAUDE_CONFIG_DIR: join(repo, 'claude-home') },
    });
    expect(result.status).toBe(0);
    return JSON.parse(result.stdout) as {
      hookSpecificOutput?: Record<string, unknown>;
    };
  }

  const oversizedIntentWrite = (): Record<string, unknown> => ({
    cwd: repo,
    session_id: 'spike-smoke',
    tool_name: 'Write',
    tool_input: {
      file_path: join(repo, 'INTENT.md'),
      content: Array.from({ length: 60 }, (_, i) => `Line ${i + 1}`).join('\n'),
    },
    hook_event_name: 'PreToolUse',
  });

  afterEach(() => {
    if (repo) rmSync(repo, { recursive: true, force: true });
  });

  it.skipIf(!existsSync(preToolBundle))(
    'spike branch: over-50-line INTENT.md Write passes the built bundle',
    () => {
      makeRepo('spike/poc');
      const output = runBundle(preToolBundle, oversizedIntentWrite());
      expect(output.hookSpecificOutput?.permissionDecision).toBeUndefined();
    },
  );

  it.skipIf(!existsSync(preToolBundle))(
    'normal branch: over-50-line INTENT.md Write stays denied in the built bundle',
    () => {
      makeRepo('main');
      const output = runBundle(preToolBundle, oversizedIntentWrite());
      expect(output.hookSpecificOutput?.permissionDecision).toBe('deny');
    },
  );

  it.skipIf(!existsSync(promptBundle))(
    'spike branch: user-prompt-submit emits the spike banner every prompt',
    () => {
      makeRepo('spike/poc');
      const input = {
        cwd: repo,
        session_id: 'spike-smoke',
        prompt: 'hello',
        hook_event_name: 'UserPromptSubmit',
      };
      runBundle(promptBundle, input);
      const second = runBundle(promptBundle, input);
      expect(second.hookSpecificOutput?.additionalContext).toContain(
        '[filid:spike] SPIKE MODE',
      );
    },
  );
});
