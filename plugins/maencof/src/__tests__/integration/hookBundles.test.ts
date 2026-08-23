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
  let vaultDir: string;

  beforeAll(() => {
    cwd = mkdtempSync(join(tmpdir(), 'maencof-hook-smoke-'));
    vaultDir = join(cwd, 'vault');
    mkdirSync(join(vaultDir, '.maencof'), { recursive: true });
    mkdirSync(join(vaultDir, '01_Core'), { recursive: true });
    mkdirSync(join(vaultDir, 'L3'), { recursive: true });
    writeFileSync(join(vaultDir, '01_Core', 'identity.md'), 'identity');
    writeFileSync(join(vaultDir, 'L3', 'target.md'), 'safe');
    symlinkSync(join(vaultDir, '01_Core'), join(vaultDir, 'core-link'), 'dir');
    symlinkSync(
      join(vaultDir, 'L3', 'target.md'),
      join(vaultDir, '01_Core', 'outside-link.md'),
      'file',
    );
  });

  afterAll(() => {
    if (cwd) rmSync(cwd, { recursive: true, force: true });
  });

  for (const { name, buildInput } of HOOK_CASES) {
    const bundle = resolve(bridgeDir, `${name}.mjs`);

    it(`${name}.mjs spawns, exits 0, returns valid JSON, stderr clean`, () => {
      expect(existsSync(bundle)).toBe(true);
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
    });
  }

  it('pre-tool-use.mjs denies when a later patch operation targets Layer 1', () => {
    const bundle = resolve(bridgeDir, 'pre-tool-use.mjs');
    expect(existsSync(bundle)).toBe(true);

    const result = spawnSync(process.execPath, [bundle], {
      input: JSON.stringify({
        cwd: vaultDir,
        session_id: 'batch-guard',
        hook_event_name: 'PreToolUse',
        tool_name: 'apply_patch',
        tool_input: {
          command:
            '*** Begin Patch\n*** Update File: L3/note.md\n@@\n-old\n+new\n*** Update File: 01_Core/identity.md\n@@\n-old\n+new\n*** End Patch',
        },
      }),
      encoding: 'utf8',
      timeout: 10_000,
      windowsHide: true,
    });

    expect(result.status).toBe(0);
    const output = JSON.parse(result.stdout) as {
      hookSpecificOutput?: {
        permissionDecision?: string;
        permissionDecisionReason?: string;
      };
    };
    expect(output.hookSpecificOutput?.permissionDecision).toBe('deny');
    expect(output.hookSpecificOutput?.permissionDecisionReason).toContain(
      '01_Core/identity.md',
    );
  });

  it('pre-tool-use.mjs preserves later Layer 1 reasons after an initial deny', () => {
    const bundle = resolve(bridgeDir, 'pre-tool-use.mjs');
    const result = spawnSync(process.execPath, [bundle], {
      input: JSON.stringify({
        cwd: vaultDir,
        session_id: 'deny-then-deny',
        hook_event_name: 'PreToolUse',
        tool_name: 'apply_patch',
        tool_input: {
          command:
            '*** Begin Patch\n*** Delete File: 01_Core/identity.md\n*** Delete File: 01_Core/values.md\n*** End Patch',
        },
      }),
      encoding: 'utf8',
      timeout: 10_000,
      windowsHide: true,
    });

    expect(result.status).toBe(0);
    const output = JSON.parse(result.stdout) as {
      hookSpecificOutput?: { permissionDecisionReason?: string };
    };
    expect(output.hookSpecificOutput?.permissionDecisionReason).toContain(
      '01_Core/identity.md',
    );
    expect(output.hookSpecificOutput?.permissionDecisionReason).toContain(
      '01_Core/values.md',
    );
  });

  it('pre-tool-use.mjs accepts a valid Environment ID preamble outside Layer 1', () => {
    const bundle = resolve(bridgeDir, 'pre-tool-use.mjs');
    const result = spawnSync(process.execPath, [bundle], {
      input: JSON.stringify({
        cwd: vaultDir,
        session_id: 'environment-id',
        hook_event_name: 'PreToolUse',
        tool_name: 'apply_patch',
        tool_input: {
          command:
            '*** Begin Patch\n*** Environment ID: env-123\n*** Add File: L3/safe.md\n+safe\n*** End Patch',
        },
      }),
      encoding: 'utf8',
      timeout: 10_000,
      windowsHide: true,
    });

    expect(result.status).toBe(0);
    const output = JSON.parse(result.stdout) as {
      hookSpecificOutput?: { permissionDecision?: string };
    };
    expect(output.hookSpecificOutput?.permissionDecision).toBeUndefined();
  });

  it('pre-tool-use.mjs enforces host-valid empty operations and EOF state', () => {
    const bundle = resolve(bridgeDir, 'pre-tool-use.mjs');
    const cases = [
      {
        name: 'bodyless-add',
        command: '*** Begin Patch\n*** Add File: L3/empty.md\n*** End Patch',
        decision: undefined,
      },
      {
        name: 'context-only-update',
        command:
          '*** Begin Patch\n*** Update File: L3/target.md\n@@\n unchanged\n*** End Patch',
        decision: undefined,
      },
      {
        name: 'body-after-eof',
        command:
          '*** Begin Patch\n*** Update File: L3/target.md\n@@\n-old\n+new\n*** End of File\n-more\n+later\n*** End Patch',
        decision: 'deny',
      },
    ] as const;

    for (const testCase of cases) {
      const result = spawnSync(process.execPath, [bundle], {
        input: JSON.stringify({
          cwd: vaultDir,
          session_id: `grammar-${testCase.name}`,
          hook_event_name: 'PreToolUse',
          tool_name: 'apply_patch',
          tool_input: { command: testCase.command },
        }),
        encoding: 'utf8',
        timeout: 10_000,
        windowsHide: true,
      });

      expect.soft(result.status, testCase.name).toBe(0);
      const output = JSON.parse(result.stdout) as {
        hookSpecificOutput?: {
          permissionDecision?: string;
          permissionDecisionReason?: string;
        };
      };
      expect
        .soft(output.hookSpecificOutput?.permissionDecision, testCase.name)
        .toBe(testCase.decision);
      if (testCase.decision === 'deny')
        expect(output.hookSpecificOutput?.permissionDecisionReason).toContain(
          'End of File',
        );
    }
  });

  it.each([
    ['case alias', '01_core/identity.md'],
    ['symlink alias', 'core-link/identity.md'],
    ['terminal symlink entry', '01_Core/outside-link.md'],
  ])('pre-tool-use.mjs follows host target for Layer 1 %s', (_name, target) => {
    const bundle = resolve(bridgeDir, 'pre-tool-use.mjs');
    const absoluteTarget = join(vaultDir, target);
    const result = spawnSync(process.execPath, [bundle], {
      input: JSON.stringify({
        cwd: vaultDir,
        session_id: `delete-${target}`,
        hook_event_name: 'PreToolUse',
        tool_name: 'apply_patch',
        tool_input: {
          command: `*** Begin Patch\n*** Delete File: ${absoluteTarget}\n*** End Patch`,
        },
      }),
      encoding: 'utf8',
      timeout: 10_000,
      windowsHide: true,
    });

    expect(result.status).toBe(0);
    const output = JSON.parse(result.stdout) as {
      hookSpecificOutput?: { permissionDecision?: string };
    };
    expect(output.hookSpecificOutput?.permissionDecision).toBe(
      existsSync(absoluteTarget) ? 'deny' : undefined,
    );
  });

  it.each([
    ['pre-tool-use', 'PreToolUse', 'Edit', { success: true }, true],
    ['pre-tool-use', 'PreToolUse', 'apply_patch', { success: true }, true],
    ['post-tool-use', 'PostToolUse', 'Edit', { success: true }, true],
    ['post-tool-use', 'PostToolUse', 'apply_patch', { success: true }, true],
    ['post-tool-use', 'PostToolUse', 'apply_patch', 'failed', true],
    ['post-tool-use', 'PostToolUse', 'Bash', { success: true }, false],
  ] as const)(
    '%s.mjs applies the shared Edit matcher to %s %s (response %#)',
    (bundleName, event, toolName, toolResponse, shouldMatch) => {
      const marker = 'HOST_NEUTRAL_LIFECYCLE_MATCHER';
      mkdirSync(join(vaultDir, '.maencof-meta'), { recursive: true });
      writeFileSync(
        join(vaultDir, '.maencof-meta', 'lifecycle.json'),
        JSON.stringify({
          version: 1,
          actions: [
            {
              id: `matcher-${event}`,
              event,
              matcher: 'Edit',
              enabled: true,
              type: 'echo',
              config: { message: marker },
              created_by: 'test',
              created_at: '2026-08-23T00:00:00.000Z',
            },
          ],
        }),
      );

      const result = spawnSync(
        process.execPath,
        [resolve(bridgeDir, `${bundleName}.mjs`)],
        {
          input: JSON.stringify({
            cwd: vaultDir,
            session_id: `matcher-${event}-${toolName}`,
            hook_event_name: event,
            tool_name: toolName,
            tool_input:
              toolName === 'apply_patch'
                ? {
                    command:
                      '*** Begin Patch\n*** Update File: L3/target.md\n@@\n-safe\n+safe\n*** End Patch',
                  }
                : { file_path: join(vaultDir, 'L3', 'target.md') },
            tool_response: toolResponse,
          }),
          encoding: 'utf8',
          timeout: 10_000,
          windowsHide: true,
        },
      );

      expect(result.status).toBe(0);
      const output = JSON.parse(result.stdout) as {
        hookSpecificOutput?: { additionalContext?: string };
      };
      const context = output.hookSpecificOutput?.additionalContext ?? '';
      if (shouldMatch) expect(context).toContain(marker);
      else expect(context).not.toContain(marker);
    },
  );
});
