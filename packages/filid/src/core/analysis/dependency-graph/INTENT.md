# dependency-graph -- DAG 구축·순환 감지·위상 정렬

## Purpose

`DependencyEdge[]` 입력으로 DAG(`DependencyDAG`)를 구축하고, Kahn 알고리즘 기반 위상 정렬과 DFS 기반 순환 감지를 제공한다. `project-analyzer`가 FCA-AI 순환 의존성 규칙을 검사할 때 사용한다.

## Structure

- `dependency-graph.ts` — `buildDAG`, `topologicalSort`, `detectCycles`, `getDirectDependencies`

## Conventions

- 입력 edge 배열은 불변 처리 — 원본 참조를 그대로 유지한 `DependencyDAG` 반환
- 정점 집합은 `Set<string>`, 인접 리스트는 `Map<string, string[]>`로 고정
- 순환 존재 시 `topologicalSort`는 null 반환 (예외로 던지지 않음)
- `detectCycles`는 가능한 모든 사이클 경로 배열을 반환 — 빈 배열이면 DAG

## Boundaries

### Always do

- 새 그래프 연산 추가 시 입력을 `DependencyDAG` 타입으로 받도록 통일
- DFS 색칠(WHITE/GRAY/BLACK) 상태 기계 유지

### Ask first

- 알고리즘 교체 (Kahn → Tarjan SCC 등)
- 반환 타입을 null에서 throw로 변경

### Never do

- 노드 문자열을 임의 정규화·소문자화 (경로 대소문자 보존)
- 파일 I/O 수행 (순수 함수 유지)

## Dependencies

- `../../../types/fractal.js` (`DependencyDAG`, `DependencyEdge`)
