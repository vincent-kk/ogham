# dependencyGraph contract

## Requirements

- source/target owner와 dependency evidence를 owner-level edge로 집계한다.
- 실제 directed edge에서 cycle을 계산하고 isolated owner도 nodePaths에 둔다.
- same-owner dependency는 evidence로 보존하지만 자기 cycle로 판정하지 않는다.
- 분석 불가능한 dependency가 있으면 certainty를 indeterminate로 보존한다.
- Windows/POSIX path identity는 portable 비교로 판정하며 case/separator alias를
  중복 owner나 별도 cycle node로 만들지 않는다.
- cycle은 정렬된 strongly-connected component label이 아니라 첫 owner가
  마지막에 반복되는 실제 directed closed route다. 각 cyclic component는
  결정론적인 대표 route 하나를 반환한다.

## API Contracts

- `buildDependencyGraph(nodePaths, evidence, certainty): DependencyGraph` —
  정렬된 edge, cycle과 certainty를 반환한다.
- `detectCycles(graph): string[][]` — cyclic component마다 실제 edge로 연결되고
  시작 owner로 닫히는 안정된 대표 경로 배열을 반환한다.
- legacy `buildDAG`, `topologicalSort`, `getDirectDependencies`는 작업 8
  정리 전 characterization 호환만 유지한다.

## Acceptance Criteria

### AC-dag-cycle — 실제 dependency cycle

- A → B → A reference는 A/B cycle을 반환한다.
- A → C → B → A reference는 정렬된 A/B/C label이 아니라 A/C/B/A route를
  반환한다.
- containment 관계와 same-owner edge만으로 cycle을 만들지 않는다.
- Windows case/separator alias 사이 edge는 logical self-edge로 취급한다.

### AC-dag-evidence — 검증 가능한 edge

- 각 edge가 source file, raw specifier와 resolved path를 보존한다.
- 같은 owner pair의 여러 import는 한 edge의 정렬된 evidence로 집계된다.
- logical owner path alias는 최초 canonical input path 하나로 집계된다.

### AC-dag-certainty — 억지 PASS 금지

- unresolved internal dependency가 있으면 graph는 indeterminate다.

## Last Updated

2026-07-27 — manual DAG utility를 adapter-evidence graph 계약으로 전환했다.
