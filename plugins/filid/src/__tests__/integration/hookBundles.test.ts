import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

import {
  listDirectoryIfExistsSync,
  portableResolve,
  readUtf8FileIfExistsSync,
} from '@ogham/cross-platform';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const HOOK_EVENT_NAME = {
  SESSION_START: 'SessionStart',
  USER_PROMPT_SUBMIT: 'UserPromptSubmit',
  PRE_TOOL_USE: 'PreToolUse',
} as const;

const HOOK_BUNDLE_NAME = {
  SETUP: 'setup',
  USER_PROMPT_SUBMIT: 'user-prompt-submit',
  PRE_TOOL_USE: 'pre-tool-use',
} as const;

const SHARED_RUNNER_NAME = {
  AGY: 'run-agy.mjs',
  HOST: 'run-hook.cmd',
} as const;

const RETIRED_AGENT_BUNDLE = 'agent-enforcer.mjs';
const PACKAGE_ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const BRIDGE_DIR = portableResolve(PACKAGE_ROOT, 'bridge');
const CANONICAL_HOOKS_PATH = portableResolve(
  PACKAGE_ROOT,
  'hooks',
  'hooks.json',
);
const EXPECTED_HOOK_EVENTS = Object.values(HOOK_EVENT_NAME);
const EXPECTED_HOOK_ARTIFACTS = [
  ...Object.values(HOOK_BUNDLE_NAME).map((name) => `${name}.mjs`),
  ...Object.values(SHARED_RUNNER_NAME),
];

interface HookCase {
  name: string;
  buildInput: (cwd: string) => Record<string, unknown>;
}

interface CanonicalHooksManifest {
  hooks: Record<string, unknown>;
}

interface PreToolUseBundleResult {
  continue: boolean;
  hookSpecificOutput?: {
    permissionDecision?: string;
    permissionDecisionReason?: string;
    additionalContext?: string;
  };
}

function runPreToolUseBundle(
  cwd: string,
  sessionId: string,
  toolName: string,
  toolInput: Record<string, unknown>,
): PreToolUseBundleResult {
  const bundle = portableResolve(BRIDGE_DIR, 'pre-tool-use.mjs');
  expect(existsSync(bundle)).toBe(true);
  const spawned = spawnSync(process.execPath, [bundle], {
    input: JSON.stringify({
      cwd,
      session_id: sessionId,
      hook_event_name: HOOK_EVENT_NAME.PRE_TOOL_USE,
      tool_name: toolName,
      tool_input: toolInput,
    }),
    encoding: 'utf8',
    timeout: 10_000,
    env: { ...process.env, CLAUDE_CONFIG_DIR: cwd },
  });
  expect(spawned.status).toBe(0);
  expect(spawned.stderr).not.toMatch(
    /Dynamic require|Cannot find module|^Error:/m,
  );
  return JSON.parse(spawned.stdout) as PreToolUseBundleResult;
}

const HOOK_CASES: readonly HookCase[] = [
  {
    name: HOOK_BUNDLE_NAME.SETUP,
    buildInput: (cwd) => ({
      cwd,
      session_id: 'smoke',
      hook_event_name: HOOK_EVENT_NAME.SESSION_START,
    }),
  },
  {
    name: HOOK_BUNDLE_NAME.USER_PROMPT_SUBMIT,
    buildInput: (cwd) => ({
      cwd,
      session_id: 'smoke',
      prompt: 'hello',
      hook_event_name: HOOK_EVENT_NAME.USER_PROMPT_SUBMIT,
    }),
  },
  {
    name: HOOK_BUNDLE_NAME.PRE_TOOL_USE,
    buildInput: (cwd) => ({
      cwd,
      session_id: 'smoke',
      tool_name: 'Read',
      tool_input: { file_path: portableResolve(cwd, 'noop.txt') },
      hook_event_name: HOOK_EVENT_NAME.PRE_TOOL_USE,
    }),
  },
];

describe('hook bundle registration', () => {
  it('registers only the three active lifecycle hooks', () => {
    const manifestText = readUtf8FileIfExistsSync(CANONICAL_HOOKS_PATH);
    expect(manifestText).not.toBeNull();

    const manifest = JSON.parse(manifestText ?? '{}') as CanonicalHooksManifest;
    expect(Object.keys(manifest.hooks).sort()).toEqual(
      [...EXPECTED_HOOK_EVENTS].sort(),
    );
    expect(manifestText).not.toContain(RETIRED_AGENT_BUNDLE);
  });

  it('keeps only active hook bundles and shared runners', () => {
    const artifacts = listDirectoryIfExistsSync(BRIDGE_DIR);
    for (const artifact of EXPECTED_HOOK_ARTIFACTS)
      expect(artifacts).toContain(artifact);
    expect(artifacts).not.toContain(RETIRED_AGENT_BUNDLE);
  });
});

describe('hook bundle smoke tests', () => {
  let cwd: string;

  beforeAll(() => {
    cwd = mkdtempSync(portableResolve(tmpdir(), 'filid-hook-smoke-'));
  });

  afterAll(() => {
    if (cwd) rmSync(cwd, { recursive: true, force: true });
  });

  for (const { name, buildInput } of HOOK_CASES)
    it(`${name}.mjs spawns, exits 0, returns valid JSON, stderr clean`, () => {
      const bundle = portableResolve(BRIDGE_DIR, `${name}.mjs`);
      expect(existsSync(bundle)).toBe(true);

      const result = spawnSync(process.execPath, [bundle], {
        input: JSON.stringify(buildInput(cwd)),
        encoding: 'utf8',
        timeout: 10_000,
      });

      expect(result.status).toBe(0);
      expect(() => JSON.parse(result.stdout)).not.toThrow();
      expect(result.stderr).not.toMatch(
        /Dynamic require|Cannot find module|^Error:/m,
      );
    });
});

describe('pre-tool-use bundle delivery pointer', () => {
  let cwd: string;

  beforeAll(() => {
    cwd = mkdtempSync(portableResolve(tmpdir(), 'filid-hook-pointer-'));
    writeFileSync(
      portableResolve(cwd, 'package.json'),
      JSON.stringify({ name: 'pointer-fixture' }),
    );
    writeFileSync(
      portableResolve(cwd, 'INTENT.md'),
      '## Purpose\nFixture\n## Boundaries\n### Always do\n- Verify\n### Ask first\n- Widen\n### Never do\n- Bypass\n',
    );
    writeFileSync(portableResolve(cwd, 'index.ts'), '');
  });

  afterAll(() => {
    if (cwd) rmSync(cwd, { recursive: true, force: true });
  });

  it('delivers the INTENT.md pointer and read directive, never the document body', () => {
    const first = runPreToolUseBundle(cwd, `pointer-${Date.now()}`, 'Read', {
      file_path: portableResolve(cwd, 'index.ts'),
    });
    const context = first.hookSpecificOutput?.additionalContext ?? '';
    expect(context).toContain('[filid:ctx]');
    expect(context).toContain('intent: INTENT.md');
    expect(context).toContain('action: READ the intent file above');
    expect(context).not.toContain('## Purpose');
    expect(context).not.toContain('\n---\n');
  });
});
