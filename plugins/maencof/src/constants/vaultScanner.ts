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
