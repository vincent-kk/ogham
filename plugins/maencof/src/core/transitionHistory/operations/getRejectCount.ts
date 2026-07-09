/**
 * @file getRejectCount.ts
 * @description 특정 경로·방향의 거부(rejected) 전이 횟수를 집계한다.
 */
import { readTransitionHistory } from './readTransitionHistory.js';

export function getRejectCount(
  cwd: string,
  path: string,
  direction: string,
): number {
  const entries = readTransitionHistory(cwd);
  return entries.filter(
    (e) =>
      e.directive.path === path &&
      e.directive.outcome === 'rejected' &&
      `${e.directive.fromLayer}->${e.directive.toLayer}` === direction,
  ).length;
}
