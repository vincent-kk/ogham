## Purpose

도구 핸들러 응답 헬퍼 모듈. 평문 데이터를 MCP 결과로 직렬화하고, throw 를 에러 봉투로 변환하며, `extra`(signal) 를 핸들러에 전달한다.

## Conventions

- 핸들러가 이미 `CallToolResult`(content 배열) 를 반환하면 그대로 통과; 그 외는 `toolResult` 로 직렬화
- `extra.signal` 은 collect_feedback 의 long-poll abort 에 필요 — 항상 전달

## Boundaries

### Always do

- 핸들러 throw 를 `toolError` 봉투로 변환
- pre-built content 결과는 변형 없이 passthrough

### Ask first

- 에러 봉투 형식 변경

### Never do

- 핸들러 throw 를 그대로 전파 (서버 크래시)
- content 블록 외 형태로 결과 반환
