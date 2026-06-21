/**
 * @file sessionStore.ts
 * @description 세션 기록 저장소 — 일자별 JSON(`activity/sessions/YYYY-MM-DD.json`).
 *
 * activityLog 와 동급의 파일시스템 I/O 모듈. 하루 1파일에 세션을 `session_id`
 * 키 맵으로 보관해 전수조사 없이 직접 조회한다. SessionStart 에 baseline 스냅샷을
 * 찍고 SessionEnd 에 차분으로 볼트 작업량을 산출한다.
 *
 * 구 `.maencof-meta/sessions/*.md` 는 더 이상 읽거나 쓰지 않는다 — 자연 폐기.
 */
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';

import {
  ACTIVITY_DIR,
  MAENCOF_META_DIR,
  SESSIONS_DIR,
} from '../../constants/directories.js';
import { USAGE_STATS_FILE } from '../../constants/usageStats.js';
import type { SessionDayLog, SessionRecord } from '../../types/session.js';
import { formatDate } from '../dateFormat/index.js';

/** 세션 JSON 디렉터리 경로 (`.maencof-meta/activity/sessions/`). */
export function getSessionsDir(cwd: string): string {
  return join(cwd, MAENCOF_META_DIR, ACTIVITY_DIR, SESSIONS_DIR);
}

/** 특정 일자의 세션 로그 파일 경로. */
export function getSessionDayPath(cwd: string, date: string): string {
  return join(getSessionsDir(cwd), `${date}.json`);
}

/**
 * 세션 시작을 기록한다. 당일 파일에 레코드를 생성하고 누적 통계 baseline 을 스냅샷한다.
 * 같은 session_id 가 이미 있으면(재개) 시작 시각을 보존하고 baseline 만 보강한다.
 */
export function recordSessionStart(
  cwd: string,
  sessionId: string,
  now: Date = new Date(),
): void {
  const date = formatDate(now);
  const log = readDayLog(cwd, date);
  const existing = log.sessions[sessionId];

  if (existing) {
    if (!existing.usageBaseline) existing.usageBaseline = readUsageCounts(cwd);
  } else {
    log.sessions[sessionId] = {
      sessionId,
      startedAt: now.toISOString(),
      skillsUsed: [],
      filesModified: [],
      usageBaseline: readUsageCounts(cwd),
    };
  }

  writeDayLog(cwd, log);
}

/**
 * 세션 종료를 기록한다. 진행 중 레코드를 찾아(당일 → 직전 일자) 마감하고,
 * baseline 대비 누적 통계 차분으로 `vaultOps` 를 산출한다.
 */
export function recordSessionEnd(
  cwd: string,
  params: {
    sessionId: string;
    skillsUsed?: string[];
    filesModified?: string[];
    now?: Date;
  },
): string {
  const now = params.now ?? new Date();
  const date = formatDate(now);
  const log = findOpenSessionDay(cwd, params.sessionId, date);

  let record = log.sessions[params.sessionId];
  if (!record) {
    record = {
      sessionId: params.sessionId,
      startedAt: now.toISOString(),
      skillsUsed: [],
      filesModified: [],
    };
    log.sessions[params.sessionId] = record;
  }

  record.endedAt = now.toISOString();
  record.skillsUsed = params.skillsUsed ?? record.skillsUsed;
  record.filesModified = params.filesModified ?? record.filesModified;

  if (record.usageBaseline) {
    const delta = diffUsageCounts(record.usageBaseline, readUsageCounts(cwd));
    if (Object.keys(delta).length > 0) record.vaultOps = delta;
    delete record.usageBaseline;
  }

  writeDayLog(cwd, log);
  return log.date;
}

/** 특정 일자의 세션 로그를 읽는다 (없거나 손상 시 빈 로그). */
export function readSessionDayLog(cwd: string, date: string): SessionDayLog {
  return readDayLog(cwd, date);
}

/**
 * 직전(마감된) 세션 요약을 사람이 읽기 좋은 문자열로 반환한다.
 * 최근 1~2개 일자 파일만 읽으므로 전수조사가 필요 없다.
 */
