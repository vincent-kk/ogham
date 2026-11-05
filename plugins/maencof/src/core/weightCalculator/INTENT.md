# weightCalculator

## Purpose

노드/엣지 가중치 계산. PageRank, 레이어 감쇠, 정규화.

## Conventions

감쇠 인자는 이웃으로 내보내는 활성량에 곱하는 값이다. 값이 클수록 넓게 퍼지며, 허브가 다리 역할을 막지 않도록 허브 우선순위를 유지한다.

## Boundaries

### Always do

- LAYER_DECAY_FACTORS 상수 사용
- SubLayer 단위 감쇠 지원

### Ask first

- 감쇠 팩터 값 변경

### Never do

- 그래프 구조 수정
