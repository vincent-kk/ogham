/**
 * @file sessionRecapStop.test.ts
 * @description Stop 훅 session recap 관심사 테스트 — 세션당 1회 additionalContext 주입,
 * off-switch·무캡처·non-vault 침묵.
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { runSessionRecap } from '../../hooks/stop/helpers/sessionRecap/sessionRecap.js';

function createTempVault(): string {
  const dir = mkdtempSync(join(tmpdir(), 'maencof-recap-test-'));
  mkdirSync(join(dir, '.maencof'), { recursive: true });
  mkdirSync(join(dir, '.maencof-meta'), { recursive: true });
  return dir;
}

function writePendingCaptures(vault: string): void {
  writeFileSync(
    join(vault, '.maencof-meta', 'pending-insight-notification.json'),
    JSON.stringify({
      captures: [
        { path: '05_Context/buffer/premise.md', title: 'Premise A', layer: 5 },
        { path: '02_Derived/principle.md', title: 'Principle B', layer: 2 },
      ],
      sessionId: 'recap-session',
      createdAt: '2026-07-07T00:00:00.000Z',
    }),
    'utf-8',
  );
}

describe('runSessionRecap', () => {
  let vaultDir: string;
  let configDir: string;

  beforeEach(() => {
    vaultDir = createTempVault();
    configDir = mkdtempSync(join(tmpdir(), 'maencof-recap-config-'));
    process.env.CLAUDE_CONFIG_DIR = configDir;
  });

  afterEach(() => {
    delete process.env.CLAUDE_CONFIG_DIR;
    rmSync(vaultDir, { recursive: true, force: true, maxRetries: 3 });
    rmSync(configDir, { recursive: true, force: true, maxRetries: 3 });
  });

  it('캡처가 있으면 recap을 additionalContext로 반환하고 같은 세션 재호출은 침묵한다', () => {
    writePendingCaptures(vaultDir);

    const first = runSessionRecap({ session_id: 's1', cwd: vaultDir });
    const ctx = first.hookSpecificOutput?.additionalContext ?? '';
    expect(ctx).toContain('[maencof] Session Recap');
    expect(ctx).toContain('Premise A');
    expect(ctx).toContain('Principle B');

    const second = runSessionRecap({ session_id: 's1', cwd: vaultDir });
    expect(second.hookSpecificOutput).toBeUndefined();
  });

  it('다른 세션은 마커를 공유하지 않는다', () => {
    writePendingCaptures(vaultDir);

    runSessionRecap({ session_id: 's1', cwd: vaultDir });
    const other = runSessionRecap({ session_id: 's2', cwd: vaultDir });

    expect(other.hookSpecificOutput?.additionalContext).toContain(
      'Session Recap',
    );
  });

  it('pending 캡처가 없으면 침묵한다', () => {
    const result = runSessionRecap({ session_id: 's1', cwd: vaultDir });
    expect(result).toEqual({ continue: true });
  });

  it('session_recap off-switch를 존중한다', () => {
    writePendingCaptures(vaultDir);
    writeFileSync(
      join(vaultDir, '.maencof-meta', 'dialogue-config.json'),
      JSON.stringify({ session_recap: { enabled: false } }),
      'utf-8',
    );

    const result = runSessionRecap({ session_id: 's1', cwd: vaultDir });
    expect(result.hookSpecificOutput).toBeUndefined();
  });

  it('vault가 아니거나 session_id가 없으면 침묵한다', () => {
    const nonVault = mkdtempSync(join(tmpdir(), 'non-vault-'));
    try {
      expect(
        runSessionRecap({ session_id: 's1', cwd: nonVault }).hookSpecificOutput,
      ).toBeUndefined();

      writePendingCaptures(vaultDir);
      expect(
        runSessionRecap({ cwd: vaultDir }).hookSpecificOutput,
      ).toBeUndefined();
    } finally {
      rmSync(nonVault, { recursive: true, force: true });
    }
  });
});
