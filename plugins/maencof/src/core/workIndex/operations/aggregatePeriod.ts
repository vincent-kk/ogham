/**
 * @file aggregatePeriod.ts
 * @description [from, to] 기간의 daily digest 를 합산한다 (전수조사 없이 범위 슬라이스).
 */
import type { WorkPeriodSummary } from '../../../types/workHistory.js';

import { listDailyDigestDates } from './listDailyDigestDates.js';
import { readDailyDigest } from './readDailyDigest.js';

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
