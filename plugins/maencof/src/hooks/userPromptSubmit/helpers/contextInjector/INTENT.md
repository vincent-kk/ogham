# contextInjector

## Purpose

UserPromptSubmit 훅. 사용자 프롬프트에 지식 컨텍스트 주입.

## Boundaries

### Always do

- `core/cacheManager` 에서 캐시 읽기/쓰기 (mcp 와 공유)
- `core/turnContext` (`buildTurnContext`)로 turn 컨텍스트 빌드 (mcp 와 공유하는 도메인)
- 첫 prompt에서만 session context, 이후 prompt는 turn context만 emit

### Ask first

- 주입 포맷 변경
- session/turn context 분리 정책 변경

### Never do

- 사용자 프롬프트 원문 수정
- stale-node 카운트, freshness 비율, advisory 분기 등 인덱서 내부 상태를 컨텍스트에 포함 (MCP server가 cache + partial reindex로 처리)
- turn 컨텍스트 빌더·캐시를 hooks 안에 복제 (mcp 와 공유하는 `core/turnContext`·`core/cacheManager` 사용)
