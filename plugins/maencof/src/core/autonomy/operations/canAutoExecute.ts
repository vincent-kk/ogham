/**
 * @file canAutoExecute.ts
 * @description 현재 레벨이 요구 레벨 이상인지 판정하는 순수 게이트.
 */
import type { AutonomyLevel } from '../../../types/common.js';

export function canAutoExecute(
  current: AutonomyLevel,
  required: AutonomyLevel,
): boolean {
  return current >= required;
}
