/**
 * @file workIndex.ts
 * @description 작업 이력 파생 계층 — daily digest 생성 + 기간 집계 + 토픽/레이어 역색인.
 *
 * 진실의 원천은 per-session 레코드(sessionStore)와 활동 로그(activityLog).
 * 그 위에 daily digest 만 영구 파생물로 두고(SessionEnd 뒷단에서 멱등 재계산),
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
  DIGESTS_DIR,
  MAENCOF_META_DIR,
} from '../../constants/directories.js';
import {
  DAILY_DIGEST_SUBDIR,
  LAYER_INDEX_FILE,
  MAX_DIGEST_PATHS,
  TOPIC_INDEX_FILE,
} from '../../constants/workIndex.js';
import type {
  DailyDigest,
  ReverseIndex,
  WorkPeriodSummary,
} from '../../types/workHistory.js';
import { readActivityEvents } from '../activityLog/index.js';
import { readSessionDayLog } from '../sessionStore/index.js';

import { inferTopicsLayers } from './inferTopicsLayers.js';

/** digest 디렉터리 (`.maencof-meta/activity/digests/`). */
export function getDigestsDir(cwd: string): string {
  return join(cwd, MAENCOF_META_DIR, ACTIVITY_DIR, DIGESTS_DIR);
}

/** 특정 일자의 daily digest 파일 경로. */
export function getDailyDigestPath(cwd: string, date: string): string {
  return join(getDailyDigestDir(cwd), `${date}.json`);
}

/**
 * 일일 작업 digest 를 멱등 재계산해 기록한다.
 * 세션(sessionStore)에서 세션수·소요시간·vaultOps 합산, 활동 로그(activityLog)에서
 * 문서 경로 → 레이어/토픽을 추론한다.
 */
export function buildDailyDigest(cwd: string, date: string): void {
  const sessions = Object.values(readSessionDayLog(cwd, date).sessions);
  const activity = readActivityEvents(cwd, date);

  let totalDurationMin = 0;
  const vaultOps: Record<string, number> = {};
  for (const session of sessions) {
    if (session.startedAt && session.endedAt) {
      const ms = Date.parse(session.endedAt) - Date.parse(session.startedAt);
      if (ms > 0) totalDurationMin += Math.round(ms / 60000);
    }
    for (const [tool, count] of Object.entries(session.vaultOps ?? {}))
      vaultOps[tool] = (vaultOps[tool] ?? 0) + count;
  }

  const paths = [
    ...new Set(
      activity
        .filter((entry) => entry.category === 'document' && entry.path)
        .map((entry) => entry.path as string),
    ),
  ];
  const { layers, topics } = inferTopicsLayers(paths);

  const digest: DailyDigest = {
    date,
    sessionCount: sessions.length,
    totalDurationMin,
    vaultOps,
    filePaths: paths.slice(0, MAX_DIGEST_PATHS),
    layers,
    topics,
  };

  mkdirSync(getDailyDigestDir(cwd), { recursive: true });
  writeFileSync(
    getDailyDigestPath(cwd, date),
    JSON.stringify(digest, null, 2) + '\n',
    'utf-8',
  );
}

/** 특정 일자의 daily digest 를 읽는다 (없거나 손상 시 null). */
export function readDailyDigest(cwd: string, date: string): DailyDigest | null {
  const path = getDailyDigestPath(cwd, date);
  if (!existsSync(path)) return null;
  try {
    const parsed = JSON.parse(readFileSync(path, 'utf-8')) as DailyDigest;
    if (parsed && typeof parsed.date === 'string') return parsed;
  } catch {
    /* corrupt digest — 다음 SessionEnd 에 재생성 */
  }
  return null;
}

