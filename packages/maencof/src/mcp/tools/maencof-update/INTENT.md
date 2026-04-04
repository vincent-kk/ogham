# maencof-update

## Purpose

지식 문서 수정 도구. L1 보호, 중복 제거 포함.

## Boundaries

### Always do

- 입력 Zod 스키마 검증
- core/ 모듈에 로직 위임

### Ask first

- 입출력 스키마 변경

### Never do

- 파일 I/O 직접 수행 (core/ 위임)
