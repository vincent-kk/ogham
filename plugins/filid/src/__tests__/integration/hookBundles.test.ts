import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
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

describe('pre-tool-use bundle apply_patch policy', () => {
  let cwd: string;

  beforeAll(() => {
    cwd = mkdtempSync(portableResolve(tmpdir(), 'filid-hook-batch-'));
    mkdirSync(portableResolve(cwd, 'src', 'deep'), { recursive: true });
    mkdirSync(portableResolve(cwd, 'src', 'feature'), { recursive: true });
    mkdirSync(portableResolve(cwd, 'contract-link'), { recursive: true });
    writeFileSync(
      portableResolve(cwd, 'INTENT.md'),
      '## Purpose\nFixture\n## Boundaries\n### Always do\n- Verify\n### Ask first\n- Widen\n### Never do\n- Bypass\n',
    );
    writeFileSync(
      portableResolve(cwd, 'DETAIL.md'),
      '## Requirements\n\n- Fixture\n\n## API Contracts\n\n- Stable\n\n## Acceptance Criteria\n\n### AC-fixture\n\n- Verifiable\n\n## Last Updated\n\n2026-08-23\n',
    );
    writeFileSync(portableResolve(cwd, 'index.ts'), '');
    writeFileSync(portableResolve(cwd, 'safe.md'), 'safe');
    symlinkSync(
      portableResolve(cwd, 'safe.md'),
      portableResolve(cwd, 'contract-link', 'INTENT.md'),
      'file',
    );
  });

  afterAll(() => {
    if (cwd) rmSync(cwd, { recursive: true, force: true });
  });

  it('checks validator and structure findings that occur only in a later operation', () => {
    const sessionId = `dr02-${Date.now()}`;

    runPreToolUseBundle(cwd, sessionId, 'Read', {
      file_path: portableResolve(cwd, 'index.ts'),
    });
    const safePath = portableResolve(cwd, 'src', 'safe.ts');
    const safeSection = `*** Add File: ${safePath}\n+export const safe = true;`;
    const control = runPreToolUseBundle(cwd, sessionId, 'apply_patch', {
      command: `*** Begin Patch\n*** Environment ID: env-123\n${safeSection}\n*** End Patch`,
    });
    expect(control.hookSpecificOutput?.permissionDecision).toBeUndefined();

    const hiddenIntent = portableResolve(cwd, 'src', 'feature', 'INTENT.md');
    const oversized = Array.from(
      { length: 51 },
      (_, index) => `+line ${index + 1}`,
    ).join('\n');
    const denied = runPreToolUseBundle(cwd, sessionId, 'apply_patch', {
      command: `*** Begin Patch\n${safeSection}\n*** Add File: ${hiddenIntent}\n${oversized}\n*** End Patch`,
    });
    expect(denied.hookSpecificOutput?.permissionDecision).toBe('deny');
    expect(denied.hookSpecificOutput?.permissionDecisionReason).toContain(
      hiddenIntent,
    );
    expect(denied.hookSpecificOutput?.permissionDecisionReason).toContain(
      '51 lines',
    );

    const hiddenSource = portableResolve(cwd, 'src', 'deep', 'child.ts');
    const warned = runPreToolUseBundle(cwd, sessionId, 'apply_patch', {
      command:
        `*** Begin Patch\n${safeSection}\n*** Add File: ${hiddenSource}\n` +
        '+import { foo } from "../../";\n+export const child = foo;\n*** End Patch',
    });
    const context = warned.hookSpecificOutput?.additionalContext ?? '';
    expect(context).toContain(hiddenSource);
    expect(context).toContain('structure-guard');
    expect(context).toContain('import');
  });

  it('enforces host-valid empty operations and EOF state in the delivered bundle', () => {
    const sessionId = `dr02-grammar-${Date.now()}`;
    runPreToolUseBundle(cwd, sessionId, 'Read', {
      file_path: portableResolve(cwd, 'index.ts'),
    });

    const bodylessAdd = runPreToolUseBundle(cwd, sessionId, 'apply_patch', {
      command: `*** Begin Patch\n*** Add File: ${portableResolve(cwd, 'src', 'empty.ts')}\n*** End Patch`,
    });
    expect(bodylessAdd.hookSpecificOutput?.permissionDecision).toBeUndefined();

    const contextOnlyUpdate = runPreToolUseBundle(
      cwd,
      sessionId,
      'apply_patch',
      {
        command: `*** Begin Patch\n*** Update File: ${portableResolve(cwd, 'index.ts')}\n@@\n unchanged\n*** End Patch`,
      },
    );
    expect(
      contextOnlyUpdate.hookSpecificOutput?.permissionDecision,
    ).toBeUndefined();

    const malformedEof = runPreToolUseBundle(cwd, sessionId, 'apply_patch', {
      command: `*** Begin Patch\n*** Update File: ${portableResolve(cwd, 'index.ts')}\n@@\n-old\n+new\n*** End of File\n-more\n+later\n*** End Patch`,
    });
    expect(malformedEof.hookSpecificOutput?.permissionDecision).toBe('deny');
    expect(malformedEof.hookSpecificOutput?.permissionDecisionReason).toContain(
      'End of File',
    );
  });

  it('allows bodyless and exact modified Moves while denying a protected Move', () => {
    const sessionId = `move-${Date.now()}`;
    runPreToolUseBundle(cwd, sessionId, 'Read', {
      file_path: portableResolve(cwd, 'index.ts'),
    });

    const ordinarySource = portableResolve(cwd, 'src', 'plain.ts');
    const ordinaryTarget = portableResolve(cwd, 'src', 'renamed.ts');
    writeFileSync(ordinarySource, 'old\n');
    const allowed = runPreToolUseBundle(cwd, sessionId, 'apply_patch', {
      command: `*** Begin Patch\n*** Update File: ${ordinarySource}\n*** Move to: ${ordinaryTarget}\n*** End Patch`,
    });
    expect(allowed.hookSpecificOutput?.permissionDecision).toBeUndefined();

    const modifiedTarget = portableResolve(cwd, 'src', 'modified.ts');
    const modified = runPreToolUseBundle(cwd, sessionId, 'apply_patch', {
      command: `*** Begin Patch\n*** Update File: ${ordinarySource}\n*** Move to: ${modifiedTarget}\n@@\n-old\n+new\n*** End Patch`,
    });
    expect(modified.hookSpecificOutput?.permissionDecision).toBeUndefined();

    const protectedSource = portableResolve(cwd, 'INTENT.md');
    const protectedTarget = portableResolve(cwd, 'RENAMED.md');
    const denied = runPreToolUseBundle(cwd, sessionId, 'apply_patch', {
      command: `*** Begin Patch\n*** Update File: ${protectedSource}\n*** Move to: ${protectedTarget}\n*** End Patch`,
    });
    expect(denied.hookSpecificOutput?.permissionDecision).toBe('deny');
    expect(denied.hookSpecificOutput?.permissionDecisionReason).toContain(
      protectedSource,
    );
  });

  it('denies a missing Move source with an explicit built-bundle reason', () => {
    const sessionId = `move-missing-${Date.now()}`;
    runPreToolUseBundle(cwd, sessionId, 'Read', {
      file_path: portableResolve(cwd, 'index.ts'),
    });
    const missingSource = portableResolve(cwd, 'src', 'missing.ts');
    const result = runPreToolUseBundle(cwd, sessionId, 'apply_patch', {
      command: `*** Begin Patch\n*** Update File: ${missingSource}\n*** Move to: ${portableResolve(cwd, 'src', 'missing-moved.ts')}\n*** End Patch`,
    });

    expect(result.hookSpecificOutput?.permissionDecision).toBe('deny');
    expect(result.hookSpecificOutput?.permissionDecisionReason).toContain(
      missingSource,
    );
    expect(result.hookSpecificOutput?.permissionDecisionReason).toContain(
      'does not exist',
    );
  });

  it.each([
    ['intent.md', 'INTENT.md'],
    ['detail.md', 'DETAIL.md'],
    ['contract-link/INTENT.md', 'safe.md'],
  ])(
    'matches host resolution when Delete targets case alias %s',
    (aliasName, canonicalName) => {
      const sessionId = `dr02-delete-${canonicalName}-${Date.now()}`;
      runPreToolUseBundle(cwd, sessionId, 'Read', {
        file_path: portableResolve(cwd, 'index.ts'),
      });
      const aliasPath = portableResolve(cwd, aliasName);
      const hostResolvesAlias = existsSync(aliasPath);
      const result = runPreToolUseBundle(cwd, sessionId, 'apply_patch', {
        command: `*** Begin Patch\n*** Delete File: ${aliasPath}\n*** End Patch`,
      });

      expect(result.hookSpecificOutput?.permissionDecision).toBe(
        hostResolvesAlias ? 'deny' : undefined,
      );
      if (hostResolvesAlias) {
        expect(result.hookSpecificOutput?.permissionDecisionReason).toContain(
          'Delete rejected',
        );
        expect(result.hookSpecificOutput?.permissionDecisionReason).toContain(
          aliasPath,
        );
      }
      expect(existsSync(portableResolve(cwd, canonicalName))).toBe(true);
    },
  );
});
