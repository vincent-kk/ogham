# configRegistry

## Purpose

설정 파일 레지스트리. 각 설정의 경로, 기본값, 스키마 정의.

## Conventions

레지스트리는 선언이다. 런타임에 항목을 추가하거나 값을 바꾸지 않는다 — 프로비저닝이 결정적이어야 같은 볼트에서 같은 기본값이 나온다.

## Boundaries

### Always do

- configDefaults 타입 준수
- InsightConfig 등 도메인 설정 포함

### Ask first

- 새 설정 항목 추가

### Never do

- 런타임 설정 변경
