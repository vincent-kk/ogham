# context-cache-manage

## Purpose

컨텍스트 캐시 관리 도구. 핀 노드 추가/제거/조회.

## Boundaries

### Always do

- 입력 Zod 스키마 검증
- core/ 모듈에 로직 위임

### Ask first

- 입출력 스키마 변경

### Never do

- 파일 I/O 직접 수행 (core/ 위임)
