/**
 * @file sessionEndRecord.test.ts
 * @description maencof SessionEnd 훅 유닛 테스트 (runSessionEnd)
 */
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { runSessionEnd } from '../../hooks/sessionEnd/helpers/finalize/finalize.js';

/** 테스트용 임시 vault 디렉토리 생성 */
function createTempVault(): string {
  const dir = mkdtempSync(join(tmpdir(), 'maencof-test-'));
  mkdirSync(join(dir, '.maencof'), { recursive: true });
  mkdirSync(join(dir, '.maencof-meta'), { recursive: true });
  return dir;
}

describe('runSessionEnd', () => {
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

  /** 일자별 세션 JSON 디렉터리 — `.maencof-meta/activity/sessions/`. */
  function sessionsDirOf(vault: string): string {
    return join(vault, '.maencof-meta', 'activity', 'sessions');
  }

  /** 일자 파일을 읽어 session_id 키 맵을 반환한다 (단일 day 파일 가정). */
  function readSessions(
    vault: string,
  ): Record<string, Record<string, unknown>> {
    const dir = sessionsDirOf(vault);
    const files = readdirSync(dir).filter((f) => f.endsWith('.json'));
    const log = JSON.parse(readFileSync(join(dir, files[0]), 'utf-8')) as {
      sessions: Record<string, Record<string, unknown>>;
    };
    return log.sessions;
  }

  it('세션 종료를 activity/sessions/{date}.json 에 session_id로 기록한다', () => {
    const result = runSessionEnd({
      session_id: 'test-session',
      cwd: vaultDir,
      skills_used: ['/maencof:search'],
      files_modified: ['02_Derived/note.md'],
    });
    expect(result.continue).toBe(true);

    const sessions = readSessions(vaultDir);
    expect(sessions['test-session']).toBeDefined();
    expect(sessions['test-session'].endedAt).toBeTruthy();
    expect(sessions['test-session'].skillsUsed).toEqual(['/maencof:search']);
    expect(sessions['test-session'].filesModified).toEqual([
      '02_Derived/note.md',
    ]);
  });

  it('.maencof-meta/sessions/ 디렉터리에는 쓰지 않는다', () => {
    runSessionEnd({
      session_id: 'legacy-check',
      cwd: vaultDir,
      skills_used: ['/maencof:search'],
    });
    expect(existsSync(join(vaultDir, '.maencof-meta', 'sessions'))).toBe(false);
  });

  it('세션 종료가 활동 이벤트 로그를 만들지 않는다', () => {
    runSessionEnd({
      session_id: 'no-event',
      cwd: vaultDir,
      files_modified: ['02_Derived/note.md'],
    });
    // 세션 라이프사이클은 sessions JSON 에만 — 활동 이벤트 로그(events)는 생성되지 않는다.
    expect(
      existsSync(join(vaultDir, '.maencof-meta', 'activity', 'events')),
    ).toBe(false);
  });

  it('maencof vault가 아닌 경우 아무 작업도 하지 않는다', () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'non-vault-'));
    try {
      const result = runSessionEnd({ cwd: tmpDir });
      expect(result.continue).toBe(true);
      expect(
        existsSync(join(tmpDir, '.maencof-meta', 'activity', 'sessions')),
      ).toBe(false);
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
