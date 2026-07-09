/**
 * @file changelogState.test.ts
 * @description changelogState 읽기/쓰기/정규화 테스트 — 실제 임시 디렉터리 사용.
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  changelogStatePath,
  readChangelogState,
  writeChangelogState,
} from '../../core/changelogState/index.js';

describe('changelogState', () => {
  let vaultDir: string;

  beforeEach(() => {
    vaultDir = mkdtempSync(join(tmpdir(), 'maencof-changelog-state-'));
    mkdirSync(join(vaultDir, '.maencof-meta'), { recursive: true });
  });

  afterEach(() => {
    rmSync(vaultDir, { recursive: true, force: true, maxRetries: 3 });
  });

  it('파일이 없으면 빈 상태를 반환한다', () => {
    expect(readChangelogState(vaultDir)).toEqual({
      pending: null,
      lastCuratedAt: null,
    });
  });

  it('write → read 라운드트립이 상태를 보존한다', () => {
    const state = {
      pending: {
        detectedAt: '2026-07-08T00:00:00.000Z',
        sessionId: 'sess-1',
        changes: ['M 01_Core/values.md', '?? 02_Derived/new.md'],
      },
      lastCuratedAt: '2026-07-01T00:00:00.000Z',
    };
    writeChangelogState(vaultDir, state);
    expect(readChangelogState(vaultDir)).toEqual(state);
  });

  it('손상된 JSON 은 빈 상태로 폴백한다', () => {
    writeFileSync(changelogStatePath(vaultDir), '{ not json', 'utf-8');
    expect(readChangelogState(vaultDir)).toEqual({
      pending: null,
      lastCuratedAt: null,
    });
  });

  it('detectedAt 이 없는 pending 은 null 로 정규화하되 lastCuratedAt 은 유지한다', () => {
    writeFileSync(
      changelogStatePath(vaultDir),
      JSON.stringify({
        pending: { changes: ['M a.md'] },
        lastCuratedAt: '2026-07-01T00:00:00.000Z',
      }),
      'utf-8',
    );
    expect(readChangelogState(vaultDir)).toEqual({
      pending: null,
      lastCuratedAt: '2026-07-01T00:00:00.000Z',
    });
  });

  it('changes 의 비문자열 항목은 걸러낸다', () => {
    writeFileSync(
      changelogStatePath(vaultDir),
      JSON.stringify({
        pending: {
          detectedAt: '2026-07-08T00:00:00.000Z',
          changes: ['M a.md', 42, null, 'M b.md'],
        },
        lastCuratedAt: null,
      }),
      'utf-8',
    );
    expect(readChangelogState(vaultDir).pending?.changes).toEqual([
      'M a.md',
      'M b.md',
    ]);
  });

  it('sessionId 가 없으면 정규화 결과에도 포함하지 않는다', () => {
    writeChangelogState(vaultDir, {
      pending: { detectedAt: '2026-07-08T00:00:00.000Z', changes: ['M a.md'] },
      lastCuratedAt: null,
    });
    const pending = readChangelogState(vaultDir).pending;
    expect(pending).not.toBeNull();
    expect(pending && 'sessionId' in pending).toBe(false);
  });
});
