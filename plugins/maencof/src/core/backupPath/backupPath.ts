/**
 * @file backupPath.ts
 * @description 타임스탬프 접미사 백업 경로(`<file>.bak-<ts>`)를 만든다.
 *
 * companionMigration·companionEdit이 파일 덮어쓰기 전에 공유하는 백업 명명 규칙.
 */

/** `filePath.bak-2026-07-07T00-00-00-000Z` 형태의 백업 경로를 반환한다. */
export function backupPathFor(filePath: string): string {
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  return `${filePath}.bak-${ts}`;
}
