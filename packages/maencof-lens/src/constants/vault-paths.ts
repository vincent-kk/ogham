/**
 * @file constants/vault-paths.ts
 * @description 볼트 파일 경로 및 상태 관련 상수
 */

/** maencof 인덱스 파일의 상대 경로 */
export const INDEX_FILE_PATH = '.maencof/index.json';

/** 볼트 상태값 */
export const VAULT_STATUS = {
  READY: 'ready',
  STALE: 'stale',
  PATH_NOT_FOUND: 'path not found',
  INDEX_NOT_BUILT: 'index not built',
} as const;

/** 볼트 상태 타입 */
export type VaultStatus = (typeof VAULT_STATUS)[keyof typeof VAULT_STATUS];
