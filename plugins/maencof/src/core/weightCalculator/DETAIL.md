# weightCalculator — DETAIL

## Requirements

- 노드·엣지 가중치 계산을 소유한다 — PageRank, 감쇠 인자 조회, 정규화.
- 감쇠 인자의 정본은 `constants/weights.ts` 의 `LAYER_DECAY_FACTORS` · `SUBLAYER_DECAY_FACTORS` · `HUB_DECAY_FACTOR` 이며, 이 fractal 은 그 상수를 재노출할 뿐 값을 자체 정의하지 않는다.
- `getLayerDecay` 가 돌려주는 값은 **확산 시 이웃으로 내보내는 활성량에 곱할 인자**다. 값이 클수록 넓게 퍼진다 — 감쇠되는 양이 아니다.
- 우선순위는 허브 > 서브레이어 > 레이어다. 허브는 레이어·서브레이어 값을 모두 덮어쓴다.
- 그래프 구조를 수정하지 않는다.

## API Contracts

### Entry point (`index.ts`)

| 종류 | 심볼                                                                          |
| ---- | ----------------------------------------------------------------------------- |
| 상수 | `HUB_DECAY_FACTOR` · `LAYER_DECAY_FACTORS` · `SUBLAYER_DECAY_FACTORS`         |
| 연산 | `calculateWeights` · `computePageRank` · `normalizeWeights` · `getLayerDecay` |
| 타입 | `WeightCalcResult`                                                            |

상수 셋은 `constants/weights.ts` 에서 재노출한 것이다.

### `getLayerDecay(layer, subLayer?, hub?)`

| 조건                                           | 반환                               |
| ---------------------------------------------- | ---------------------------------- |
| `hub === true`                                 | `HUB_DECAY_FACTOR`                 |
| `subLayer` 가 `SUBLAYER_DECAY_FACTORS` 에 있음 | `SUBLAYER_DECAY_FACTORS[subLayer]` |
| 그 외                                          | `LAYER_DECAY_FACTORS[layer]`       |
| 알 수 없는 레이어                              | `0.7`                              |

## Acceptance Criteria

### AC-hub-overrides-all — 허브 우선

- `hub: true` 인 노드는 레이어와 서브레이어가 무엇이든 `HUB_DECAY_FACTOR` 를 받는다. 다리 역할을 하는 노드가 전파를 막지 않는다.

### AC-sub-layer-over-layer — 서브레이어 우선

- 허브가 아니고 알려진 L3 서브레이어를 가진 노드는 `LAYER_DECAY_FACTORS` 가 아니라 `SUBLAYER_DECAY_FACTORS` 값을 받는다.

### AC-unknown-layer-fallback — 미지 레이어 폴백

- `LAYER_DECAY_FACTORS` 에 없는 레이어 값은 `0.7` 로 떨어지고 throw 하지 않는다.

### AC-constants-are-canonical — 상수 단일 정본

- 이 fractal 은 감쇠 값을 자체 정의하지 않고 `constants/weights.ts` 를 재노출한다. 값 변경은 상수 파일에서 일어난다.

## History

- 2026-08-04 — hub 가 레이어 직교 속성이 되면서 `getLayerDecay` 가 세 번째 인자 `hub` 를 받고, entry point 가 `HUB_DECAY_FACTOR` 를 새로 노출해 공개 표면이 넓어졌다.

## Last Updated

2026-08-04 — 허브 감쇠 도입으로 넓어진 공개 표면과 감쇠 우선순위 계약을 문서로 만들었다.
