# weightCalculator

## Purpose

노드/엣지 가중치 계산. PageRank, 레이어 감쇠, 정규화.

## Structure

- `index.ts` — 순수 barrel (공개 API: calculateWeights/computePageRank/normalizeWeights/getLayerDecay + LAYER_DECAY_FACTORS/SUBLAYER_DECAY_FACTORS 재노출 + 타입)
- `types/` organ — 공개 타입 (WeightCalcResult)
- `operations/` organ — 가중치 연산 (calculateWeights/computePageRank/normalizeWeights/getLayerDecay, 함수 1개/파일; edge-weight·pagerank private 헬퍼는 각 파일 인라인)

## Boundaries

### Always do

- LAYER_DECAY_FACTORS 상수 사용
- SubLayer 단위 감쇠 지원

### Ask first

- 감쇠 팩터 값 변경

### Never do

- 그래프 구조 수정
