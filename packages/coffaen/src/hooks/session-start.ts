/**
 * @file session-start.ts
 * @description SessionStart Hook — 지식 트리 점검, WAL 복구 감지, 스케줄 확인, 이전 세션 요약 로드
 * C1 제약: 5초 이내 완료 필수. 무거운 인덱스 빌드는 Skill에 위임.
 */

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { isCoffaenVault, metaPath } from './shared.js';

export interface SessionStartInput {
  session_id?: string;
  cwd?: string;
}

export interface SessionStartResult {
  continue: boolean;
  suppressOutput?: boolean;
  /** 사용자에게 출력할 메시지 */
  message?: string;
}

/**
 * SessionStart Hook 핸들러.
 * 1. .coffaen/ 디렉토리 존재 확인 → 미존재 시 setup 안내
 * 2. WAL 잔존 감지 → 복구 제안
 * 3. schedule-log.json 확인 → organize 스킬 호출 제안
 * 4. 최근 세션 요약 로드 → 이전 컨텍스트 출력
 * 5. data-sources.json 미설정 시 connect 안내
 */
export function runSessionStart(input: SessionStartInput): SessionStartResult {
  const cwd = input.cwd ?? process.cwd();
  const messages: string[] = [];

  // 1. coffaen vault 확인
  if (!isCoffaenVault(cwd)) {
    return {
      continue: true,
      message:
        '[coffaen] vault가 초기화되지 않았습니다. `/coffaen:setup`을 실행하여 시작하세요.',
    };
  }

  // 2. WAL 잔존 감지
  const walPath = metaPath(cwd, 'wal.json');
  if (existsSync(walPath)) {
    messages.push(
      '[coffaen] 이전 세션의 미완료 트랜잭션(WAL)이 감지됐습니다. `/coffaen:doctor`로 진단하세요.',
    );
  }

  // 3. schedule-log.json 확인
  const scheduleLogPath = metaPath(cwd, 'schedule-log.json');
  if (existsSync(scheduleLogPath)) {
    try {
      const log = JSON.parse(readFileSync(scheduleLogPath, 'utf-8')) as {
        pending?: unknown[];
      };
      if (log.pending && log.pending.length > 0) {
        messages.push(
          `[coffaen] 예약된 작업 ${log.pending.length}개가 있습니다. \`/coffaen:organize\`로 처리하세요.`,
        );
      }
    } catch {
      // schedule-log.json 파싱 실패 시 무시
    }
  }

  // 4. 최근 세션 요약 로드
  const sessionsDir = metaPath(cwd, 'sessions');
  if (existsSync(sessionsDir)) {
    const recentSummary = loadRecentSessionSummary(sessionsDir);
    if (recentSummary) {
      messages.push(`[coffaen] 이전 세션 요약:\n${recentSummary}`);
    }
  }

  // 5. data-sources.json 미설정 확인
  const dataSourcesPath = metaPath(cwd, 'data-sources.json');
  if (!existsSync(dataSourcesPath)) {
    messages.push(
      '[coffaen] 외부 데이터 소스가 연결되지 않았습니다. `/coffaen:connect`로 연결하세요.',
    );
  }

  return {
    continue: true,
    message: messages.length > 0 ? messages.join('\n\n') : undefined,
  };
}

/**
 * sessions/ 디렉토리에서 가장 최근 세션 요약을 읽는다.
 */
function loadRecentSessionSummary(sessionsDir: string): string | null {
  try {
    const files = readdirSync(sessionsDir)
      .filter((f: string) => f.endsWith('.md'))
      .sort()
      .reverse();

    if (files.length === 0) return null;

    const latestFile = join(sessionsDir, files[0]);
    const content = readFileSync(latestFile, 'utf-8');

    // 요약 섹션만 추출 (처음 10줄)
    const lines = content.split('\n').slice(0, 10).join('\n');
    return lines.trim() || null;
  } catch {
    return null;
  }
}
