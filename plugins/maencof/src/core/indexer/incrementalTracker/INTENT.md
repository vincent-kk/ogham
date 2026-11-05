# incrementalTracker

## Purpose

mtime 기반 변경 감지 및 부분 재인덱싱 범위 계산.

## Conventions

전체 재빌드 실행은 이 모듈의 권한이 아니다. 변경 영향 범위를 계산하여 호출자가 재빌드 여부를 결정하게 한다.

## Boundaries

### Always do

- metadataStore의 스냅샷 활용
- 1-hop 이웃 기반 영향 범위 산출

### Ask first

- 변경 감지 전략 변경

### Never do

- 전체 리빌드 강제
