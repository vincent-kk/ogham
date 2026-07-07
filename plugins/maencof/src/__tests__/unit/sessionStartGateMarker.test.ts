/**
 * @file sessionStartGateMarker.test.ts
 * @description changelog-gate 마커의 세션 수명 테스트 — 마커는 세션 시작 시 제거되어
 * 이전 세션의 통과가 다음 세션의 Stop 게이트를 무장해제하지 못한다.
 */
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { runSessionStart } from '../../hooks/sessionStart/helpers/bootstrap/bootstrap.js';

const MARKER_RELATIVE = join('.omc', '.changelog-gate-passed');

function createTempVault(): string {
  const dir = mkdtempSync(join(tmpdir(), 'maencof-gatemarker-test-'));
  mkdirSync(join(dir, '.maencof'), { recursive: true });
  mkdirSync(join(dir, '.maencof-meta'), { recursive: true });
  return dir;
}

describe('session-start changelog-gate 마커 정리', () => {
  let vaultDir: string;

  beforeEach(() => {
    vaultDir = createTempVault();
  });

  afterEach(() => {
    rmSync(vaultDir, {
      recursive: true,
      force: true,
      maxRetries: 3,
      retryDelay: 100,
    });
  });

  it('이전 세션이 남긴 마커를 세션 시작 시 제거한다', () => {
    const markerPath = join(vaultDir, MARKER_RELATIVE);
    mkdirSync(join(vaultDir, '.omc'), { recursive: true });
    writeFileSync(markerPath, '', 'utf-8');

    runSessionStart({ cwd: vaultDir, session_id: 'next-session' });

    expect(existsSync(markerPath)).toBe(false);
  });

  it('vault가 아니면 마커를 건드리지 않는다', () => {
    const nonVault = mkdtempSync(join(tmpdir(), 'maencof-nonvault-'));
    const markerPath = join(nonVault, MARKER_RELATIVE);
    try {
      mkdirSync(join(nonVault, '.omc'), { recursive: true });
      writeFileSync(markerPath, '', 'utf-8');

      runSessionStart({ cwd: nonVault, session_id: 'next-session' });

      expect(existsSync(markerPath)).toBe(true);
    } finally {
      rmSync(nonVault, { recursive: true, force: true, maxRetries: 3 });
    }
  });
});
