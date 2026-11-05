# kgTimeline

## Purpose

updated 시간 기준 최신순/기간 내(since/until) 문서 열거 도구 (시드·SA 미사용, 그래프 노드 직접 스캔).

## Conventions

관련성 검색이 아니라 updated 시간창의 그래프 문서 열거를 소유한다.

## Boundaries

### Always do

- isDateInWindow 순수 판정 헬퍼 재사용

### Ask first

- 입출력 스키마 변경

### Never do

- Spreading Activation·query 엔진 호출 또는 직접 파일 I/O
