/**
 * @file types.ts
 * @description autonomy 내부 타입 — 영속 설정 형태.
 */
import type { AutonomyLevel } from '../../../types/common.js';

export interface AutonomyConfig {
  level: AutonomyLevel;
  updatedAt: string;
}
