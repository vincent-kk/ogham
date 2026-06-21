/**
 * @file workHistory.ts
 * @description work_history MCP 도구 핸들러 — 기간 작업 요약 / 토픽·레이어 작업 이력.
 *
 * topic 또는 layer 가 주어지면 해당 키의 작업일자 이력을 반환하고(역색인 활용),
 * 아니면 last_days 또는 from/to 범위의 daily rollup 을 합산한 기간 요약을 반환한다.
 */
import { aggregatePeriod, queryWork } from '../../../core/workIndex/index.js';
import type {
  WorkHistoryReadInput,
  WorkHistoryReadResult,
} from '../../../types/workHistory.js';

export function handleWorkHistory(
  vaultPath: string,
  input: WorkHistoryReadInput,
): WorkHistoryReadResult {
  if (input.topic) {
    const { lastWorkedOn, dates } = queryWork(vaultPath, 'topic', input.topic);
    return { lookup: { kind: 'topic', key: input.topic, lastWorkedOn, dates } };
  }
  if (input.layer) {
    const { lastWorkedOn, dates } = queryWork(vaultPath, 'layer', input.layer);
    return { lookup: { kind: 'layer', key: input.layer, lastWorkedOn, dates } };
  }

  const { from, to } = resolvePeriod(input);
  return { period: aggregatePeriod(vaultPath, from, to) };
}

function resolvePeriod(input: WorkHistoryReadInput): {
  from: string;
  to: string;
} {
  if (input.from && input.to) return { from: input.from, to: input.to };

  const lastDays = Math.min(Math.max(input.last_days ?? 7, 1), 90);
  const now = new Date();
  const fromDate = new Date(now);
  fromDate.setDate(fromDate.getDate() - (lastDays - 1));
  return { from: toDateString(fromDate), to: toDateString(now) };
}

function toDateString(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
