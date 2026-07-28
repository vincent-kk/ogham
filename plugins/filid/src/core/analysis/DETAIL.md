# analysis contract

## Requirements

- 실제 의존성 DAG와 multi-consumer lowest common fractal을 계산한다.
- cycle은 placeholder가 아니라 실제 directed closed route를 증거로 낸다.
- 소유 subtree 안의 organ 참조는 edge로 보존하되 cycle adjacency에서 뺀다 — 승격 인공물은 런타임 순환이 아니다.
- 그래프를 만들 수 없는 파일이 결론에 영향을 줄 수 있으면 전체 결과가 `indeterminate`다.

## API Contracts

- `buildDependencyGraph`, `detectCycles`, `topologicalSort`, `getDirectDependencies`, `resolveOwningOrganPath`, `buildDAG` — 그래프.
- `findLowestCommonFractal`, `resolveOwningFractal`, `getAncestorPaths` — 배치 계산.

## Acceptance Criteria

### AC-analysis-real-cycles — 증거 있는 순환

- 보고된 cycle이 실제 경로를 담으며 placeholder PASS가 없다.

### AC-analysis-lca — 소유 프랙탈 기준 LCA

- 소비자를 소유 프랙탈로 올린 뒤 교집합을 구하며 문자열 공통 prefix를 쓰지 않는다.

## Last Updated

2026-07-28 — 중간 계층 fractal 계약을 문서화했다.
