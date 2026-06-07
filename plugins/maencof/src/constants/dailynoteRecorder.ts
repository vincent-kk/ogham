/**
 * Paths whose writes MUST NOT be recorded in dailynote — maencof 자체 관리 영역.
 *
 * - `02_Derived/changelog/` : changelog 디렉토리 (self-reference 방지)
 * - `02_Derived/dailynotes/` : dailynote 디렉토리 자체 (무한 재귀 방지)
 * - `.maencof/` : 그래프 인덱스, stale-nodes 등
 * - `.maencof-meta/` : 운영 메타데이터 (session, config, dailynote 원본 포함)
 *
 * startsWith 매칭이므로 경로는 prefix 로 사용된다.
 */
export const DAILYNOTE_RECORDER_EXCLUSION_PREFIXES: readonly string[] = [
  '02_Derived/changelog/',
  '02_Derived/dailynotes/',
  '.maencof/',
  '.maencof-meta/',
];
