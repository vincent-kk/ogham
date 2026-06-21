/**
 * 활동 로그에 기록하지 않을 경로 prefix — maencof 자체 관리 영역.
 *
 * - `02_Derived/changelog/` : changelog 디렉토리 (self-reference 방지)
 * - `02_Derived/dailynotes/` : 볼트 측 파생 노트 디렉토리 (무한 재귀 방지)
 * - `.maencof/` : 그래프 인덱스, stale-nodes 등
 * - `.maencof-meta/` : 운영 메타데이터 (활동 로그·세션·rollup·config 포함)
 *
 * startsWith 매칭이므로 경로는 prefix 로 사용된다.
 */
export const ACTIVITY_RECORDER_EXCLUSION_PREFIXES: readonly string[] = [
  '02_Derived/changelog/',
  '02_Derived/dailynotes/',
  '.maencof/',
  '.maencof-meta/',
];
