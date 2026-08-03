# spreadingActivation — DETAIL

## Requirements

- 현행 확산 엔진은 QGA-SA(`accumulativeActivation.ts`) 단독이다. 시드 노드에서 그래프를 전파해 관련 노드의 활성 점수를 낸다.
- 갱신식은 합산-누적이다 — `Δa(j) = g(j,Q) · Σ a(i)·α(i)·Ŵ(i,j)`, `a(j) ← min(1, a(j)+Δa(j))`.
- 유효 가중치는 출차수로 정규화한다(`Ŵ(i,j) = W(i,j)·mult(type)/deg_out(i)`) — 허브 확산을 원리적으로 억제한다.
- lexical 게이트 `g(j,Q)` 는 임베딩 없이 쿼리 토큰 중첩만으로 계산하며, 하한 `γ` 가 어휘 비중첩 노드의 구조 탐색을 보존한다. 쿼리 토큰이 비면 게이트는 전부 1.0 이다.
- 레이어 감쇠는 `weightCalculator` 의 `getLayerDecay` 에 위임한다 — 허브 > 서브레이어 > 레이어 우선순위를 이 fractal 이 다시 구현하지 않는다.
- 인접 리스트는 `graphBuilder` 가 만든 것을 쓰고, 그래프 구조는 수정하지 않는다.
- 파라미터 기본값의 정본은 `constants/spreadingActivation.ts` 다.
- 은퇴한 v1(BFS max-전파)과 코드를 공유하지 않는다 — 격리본은 `.metadata/maencof/TOOL/Spreading-Activation-Engine-Archive/` 에 있다.

## API Contracts

### Entry point (`index.ts`)

- `runAccumulativeActivation` — 확산 실행
- `AccumulativeActivationParams` (타입) — 파라미터

### `AccumulativeActivationParams`

| Field             | 정본 상수              | 의미                                        |
| ----------------- | ---------------------- | ------------------------------------------- |
| `iterations`      | `QGA_ITERATIONS`       | 동기 반복 횟수 T                            |
| `updateThreshold` | `QGA_UPDATE_THRESHOLD` | 게이트 적용 후 Δ 반영 임계값 τ              |
| `gateFloor`       | `QGA_GATE_FLOOR`       | lexical 게이트 하한 γ                       |
| `alphaBase`       | —                      | 전역 감쇠 스케일 α_base (layer 감쇠에 곱함) |
| `maxActiveNodes`  | —                      | 최대 활성 노드 수                           |
| `queryTokens`     | —                      | lowercase 쿼리 토큰. 비면 게이트 비활성     |
| `seedActivations` | —                      | 시드별 초기 활성값 (미지정 시 1.0)          |

엣지 타입 배수는 `EDGE_TYPE_MULTIPLIER`, LINK 유효 가중치 하한은 `QGA_LINK_WEIGHT_FLOOR` 가 소유한다.

## Acceptance Criteria

### AC-decay-delegated — 감쇠 위임

- 레이어·서브레이어·허브 감쇠 인자를 이 fractal 이 자체 계산하지 않고 `getLayerDecay(layer, subLayer, hub)` 로 얻는다. 허브 노드는 그 호출을 통해 최대 감쇠 인자를 받는다.

### AC-out-degree-normalized — 출차수 정규화

- 유효 가중치가 출발 노드의 출차수로 나뉘어, 연결이 많은 노드가 그만큼 더 많은 총 활성을 뿌리지 않는다.

### AC-activation-capped — 활성 상한

- 누적 활성값이 노드당 1.0 을 넘지 않는다.

### AC-empty-query-disables-gate — 빈 쿼리의 게이트 비활성

- `queryTokens` 가 비면 모든 노드의 게이트 값이 1.0 이 되어 구조 전파만 남는다.

### AC-archive-isolated — 아카이브 격리

- 이 fractal 의 어떤 파일도 아카이브된 v1 격리본을 import 하지 않는다.

## History

- 2026-08-04 — hub 가 레이어 직교 속성이 되면서 감쇠 조회가 `getLayerDecay(layer, subLayer)` 에서 `getLayerDecay(layer, subLayer, hub)` 로 바뀌었다. 허브 노드의 확산 억제를 출차수 정규화에만 맡기고 감쇠 인자는 최대로 준다는 결정이다.

## Last Updated

2026-08-04 — QGA-SA 엔진의 갱신식·정규화·게이트 계약과 감쇠 위임을 문서로 만들었다.
