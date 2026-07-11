# kgTimeline

## Purpose

updated 시간 기준 최신순/기간 내(since/until) 문서 열거 도구 (시드·SA 미사용, 그래프 노드 직접 스캔).

## Boundaries

### Always do

- 입력 Zod 스키마 검증
- isDateInWindow 순수 판정 헬퍼 재사용

### Ask first

- 입출력 스키마 변경

### Never do

- Spreading Activation / query 엔진 호출
- 파일 I/O 직접 수행 (그래프 노드만 스캔)
