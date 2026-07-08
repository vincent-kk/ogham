export const WATCHED_PATHS = [
  '01_Core/',
  '02_Derived/',
  '.claude/agents/',
  '.claude/rules/',
  'CLAUDE.md',
] as const;

export const CHANGELOG_EXCLUDE = '02_Derived/changelog/';

/** `.maencof-meta/` 하위 changelog 스캔 상태 파일 이름. */
export const CHANGELOG_STATE_FILE = 'changelog-state.json';

/** pending 스캔에 보존하는 변경 라인 수 상한 (상태 파일 크기 bound). */
export const CHANGELOG_PENDING_MAX_CHANGES = 50;
