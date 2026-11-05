# turnContext

## Purpose

KG 스냅샷·동반자 identity 로부터 압축 XML turn 컨텍스트(`buildTurnContext`)를 빌드하는 도메인 모듈. UserPromptSubmit 훅(`contextInjector`)과 MCP `contextCacheManage` 도구가 공유하므로 hooks 가 아니라 core 에 둔다. 훅 계약 타입에 의존하지 않는다.

## Conventions

세션 시작은 L1 전체 본문을, 매 턴은 gist만 싣는다. 매 턴 전체 본문을 넣으면 턴 예산을 소진한다.

## Boundaries

### Always do

- `core/cacheManager` 로 핀/캐시 read (sibling)
- 반환은 문자열/데이터만 — 훅 envelope 생성 금지

### Ask first

- turn 컨텍스트 포맷 변경

### Never do

- hooks/ · mcp/ 직접 의존 (core 경계)
- 인덱서 내부 상태(stale-node, freshness)를 컨텍스트에 노출
