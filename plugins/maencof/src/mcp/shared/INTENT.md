# shared

## Purpose

MCP 도구 공통 유틸리티. toolResult/toolError, backlink 관리.

## Structure

- `index.ts` — 순수 barrel
- `backlinks/` organ — removeBacklinks / getBacklinks (backlink-index.json I/O)
- `response/` organ — mapReplacer / toolResult / toolError (MCP 응답 포맷)

## Boundaries

### Always do

- 모든 도구에서 공유
- Map replacer로 JSON 직렬화

### Ask first

- 유틸리티 함수 시그니처 변경

### Never do

- 도구 특화 로직 추가
