# shared

## Purpose

MCP 도구 공통 유틸리티. toolResult/toolError, backlink 관리.

## Boundaries

### Always do

- 모든 도구에서 공유
- Map replacer로 JSON 직렬화

### Ask first

- 유틸리티 함수 시그니처 변경

### Never do

- 도구 특화 로직 추가
