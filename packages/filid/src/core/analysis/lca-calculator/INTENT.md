# lca-calculator -- 최소 공통 조상과 모듈 배치 제안

## Purpose

프랙탈 트리에서 두 노드의 Lowest Common Ancestor를 계산하고, 여러 의존 모듈을 분석해 공유 코드를 배치할 최적 fractal 레벨(suggestedParent)을 제안한다. FCA-AI "공유 코드는 LCA에 둔다" 원칙의 계산 엔진이다.

## Structure

- `lca-calculator.ts` — `getAncestorPaths`, `findLCA`, `getModulePlacement`

## Conventions

- `fractal-tree.getAncestors`를 재사용해 조상 경로를 구성 (자체 탐색 금지)
- 존재하지 않는 노드 경로에는 null/빈 배열 반환 (예외로 던지지 않음)
- `getModulePlacement`는 모든 의존 쌍의 LCA 중 `depth`가 가장 깊은 것을 선택
- confidence는 `foundCount / pairCount` — 0 의존성 입력 시 root 반환하고 confidence 0

## Boundaries

### Always do

- 동일 노드 입력(`pathA === pathB`) 시 해당 노드를 즉시 반환
- LCA가 없으면 트리 루트를 fallback으로 반환

### Ask first

- 알고리즘을 naive traversal에서 Tarjan off-line / Euler tour RMQ로 교체
- `suggestedParent` 선택 기준 변경 (depth → 의존 수 등)

### Never do

- 트리 구조를 직접 mutate (읽기 전용)
- 파일 I/O 수행 (순수 계산 함수)

## Dependencies

- `../../tree/fractal-tree/` (getAncestors)
- `../../../types/fractal.js` (`FractalNode`, `FractalTree`)
