/**
 * @file sessionStartChangelogDebt.test.ts
 * @description SessionStart changelog debt 권고 테스트 — 직전 세션 스캔이 남긴
 * pending 이 있으면 1줄 권고를 additionalContext 로 표면화하고, 없으면 침묵한다.
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { runSessionStart } from '../../hooks/sessionStart/helpers/bootstrap/bootstrap.js';

function createTempVault(): string {
  const dir = mkdtempSync(join(tmpdir(), 'maencof-changelogdebt-test-'));
  mkdirSync(join(dir, '.maencof'), { recursive: true });
  mkdirSync(join(dir, '.maencof-meta'), { recursive: true });
  return dir;
}

describe('session-start changelog debt 권고', () => {
  let vaultDir: string;

  beforeEach(() => {
    vaultDir = createTempVault();
  });

  afterEach(() => {
    rmSync(vaultDir, { recursive: true, force: true, maxRetries: 3 });
  });

  it('pending 이 있으면 건수와 /maencof:changelog 안내를 표면화한다', () => {
    writeFileSync(
      join(vaultDir, '.maencof-meta', 'changelog-state.json'),
      JSON.stringify({
        pending: {
          detectedAt: '2026-07-08T00:00:00.000Z',
          changes: ['M 01_Core/values.md', '?? 02_Derived/new.md'],
        },
        lastCuratedAt: null,
      }),
      'utf-8',
    );

    const result = runSessionStart({ cwd: vaultDir, session_id: 's1' });
    const context = result.hookSpecificOutput?.additionalContext ?? '';

    expect(context).toContain('2 watched-path change(s)');
    expect(context).toContain('/maencof:changelog');
  });

  it('상태 파일이 없으면 권고를 내지 않는다', () => {
    const result = runSessionStart({ cwd: vaultDir, session_id: 's1' });
    const context = result.hookSpecificOutput?.additionalContext ?? '';

    expect(context).not.toContain('/maencof:changelog');
  });

  it('pending 이 null 이면 권고를 내지 않는다', () => {
    writeFileSync(
      join(vaultDir, '.maencof-meta', 'changelog-state.json'),
      JSON.stringify({
        pending: null,
        lastCuratedAt: '2026-07-08T00:00:00.000Z',
      }),
      'utf-8',
    );

    const result = runSessionStart({ cwd: vaultDir, session_id: 's1' });
    const context = result.hookSpecificOutput?.additionalContext ?? '';

    expect(context).not.toContain('/maencof:changelog');
  });
});