export function getRecentSessionSummary(cwd: string): string | null {
  const dir = getSessionsDir(cwd);
  if (!existsSync(dir)) return null;

  let dayFiles: string[];
  try {
    dayFiles = readdirSync(dir)
      .filter((f) => f.endsWith('.json'))
      .sort()
      .reverse();
  } catch {
    return null;
  }

  for (const file of dayFiles.slice(0, 2)) {
    const log = readDayLog(cwd, file.replace(/\.json$/, ''));
    const completed = Object.values(log.sessions).filter((s) => s.endedAt);
    if (completed.length === 0) continue;
    completed.sort((a, b) => (a.endedAt! < b.endedAt! ? 1 : -1));
    return formatSummary(completed[0]);
  }

  return null;
}

/** 세션이 속한 일자 로그를 찾는다: 당일 → 직전 일자의 미마감 레코드 → 당일(신규). */
function findOpenSessionDay(
  cwd: string,
  sessionId: string,
  today: string,
): SessionDayLog {
  const todayLog = readDayLog(cwd, today);
  if (todayLog.sessions[sessionId]) return todayLog;

  const dir = getSessionsDir(cwd);
  if (existsSync(dir)) {
    try {
      const priorFiles = readdirSync(dir)
        .filter((f) => f.endsWith('.json') && f !== `${today}.json`)
        .sort()
        .reverse();
      for (const file of priorFiles.slice(0, 2)) {
        const log = readDayLog(cwd, file.replace(/\.json$/, ''));
        const record = log.sessions[sessionId];
        if (record && !record.endedAt) return log;
      }
    } catch {
      /* ignore directory read errors */
    }
  }

  return todayLog;
}

function readDayLog(cwd: string, date: string): SessionDayLog {
  const path = getSessionDayPath(cwd, date);
  if (!existsSync(path)) return { date, sessions: {} };
  try {
    const parsed = JSON.parse(readFileSync(path, 'utf-8')) as SessionDayLog;
    if (parsed && typeof parsed === 'object' && parsed.sessions) {
      return { date: parsed.date ?? date, sessions: parsed.sessions };
    }
  } catch {
    /* corrupt file — fall through to empty log (no overwrite of recoverable data) */
  }
  return { date, sessions: {} };
}

function writeDayLog(cwd: string, log: SessionDayLog): void {
  mkdirSync(getSessionsDir(cwd), { recursive: true });
  writeFileSync(
    getSessionDayPath(cwd, log.date),
    JSON.stringify(log, null, 2) + '\n',
    'utf-8',
  );
}

/** usage-stats.json 에서 숫자 카운트만 추출 (legacy `skills`/`agents`/`last_updated` 제외). */
function readUsageCounts(cwd: string): Record<string, number> {
  const path = join(cwd, MAENCOF_META_DIR, USAGE_STATS_FILE);
  if (!existsSync(path)) return {};
  try {
    const raw = JSON.parse(readFileSync(path, 'utf-8')) as Record<
      string,
      unknown
    >;
    const counts: Record<string, number> = {};
    for (const [key, value] of Object.entries(raw)) {
      if (typeof value === 'number' && Number.isFinite(value)) {
        counts[key] = value;
      }
    }
    return counts;
  } catch {
    return {};
  }
}

function diffUsageCounts(
  baseline: Record<string, number>,
  current: Record<string, number>,
): Record<string, number> {
  const delta: Record<string, number> = {};
  for (const [tool, count] of Object.entries(current)) {
    const diff = count - (baseline[tool] ?? 0);
    if (diff > 0) delta[tool] = diff;
  }
  return delta;
}

function formatSummary(record: SessionRecord): string {
  const ended = record.endedAt
    ? record.endedAt.slice(0, 16).replace('T', ' ')
    : 'unknown';
  const lines = [`- Last session ended ${ended} (${record.sessionId})`];
  if (record.filesModified.length > 0) {
    lines.push(`- Files modified: ${record.filesModified.length}`);
  }
  if (record.skillsUsed.length > 0) {
    lines.push(`- Skills: ${record.skillsUsed.join(', ')}`);
  }
  if (record.vaultOps && Object.keys(record.vaultOps).length > 0) {
    const ops = Object.entries(record.vaultOps)
      .map(([tool, count]) => `${tool}:${count}`)
      .join(', ');
    lines.push(`- Vault ops: ${ops}`);
  }
  return lines.join('\n');
}
