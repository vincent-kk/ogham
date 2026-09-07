# analysis -- 의존성 그래프와 배치 계산

## Purpose

실제 의존성 DAG와 multi-consumer lowest common fractal을 계산하는 sub-fractal. 스캔·검증 오케스트레이션과 리포트 생성은 소유하지 않는다.

## Structure

| 모듈              | 역할                                                                             |
| ----------------- | -------------------------------------------------------------------------------- |
| `dependencyGraph` | `DependencyEdge[]`에서 DAG 구축, Kahn 위상 정렬, DFS 사이클 감지, 직접 의존 조회 |
| `lcaCalculator`   | 소비자 owner 전체의 lowest common fractal과 portable ownership 계산              |

`index.ts`는 두 하위 fractal의 진입점을 이름으로 재수출한다.

## Conventions

- 소유 subtree 안의 organ 참조는 edge로 보존하되 cycle adjacency에서 뺀다 — 승격 인공물은 런타임 순환이 아니다.
- cycle은 placeholder가 아니라 실제 directed closed route를 증거로 낸다.
- 그래프를 만들 수 없는 파일이 결론에 영향을 줄 수 있으면 전체 결과가 `indeterminate`다.
- 경로 비교와 정규화는 `@ogham/cross-platform` compat helper를 거친다 — 네이티브 `node:path`로 정체성을 판정하지 않는다.

## Boundaries

### Always do

- 분석 함수 변경 후 dependency graph와 LCA 검증을 함께 갱신
- 소비자를 소유 fractal로 올린 뒤 교집합을 구하기 (문자열 공통 prefix 금지)

### Ask first

- LCA 알고리즘을 naive traversal에서 Tarjan/Euler tour로 교체
- cycle adjacency에서 organ edge를 빼는 정책 변경

### Never do

- 상위 orchestration 계층을 직접 import
- 미해소 의존성을 PASS로 승격
