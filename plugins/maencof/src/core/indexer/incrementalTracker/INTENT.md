# incrementalTracker

## Purpose

mtime 기반 변경 감지 및 부분 재인덱싱 범위 계산.

## Structure

- `index.ts` — 순수 barrel (공개 API: computeChangeSet/computeOneHopNeighbors/computeIncrementalScope/createSnapshot/IncrementalTracker + 타입)
- `types/` organ — 공개 타입 (ChangeSet/IncrementalScope/CurrentFileInfo)
- `operations/` organ — 변경 계산 (computeChangeSet/computeOneHopNeighbors/computeIncrementalScope/createSnapshot + IncrementalTracker 래퍼 클래스, 함수 1개/파일)

## Boundaries

### Always do

- metadataStore의 스냅샷 활용
- 1-hop 이웃 기반 영향 범위 산출

### Ask first

- 변경 감지 전략 변경

### Never do

- 전체 리빌드 강제
