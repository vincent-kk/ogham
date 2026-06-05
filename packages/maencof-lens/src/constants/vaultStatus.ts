/**
 * @file vaultStatus.ts
 * @description 볼트 상태 라벨 상수. 인덱스 마커 파일명은 @ogham/maencof의 CACHE_FILES를 직접 사용한다.
 */

/** 볼트 상태값 */
export const VAULT_STATUS = {
  READY: "ready",
  STALE: "stale",
  PATH_NOT_FOUND: "path not found",
  INDEX_NOT_BUILT: "index not built",
  LEGACY_V1: "legacy v1",
  UNKNOWN: "status unknown",
} as const;

/** 볼트 상태 타입 */
export type VaultStatus = (typeof VAULT_STATUS)[keyof typeof VAULT_STATUS];
