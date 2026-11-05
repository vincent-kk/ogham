# weightCalculator — DETAIL

## Requirements

- 노드·엣지 가중치 계산을 소유한다 — PageRank, 감쇠 인자 조회, 정규화.
- 감쇠 인자의 정본은 `constants/weights.ts` 의 `LAYER_DECAY_FACTORS` · `SUBLAYER_DECAY_FACTORS` · `HUB_DECAY_FACTOR` 이며, 이 fractal 은 그 상수를 재노출할 뿐 값을 자체 정의하지 않는다.
- `getLayerDecay` 가 돌려주는 값은 **확산 시 이웃으로 내보내는 활성량에 곱할 인자**다. 값이 클수록 넓게 퍼진다 — 감쇠되는 양이 아니다.
- 우선순위는 허브 > 서브레이어 > 레이어다. 허브는 레이어·서브레이어 값을 모두 덮어쓴다.
- 그래프 구조를 수정하지 않는다.

## API Contracts

감쇠 값 변경은 공통 상수에서 이루어진다. 허브 우선순위는 다리 역할을 하는 노드가 전파를 막지 않도록 하는 결정이며, 서브레이어 값은 해당 레이어의 기본값을 세분화한다.

## Acceptance Criteria

### AC-unknown-layer-fallback — 미지 레이어 폴백

- `LAYER_DECAY_FACTORS` 에 없는 레이어 값은 `0.7` 로 떨어지고 throw 하지 않는다.

### AC-constants-are-canonical — 상수 단일 정본

- 이 fractal 은 감쇠 값을 자체 정의하지 않고 `constants/weights.ts` 를 재노출한다. 값 변경은 상수 파일에서 일어난다.

## Last Updated

감쇠 인자의 의미·허브 우선순위·상수 소유권이 바뀔 때 갱신한다.
