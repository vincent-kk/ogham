/**
 * @file workIndex.ts
 * @description 작업 이력 파생 계층 — daily rollup 생성 + 기간 집계 + 토픽/레이어 역색인.
 *
 * 진실의 원천은 per-session 레코드(sessionStore)와 활동 로그(activityLog).
 * 그 위에 daily rollup 만 영구 파생물로 두고(SessionEnd 뒷단에서 멱등 재계산),
 * 주/월 집계는 daily glob+합산으로, 역색인은 on-demand 재파생으로 구한다.
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
  ROLLUPS_DIR,
} from '../../constants/directories.js';
import {
  DAILY_ROLLUP_SUBDIR,
  LAYER_INDEX_FILE,
  MAX_ROLLUP_PATHS,
  TOPIC_INDEX_FILE,
} from '../../constants/workIndex.js';
import type {
  DailyRollup,
  ReverseIndex,
  WorkPeriodSummary,
} from '../../types/workHistory.js';
import { readActivityEvents } from '../activityLog/index.js';
import { readSessionDayLog } from '../sessionStore/index.js';

import { inferTopicsLayers } from './inferTopicsLayers.js';

/** rollup 디렉터리 (`.maencof-meta/activity/rollups/`). */
export function getRollupsDir(cwd: string): string {
  return join(cwd, MAENCOF_META_DIR, ACTIVITY_DIR, ROLLUPS_DIR);
}

/** 특정 일자의 daily rollup 파일 경로. */
export function getDailyRollupPath(cwd: string, date: string): string {
  return join(getDailyRollupDir(cwd), `${date}.json`);
}

/**
 * 일일 작업 롤업을 멱등 재계산해 기록한다.
 * 세션(sessionStore)에서 세션수·소요시간·vaultOps 합산, 활동 로그(activityLog)에서
 * 문서 경로 → 레이어/토픽을 추론한다.
 */
export function buildDailyRollup(cwd: string, date: string): void {
  const sessions = Object.values(readSessionDayLog(cwd, date).sessions);
  const activity = readActivityEvents(cwd, date);

  let totalDurationMin = 0;
  const vaultOps: Record<string, number> = {};
  for (const session of sessions) {
    if (session.startedAt && session.endedAt) {
      const ms = Date.parse(session.endedAt) - Date.parse(session.startedAt);
      if (ms > 0) totalDurationMin += Math.round(ms / 60000);
    }
    for (const [tool, count] of Object.entries(session.vaultOps ?? {})) {
      vaultOps[tool] = (vaultOps[tool] ?? 0) + count;
    }
  }

  const paths = [
    ...new Set(
      activity
        .filter((entry) => entry.category === 'document' && entry.path)
        .map((entry) => entry.path as string),
    ),
  ];
  const { layers, topics } = inferTopicsLayers(paths);

  const rollup: DailyRollup = {
    date,
    sessionCount: sessions.length,
    totalDurationMin,
    vaultOps,
    filePaths: paths.slice(0, MAX_ROLLUP_PATHS),
    layers,
    topics,
  };

  mkdirSync(getDailyRollupDir(cwd), { recursive: true });
  writeFileSync(
    getDailyRollupPath(cwd, date),
    JSON.stringify(rollup, null, 2) + '\n',
    'utf-8',
  );
}

/** 특정 일자의 daily rollup 을 읽는다 (없거나 손상 시 null). */
export function readDailyRollup(cwd: string, date: string): DailyRollup | null {
  const path = getDailyRollupPath(cwd, date);
  if (!existsSync(path)) return null;
  try {
    const parsed = JSON.parse(readFileSync(path, 'utf-8')) as DailyRollup;
    if (parsed && typeof parsed.date === 'string') return parsed;
  } catch {
    /* corrupt rollup — 다음 SessionEnd 에 재생성 */
  }
  return null;
}

/** daily rollup 이 존재하는 일자 목록 (내림차순). */
export function listDailyRollupDates(cwd: string): string[] {
  const dir = getDailyRollupDir(cwd);
  if (!existsSync(dir)) return [];
  try {
    return readdirSync(dir)
      .filter((f) => f.endsWith('.json'))
      .map((f) => f.replace(/\.json$/, ''))
      .sort()
      .reverse();
  } catch {
    return [];
  }
}

