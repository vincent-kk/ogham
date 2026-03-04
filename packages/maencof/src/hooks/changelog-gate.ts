/**
 * @file changelog-gate.ts
 * @description Stop Hook — 감시 경로에 git 변경이 있으면 세션 종료를 차단하고 changelog 기록을 유도
 *
 * 동작 흐름:
 * 1. 마커 파일(.omc/.changelog-gate-passed) 존재 → 통과
 * 2. maencof vault 확인 → 아니면 통과
 * 3. git 감시 경로에 변경 확인 → 없으면 통과
 * 4. 변경 있으면 차단 (exit 2) + changelog 기록 유도 메시지 출력
 *
 * graceful degradation: 모든 에러 catch → { continue: true }
 */
import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  CHANGELOG_EXCLUDE,
  CHANGELOG_GATE_MARKER,
  WATCHED_PATHS,
} from '../types/changelog.js';

import { isMaencofVault, metaPath } from './shared.js';

export interface ChangelogGateInput {
  session_id?: string;
  cwd?: string;
}

export interface ChangelogGateResult {
  continue: boolean;
  /** 차단 시 사용자에게 표시할 메시지 */
  reason?: string;
}

const EXEC_TIMEOUT_MS = 2000;

/**
 * 감시 경로에 대한 git 변경사항을 감지한다.
 * changelog 디렉토리 자체의 변경은 제외한다.
 */
export function detectWatchedChanges(cwd: string): string[] {
  try {
    const pathArgs = WATCHED_PATHS.map((p) => `-- ${p}`).join(' ');
    const output = execSync(`git status --porcelain ${pathArgs}`, {
      cwd,
      timeout: EXEC_TIMEOUT_MS,
      stdio: 'pipe',
    })
      .toString()
      .trim();

    if (!output) return [];

    return output
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .filter((line) => {
        // changelog 디렉토리 자체의 변경은 제외
        const filePath = line.slice(3); // "M  path" or "?? path"
        return !filePath.startsWith(CHANGELOG_EXCLUDE);
      });
  } catch {
    return [];
  }
}

/**
 * 마커 파일 존재 여부를 확인한다.
 */
export function hasGateMarker(cwd: string): boolean {
  return existsSync(join(cwd, '.omc', CHANGELOG_GATE_MARKER));
}

/**
 * Changelog Gate Hook handler.
 * Stop 이벤트에서 감시 경로의 변경을 감지하고 changelog 기록을 유도한다.
 */
export function runChangelogGate(
  input: ChangelogGateInput,
): ChangelogGateResult {
  try {
    const cwd = input.cwd ?? process.cwd();

    // 1. 마커 파일 존재 → 이미 처리됨
    if (hasGateMarker(cwd)) {
      return { continue: true };
    }

    // 2. maencof vault 확인
    if (!isMaencofVault(cwd)) {
      return { continue: true };
    }

    // 2.5. migration 진행 중이면 통과
    const lockPath = metaPath(cwd, 'migration.lock');
    if (existsSync(lockPath)) {
      try {
        const lock = JSON.parse(readFileSync(lockPath, 'utf-8'));
        const startedAt = new Date(lock.startedAt).getTime();
        const ttlMs = (lock.ttlMinutes ?? 30) * 60 * 1000;
        const sessionMatch = !lock.sessionId || lock.sessionId === input.session_id;
        if (Date.now() - startedAt < ttlMs && sessionMatch) {
          return { continue: true };
        }
        // TTL 초과 또는 세션 불일치 → 무시하고 계속
      } catch {
        // parse 실패 → graceful degradation
      }
    }

    // 3. 감시 경로에 git 변경 확인
    const changes = detectWatchedChanges(cwd);
    if (changes.length === 0) {
      return { continue: true };
    }

    // 4. 변경 감지 → 차단 + 메시지
    const changeList = changes.map((c) => `  ${c}`).join('\n');
    const reason = [
      '[changelog-gate] 감시 경로에 기록되지 않은 변경이 감지되었습니다.',
      '',
      changeList,
      '',
      '세션을 종료하기 전에 changelog를 기록해주세요:',
      '1. /maencof:changelog 스킬을 실행하여 변경사항을 기록하세요',
      '2. 변경사항을 commit하세요',
      '3. 마커 파일이 자동 생성되면 세션을 종료할 수 있습니다',
    ].join('\n');

    return { continue: false, reason };
  } catch {
    // Graceful degradation — 에러 시 세션 종료 차단하지 않음
    return { continue: true };
  }
}
