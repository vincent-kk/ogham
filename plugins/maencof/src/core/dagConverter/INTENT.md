# dagConverter

## Purpose

지식 그래프를 DAG(방향성 비순환 그래프)로 변환. 레이어 방향성 적용.

## Structure

- `index.ts` — 순수 barrel (공개 API: convertToDAG/applyLayerDirectionality + 타입)
- `types/` organ — 공개 타입 (DAGConvertResult)
- `operations/` organ — DAG 변환 (convertToDAG/applyLayerDirectionality, 함수 1개/파일; detectCycleEdges·edgeKey private 인라인)

## Boundaries

### Always do

- Layer enum 기반 방향성 결정
- 순환 참조 제거

### Ask first

- 레이어 우선순위 규칙 변경

### Never do

- 원본 그래프 변경 (복사본 반환)
