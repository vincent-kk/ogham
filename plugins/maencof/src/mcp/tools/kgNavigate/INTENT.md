# kgNavigate

## Purpose

지식 그래프 탐색 도구. 노드 이웃 및 연결 조회.

## Boundaries

### Always do

- 입력 Zod 스키마 검증
- core/ 모듈에 로직 위임
- 이웃 목록(inbound/outbound/children/crossLayer/domain)은 `MAX_NAVIGATE_NEIGHBORS`, siblings 는 `MAX_NAVIGATE_SIBLINGS` 상한을 적용하고, 절단된 목록은 `neighborTotals`/`siblingTotalCount` 로 원총수를 보고

### Ask first

- 입출력 스키마 변경

### Never do

- 파일 I/O 직접 수행 (core/ 위임)
