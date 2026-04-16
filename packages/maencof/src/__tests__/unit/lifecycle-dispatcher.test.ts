/**
 * @file lifecycle-dispatcher.test.ts
 * @description runLifecycleDispatcher hook envelope 테스트 — P1 hook schema fix.
 *
 * Contract (see `.omc/research/maencof-v030-hook-schema.md`):
 *   - SessionStart / UserPromptSubmit / PreToolUse / PostToolUse
 *     → `hookSpecificOutput.additionalContext` 로 payload 전달 (Claude 가시).
 *   - Stop / SessionEnd → `systemMessage` 로 payload 전달 (사용자 가시).
 *   - 어떤 이벤트도 top-level `message` / `hookMessage` 방출 금지.
 */
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { runLifecycleDispatcher } from '../../hooks/lifecycle-dispatcher/lifecycle-dispatcher.js';
import type { LifecycleEvent } from '../../types/lifecycle.js';

const MARKER = 'MAENCOF_V030_TEST_MARKER_42';

function createVaultWithEchoAction(event: LifecycleEvent): string {
  const dir = join(
    tmpdir(),
    `maencof-lifecycle-${event}-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 6)}`,
  );
  mkdirSync(join(dir, '.maencof'), { recursive: true });
  mkdirSync(join(dir, '.maencof-meta'), { recursive: true });
  writeFileSync(
    join(dir, '.maencof-meta', 'lifecycle.json'),
    JSON.stringify({
      version: 1,
      actions: [
        {
          id: 'test-echo',
          event,
          enabled: true,
          type: 'echo',
          config: { message: MARKER },
          created_by: 'user',
          created_at: new Date().toISOString(),
          description: 'schema-test',
        },
      ],
    }),
    'utf-8',
  );
  return dir;
}

describe('runLifecycleDispatcher — hook output envelope', () => {
  let vaultDir: string | null = null;

  afterEach(() => {
    if (vaultDir) {
      rmSync(vaultDir, { recursive: true, force: true, maxRetries: 3 });
      vaultDir = null;
    }
  });

  describe.each([
    'SessionStart',
    'UserPromptSubmit',
    'PreToolUse',
    'PostToolUse',
  ] as const)('context-capable event: %s', (event) => {
    beforeEach(() => {
      vaultDir = createVaultWithEchoAction(event);
    });

    it('hookSpecificOutput.additionalContext 에 payload 를 전달한다', () => {
      const result = runLifecycleDispatcher(event, { cwd: vaultDir! });

      expect(result.continue).toBe(true);
      expect(result.hookSpecificOutput).toBeDefined();
      expect(result.hookSpecificOutput?.hookEventName).toBe(event);
      expect(result.hookSpecificOutput?.additionalContext).toContain(MARKER);
    });

    it('top-level message / hookMessage 를 방출하지 않는다', () => {
      const result = runLifecycleDispatcher(event, {
        cwd: vaultDir!,
      }) as unknown as Record<string, unknown>;
      expect('message' in result).toBe(false);
      expect('hookMessage' in result).toBe(false);
    });
  });

  describe.each(['Stop', 'SessionEnd'] as const)(
    'terminal event: %s',
    (event) => {
      beforeEach(() => {
        vaultDir = createVaultWithEchoAction(event);
      });

      it('systemMessage 에 payload 를 전달한다 (additionalContext 미지원)', () => {
        const result = runLifecycleDispatcher(event, { cwd: vaultDir! });

        expect(result.continue).toBe(true);
        expect(result.systemMessage).toBeDefined();
        expect(result.systemMessage).toContain(MARKER);
        expect(result.hookSpecificOutput).toBeUndefined();
      });

      it('top-level message / hookMessage 를 방출하지 않는다', () => {
        const result = runLifecycleDispatcher(event, {
          cwd: vaultDir!,
        }) as unknown as Record<string, unknown>;
        expect('message' in result).toBe(false);
        expect('hookMessage' in result).toBe(false);
      });
    },
  );

  it('vault 가 아니면 { continue: true } 만 반환한다', () => {
    const nonVault = join(tmpdir(), `non-vault-${Date.now()}`);
    mkdirSync(nonVault, { recursive: true });
    try {
      const result = runLifecycleDispatcher('SessionStart', { cwd: nonVault });
      expect(result).toEqual({ continue: true });
    } finally {
      rmSync(nonVault, { recursive: true, force: true });
    }
  });

  it('매칭 액션이 없으면 payload 없이 { continue: true } 반환', () => {
    vaultDir = createVaultWithEchoAction('SessionStart');
    const result = runLifecycleDispatcher('PreToolUse', { cwd: vaultDir });
    expect(result).toEqual({ continue: true });
  });
});
