# spreadingActivation — DETAIL

## Requirements

- 현행 확산 엔진은 QGA-SA(`accumulativeActivation.ts`) 단독이다. 시드 노드에서 그래프를 전파해 관련 노드의 활성 점수를 낸다.
- 갱신식은 합산-누적이다 — `Δa(j) = g(j,Q) · Σ a(i)·α(i)·Ŵ(i,j)`, `a(j) ← min(1, a(j)+Δa(j))`.
- 유효 가중치는 출차수로 정규화한다(`Ŵ(i,j) = W(i,j)·mult(type)/deg_out(i)`) — 허브 확산을 원리적으로 억제한다.
- lexical 게이트 `g(j,Q)` 는 임베딩 없이 쿼리 토큰 중첩만으로 계산하며, 하한 `γ` 가 어휘 비중첩 노드의 구조 탐색을 보존한다. 쿼리 토큰이 비면 게이트는 전부 1.0 이다.
- 레이어 감쇠는 `weightCalculator` 의 `getLayerDecay` 에 위임한다 — 허브 > 서브레이어 > 레이어 우선순위를 이 fractal 이 다시 구현하지 않는다.
- 인접 리스트는 `graphBuilder` 가 만든 것을 쓰고, 그래프 구조는 수정하지 않는다.
- 파라미터 기본값의 정본은 `constants/spreadingActivation.ts` 다.
- 비교용 v1(BFS max-전파)과 코드를 공유하지 않는다 — 격리본은 `.metadata/maencof/TOOL/Spreading-Activation-Engine-Archive/` 에 있다.

## API Contracts

엣지 타입 배수와 LINK 하한은 공통 상수가 소유한다. 허브 노드의 확산 억제는 출차수 정규화에 맡기고 감쇠 인자는 최대로 준다 — 교차 연결 역할을 감쇠로 다시 막지 않는다.

## Acceptance Criteria

### AC-decay-delegated — 감쇠 위임

- 레이어·서브레이어·허브 감쇠 인자를 이 fractal 이 자체 계산하지 않고 `getLayerDecay(layer, subLayer, hub)` 로 얻는다. 허브 노드는 그 호출을 통해 최대 감쇠 인자를 받는다.

### AC-archive-isolated — 아카이브 격리

- 이 fractal 의 어떤 파일도 아카이브된 v1 격리본을 import 하지 않는다.

## Last Updated

확산 모델·감쇠 위임·비교 엔진 격리 정책이 바뀔 때 갱신한다.