/** [from, to] 기간의 daily rollup 을 합산한다 (전수조사 없이 범위 슬라이스). */
export function aggregatePeriod(
  cwd: string,
  from: string,
  to: string,
): WorkPeriodSummary {
  const dates = listDailyRollupDates(cwd).filter((d) => d >= from && d <= to);

  let activeDays = 0;
  let sessionCount = 0;
  let totalDurationMin = 0;
  const vaultOps: Record<string, number> = {};
  const layers = new Set<string>();
  const topicDays = new Map<string, number>();

  for (const date of dates) {
    const rollup = readDailyRollup(cwd, date);
    if (!rollup) continue;
    activeDays += 1;
    sessionCount += rollup.sessionCount;
    totalDurationMin += rollup.totalDurationMin;
    for (const [tool, count] of Object.entries(rollup.vaultOps)) {
      vaultOps[tool] = (vaultOps[tool] ?? 0) + count;
    }
    for (const layer of rollup.layers) layers.add(layer);
    for (const topic of rollup.topics) {
      topicDays.set(topic, (topicDays.get(topic) ?? 0) + 1);
    }
  }

  const topTopics = [...topicDays.entries()]
    .map(([topic, days]) => ({ topic, days }))
    .sort((a, b) => b.days - a.days)
    .slice(0, 10);

  return {
    from,
    to,
    activeDays,
    sessionCount,
    totalDurationMin,
    vaultOps,
    topTopics,
    layers: [...layers],
  };
}

/**
 * 토픽/레이어의 작업일자 이력을 조회한다. 역색인이 stale 하면 daily 에서 재파생·영속화한다.
 */
export function queryWork(
  cwd: string,
  kind: 'topic' | 'layer',
  key: string,
): { lastWorkedOn: string | null; dates: string[] } {
  const fileName = kind === 'topic' ? TOPIC_INDEX_FILE : LAYER_INDEX_FILE;
  let index = readReverseIndex(join(getRollupsDir(cwd), fileName));

  const newest = listDailyRollupDates(cwd)[0] ?? null;
  if (!index || index.coversThrough !== newest) {
    const rebuilt = buildReverseIndex(cwd);
    index = kind === 'topic' ? rebuilt.topic : rebuilt.layer;
  }

  const dates = index.index[key] ?? [];
  return { lastWorkedOn: dates[0] ?? null, dates };
}

function getDailyRollupDir(cwd: string): string {
  return join(getRollupsDir(cwd), DAILY_ROLLUP_SUBDIR);
}

function readReverseIndex(path: string): ReverseIndex | null {
  if (!existsSync(path)) return null;
  try {
    const parsed = JSON.parse(readFileSync(path, 'utf-8')) as ReverseIndex;
    if (parsed && parsed.index && typeof parsed.index === 'object') {
      return parsed;
    }
  } catch {
    /* corrupt — 재파생 */
  }
  return null;
}

/** 모든 daily rollup 에서 토픽/레이어 역색인을 재파생하고 영속화한다. */
function buildReverseIndex(cwd: string): {
  topic: ReverseIndex;
  layer: ReverseIndex;
} {
  const dates = listDailyRollupDates(cwd); // 내림차순
  const topicIndex: Record<string, string[]> = {};
  const layerIndex: Record<string, string[]> = {};

  for (const date of dates) {
    const rollup = readDailyRollup(cwd, date);
    if (!rollup) continue;
    for (const topic of rollup.topics) (topicIndex[topic] ??= []).push(date);
    for (const layer of rollup.layers) (layerIndex[layer] ??= []).push(date);
  }

  const coversThrough = dates[0] ?? null;
  const updatedAt = new Date().toISOString();
  const topic: ReverseIndex = { updatedAt, coversThrough, index: topicIndex };
  const layer: ReverseIndex = { updatedAt, coversThrough, index: layerIndex };

  mkdirSync(getRollupsDir(cwd), { recursive: true });
  writeFileSync(
    join(getRollupsDir(cwd), TOPIC_INDEX_FILE),
    JSON.stringify(topic, null, 2) + '\n',
    'utf-8',
  );
  writeFileSync(
    join(getRollupsDir(cwd), LAYER_INDEX_FILE),
    JSON.stringify(layer, null, 2) + '\n',
    'utf-8',
  );

  return { topic, layer };
}
