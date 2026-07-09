/**
 * @file queryWork.ts
 * @description 토픽/레이어의 작업일자 이력을 조회한다. 역색인이 stale 하면 digest 에서 재파생·영속화한다.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  LAYER_INDEX_FILE,
  TOPIC_INDEX_FILE,
} from '../../../constants/workIndex.js';
import type { ReverseIndex } from '../../../types/workHistory.js';

import { getDigestsDir } from './getDigestsDir.js';
import { listDailyDigestDates } from './listDailyDigestDates.js';
import { readDailyDigest } from './readDailyDigest.js';

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
