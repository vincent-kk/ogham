# turnContext

## Purpose

KG 스냅샷·동반자 identity 로부터 압축 XML turn 컨텍스트(`buildTurnContext`)를 빌드하는 도메인 모듈. UserPromptSubmit 훅(`contextInjector`)과 MCP `contextCacheManage` 도구가 공유하므로 hooks 가 아니라 core 에 둔다. 훅 계약 타입에 의존하지 않는다.

## Structure

- `build.ts` — `buildTurnContext` (조립 진입점)
- `buildL1CoreBlock.ts` — SessionStart 1회용 `<l1-core-full>` 전체 본문 블록 (매 턴은 gist 만)
- `readIndexMetadata.ts` · `readCachedNodesArray.ts` · `readCompanionIdentity.ts` · `readL1Summary.ts` — 캐시/소스 read
- `buildCompanionIdentityTag.ts` · `compressMarkdown.ts` · `extractGist.ts` — 직렬화/압축
- `index.ts` — 배럴

## Boundaries

### Always do

- `core/cacheManager` 로 핀/캐시 read (sibling)
- 반환은 문자열/데이터만 — 훅 envelope 생성 금지

### Ask first

- turn 컨텍스트 포맷 변경

### Never do

- hooks/ · mcp/ 직접 의존 (core 경계)
- 인덱서 내부 상태(stale-node, freshness)를 컨텍스트에 노출
