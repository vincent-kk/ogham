# maencof-capture-insight

## Purpose

인사이트 캡처 도구. 대화 중 발견된 정보 기록.

## Boundaries

### Always do

- 입력 Zod 스키마 검증
- core/ 모듈에 로직 위임

### Ask first

- 입출력 스키마 변경

### Never do

- 파일 I/O 직접 수행 (core/ 위임)
