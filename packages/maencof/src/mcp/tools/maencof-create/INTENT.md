# maencof-create

## Purpose

지식 문서 생성 도구. 레이어/서브레이어 기반 경로 결정.

## Boundaries

### Always do

- 입력 Zod 스키마 검증
- core/ 모듈에 로직 위임

### Ask first

- 입출력 스키마 변경

### Never do

- 파일 I/O 직접 수행 (core/ 위임)
