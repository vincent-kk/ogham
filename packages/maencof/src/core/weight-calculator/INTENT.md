# weight-calculator

## Purpose

노드/엣지 가중치 계산. PageRank, 레이어 감쇠, 정규화.

## Boundaries

### Always do

- LAYER_DECAY_FACTORS 상수 사용
- SubLayer 단위 감쇠 지원

### Ask first

- 감쇠 팩터 값 변경

### Never do

- 그래프 구조 수정
