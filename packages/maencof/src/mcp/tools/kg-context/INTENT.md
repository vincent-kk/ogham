# kg-context

## Purpose

지식 그래프 컨텍스트 조회 도구. 쿼리 기반 스니펫 조합.

## Boundaries

### Always do

- 입력 Zod 스키마 검증
- core/ 모듈에 로직 위임

### Ask first

- 입출력 스키마 변경

### Never do

- 파일 I/O 직접 수행 (core/ 위임)
