import { LAYER_DIR } from './architecture.js';
import { ARCHIVE_DIR } from './directories.js';

/**
 * Vault scan 의 기본 제외 glob 패턴.
 * node_modules/.git 은 vault 내 어디서든 나타날 수 있어 중첩 앵커('**' 프리픽스)가 필수 —
 * 루트 앵커만 두면 내장 앱 디렉토리(예: dashboard/node_modules)의 md 가 스캔된다.
 */
export const VAULT_SCAN_DEFAULT_EXCLUDE: readonly string[] = [
  '.maencof/**',
  '.maencof-meta/**',
  '.obsidian/**',
  '**/node_modules/**',
  '**/.git/**',
];

/**
 * Vault scan 의 인덱싱 대상 allowlist — 레이어 디렉토리(01_Core~05_Context)만 스캔한다.
 * 제외 나열(blocklist)이 아닌 allowlist 인 이유: 서고(99_Archive)든 미래의 낯선
 * 디렉토리든 여기 없는 경로는 그래프에 새지 않는다. vault 루트 문서도 대상 밖이다.
 */
export const VAULT_SCAN_LAYER_PATTERNS: readonly string[] = Object.values(
  LAYER_DIR,
).map((dir) => `${dir}/**/*.md`);

/**
 * 서고 열거 스캔 대상 — 그래프 allowlist(VAULT_SCAN_LAYER_PATTERNS)와 분리 유지.
 * 여기 매칭된 파일은 그래프 노드가 아니라 cluster 열거 인덱스 재료다.
 */
export const ARCHIVE_SCAN_PATTERNS: readonly string[] = [
  `${ARCHIVE_DIR}/**/*.md`,
];
