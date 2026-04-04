# incremental-tracker

## Purpose

mtime 기반 변경 감지 및 부분 재인덱싱 범위 계산.

## Boundaries

### Always do

- metadata-store의 스냅샷 활용
- 1-hop 이웃 기반 영향 범위 산출

### Ask first

- 변경 감지 전략 변경

### Never do

- 전체 리빌드 강제
