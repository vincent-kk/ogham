# config-registry

## Purpose

설정 파일 레지스트리. 각 설정의 경로, 기본값, 스키마 정의.

## Boundaries

### Always do

- config-defaults 타입 준수
- InsightConfig 등 도메인 설정 포함

### Ask first

- 새 설정 항목 추가

### Never do

- 런타임 설정 변경