/** daily digest 가 존재하는 일자 목록 (내림차순). */
export function listDailyDigestDates(cwd: string): string[] {
  const dir = getDailyDigestDir(cwd);
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

/** [from, to] 기간의 daily digest 를 합산한다 (전수조사 없이 범위 슬라이스). */
export function aggregatePeriod(
  cwd: string,
  from: string,
  to: string,
): WorkPeriodSummary {
  const dates = listDailyDigestDates(cwd).filter((d) => d >= from && d <= to);

  let activeDays = 0;
  let sessionCount = 0;
  let totalDurationMin = 0;
  const vaultOps: Record<string, number> = {};
  const layers = new Set<string>();
  const topicDays = new Map<string, number>();

  for (const date of dates) {
    const digest = readDailyDigest(cwd, date);
    if (!digest) continue;
    activeDays += 1;
    sessionCount += digest.sessionCount;
    totalDurationMin += digest.totalDurationMin;
    for (const [tool, count] of Object.entries(digest.vaultOps))
      vaultOps[tool] = (vaultOps[tool] ?? 0) + count;

    for (const layer of digest.layers) layers.add(layer);
    for (const topic of digest.topics)
      topicDays.set(topic, (topicDays.get(topic) ?? 0) + 1);
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
 * 토픽/레이어의 작업일자 이력을 조회한다. 역색인이 stale 하면 digest 에서 재파생·영속화한다.
 */
export function queryWork(
  cwd: string,
  kind: 'topic' | 'layer',
  key: string,
): { lastWorkedOn: string | null; dates: string[] } {
  const fileName = kind === 'topic' ? TOPIC_INDEX_FILE : LAYER_INDEX_FILE;
  let index = readReverseIndex(join(getDigestsDir(cwd), fileName));

  const newest = listDailyDigestDates(cwd)[0] ?? null;
  if (!index || index.coversThrough !== newest) {
    const rebuilt = buildReverseIndex(cwd);
    index = kind === 'topic' ? rebuilt.topic : rebuilt.layer;
  }

  const dates = index.index[key] ?? [];
  return { lastWorkedOn: dates[0] ?? null, dates };
}

function getDailyDigestDir(cwd: string): string {
  return join(getDigestsDir(cwd), DAILY_DIGEST_SUBDIR);
}

function readReverseIndex(path: string): ReverseIndex | null {
  if (!existsSync(path)) return null;
  try {
    const parsed = JSON.parse(readFileSync(path, 'utf-8')) as ReverseIndex;
    if (parsed && parsed.index && typeof parsed.index === 'object')
      return parsed;
  } catch {
    /* corrupt — 재파생 */
  }
  return null;
}

/** 모든 daily digest 에서 토픽/레이어 역색인을 재파생하고 영속화한다. */
function buildReverseIndex(cwd: string): {
  topic: ReverseIndex;
  layer: ReverseIndex;
} {
  const dates = listDailyDigestDates(cwd); // 내림차순
  const topicIndex: Record<string, string[]> = {};
  const layerIndex: Record<string, string[]> = {};

  for (const date of dates) {
    const digest = readDailyDigest(cwd, date);
    if (!digest) continue;
    for (const topic of digest.topics) (topicIndex[topic] ??= []).push(date);
    for (const layer of digest.layers) (layerIndex[layer] ??= []).push(date);
  }

  const coversThrough = dates[0] ?? null;
  const updatedAt = new Date().toISOString();
  const topic: ReverseIndex = { updatedAt, coversThrough, index: topicIndex };
  const layer: ReverseIndex = { updatedAt, coversThrough, index: layerIndex };

  mkdirSync(getDigestsDir(cwd), { recursive: true });
  writeFileSync(
    join(getDigestsDir(cwd), TOPIC_INDEX_FILE),
    JSON.stringify(topic, null, 2) + '\n',
    'utf-8',
  );
  writeFileSync(
    join(getDigestsDir(cwd), LAYER_INDEX_FILE),
    JSON.stringify(layer, null, 2) + '\n',
    'utf-8',
  );

  return { topic, layer };
}
