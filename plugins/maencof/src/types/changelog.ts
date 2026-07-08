/**
 * @file changelog.ts
 * @description Changelog 타입 정의 — 감시 경로 미기록 변경의 세션 경계 스캔 상태
 *
 * 일별 changelog 문서(02_Derived/changelog/)는 /maencof:changelog 스킬이
 * 큐레이션한다. 코드는 스캔 상태(.maencof-meta/changelog-state.json)만 다룬다.
 */

/** 세션 경계 스캔이 남긴 미기록 변경 묶음 */
export interface ChangelogPendingScan {
  /** 스캔 시각 (ISO 8601) */
  detectedAt: string;
  /** 스캔을 수행한 세션 */
  sessionId?: string;
  /** `<XY status> <path>` 형식의 변경 라인 (CHANGELOG_PENDING_MAX_CHANGES 상한) */
  changes: string[];
}

/** `.maencof-meta/changelog-state.json` 스키마 */
export interface ChangelogState {
  /** 미기록 변경 (없으면 null) */
  pending: ChangelogPendingScan | null;
  /** 마지막 큐레이션 시각 (ISO 8601) — /maencof:changelog 가 갱신 */
  lastCuratedAt: string | null;
}

export {
  WATCHED_PATHS,
  CHANGELOG_EXCLUDE,
  CHANGELOG_STATE_FILE,
  CHANGELOG_PENDING_MAX_CHANGES,
} from '../constants/changelog.js';
