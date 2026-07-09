/**
 * @file internalDirs.ts
 * @description maencof 내부 관리 디렉토리 목록 — 경로 판별에서 제외 대상.
 */
import {
  MAENCOF_DIR,
  MAENCOF_META_DIR,
} from '../../../../../constants/directories.js';

export const INTERNAL_DIRS = [MAENCOF_DIR, MAENCOF_META_DIR] as const;
