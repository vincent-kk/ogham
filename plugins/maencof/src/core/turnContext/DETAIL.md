# turnContext — Contract

## Requirements

- 반환은 문자열과 데이터뿐이다. 훅 envelope 을 만들지 않는다 — 같은 조립기를 UserPromptSubmit 훅과 MCP `contextCacheManage` 도구가 함께 쓰기 때문이다.
- 훅 계약 타입에 의존하지 않는다. 그래서 `hooks/` 가 아니라 `core/` 에 있다.
- L1 은 두 형태로 나간다: SessionStart 는 `buildL1CoreBlock` 의 전체 본문 블록을, 매 턴은 gist 만 싣는다. 매 턴에 전체 본문을 실으면 턴 예산이 무너진다.
- 핀·캐시 읽기는 `core/cacheManager` 를 경유한다.
- 인덱서 내부 상태(stale-node·freshness)를 컨텍스트에 노출하지 않는다.
- 섹션 텍스트는 `resolveSectionText` 가 문자열/배열을 `|` 로 join 해 정규화한다. 배열 원형은 `companionNormalize` 가 보존하고 join 은 이 렌더 시점의 일이다.

## API Contracts

- `buildTurnContext(...)` — 압축 XML turn 컨텍스트 조립 진입점.
- `buildL1CoreBlock(...)` — SessionStart 1회용 `<l1-core-full>` 전체 본문 블록.
- `buildSessionIdentityBlock(...)` · `buildCompanionIdentityTag(...)` — 세션·동반자 identity 블록.
- `renderIdentitySection(...)` · `selectSections(...)` · `resolveSectionText(value)` — identity 섹션 렌더와 섹션 텍스트 정규화.
- `readIndexMetadata(...)` · `readCachedNodesArray(...)` · `readCompanionIdentity(...)` · `readL1NodesSummary(...)` — 캐시·소스 read.
- `compressMarkdownBody(...)` · `capGist(...)` · `extractGist(...)` — 직렬화·압축.

## Acceptance Criteria

### AC-no-hook-envelope — 훅 envelope 부재

- 반환값이 문자열·데이터이고 훅 응답 형태를 만들지 않는다.

### AC-l1-full-vs-gist — L1 전체 대 gist

- SessionStart 경로만 전체 L1 본문을 싣고 매 턴 경로는 gist 만 싣는다.

### AC-no-indexer-state-leak — 인덱서 상태 비노출

- 컨텍스트 출력에 stale-node·freshness 표시가 없다.

## Boundary Exemptions

### `build.ts` — Hook bundle direct import

- **Consumers**: `**/src/hooks/**`
- **Direct import**: `allowed`
- **Reason**: 훅은 esbuild 번들로 배송되고 이벤트별 크기 가드를 받는다. 배럴을 거치면 read·압축·렌더 전체가 번들에 끌려 들어와 가드를 넘긴다 — 배럴 경유는 선택지가 아니라 빌드 실패다.

### `buildL1CoreBlock.ts` — Hook bundle direct import

- **Consumers**: `**/src/hooks/**`
- **Direct import**: `allowed`
- **Reason**: 위와 같다. SessionStart 만 이 블록을 쓰고 매 턴 경로는 쓰지 않으므로, 배럴로 묶으면 매 턴 번들에도 전체 본문 조립이 실린다.

### `buildSessionIdentityBlock.ts` — Hook bundle direct import

- **Consumers**: `**/src/hooks/**`
- **Direct import**: `allowed`
- **Reason**: 위와 같다.

### `readCachedNodesArray.ts` — Hook bundle direct import

- **Consumers**: `**/src/hooks/**`
- **Direct import**: `allowed`
- **Reason**: 위와 같다.

### `readCompanionIdentity.ts` — Hook bundle direct import

- **Consumers**: `**/src/hooks/**`
- **Direct import**: `allowed`
- **Reason**: 위와 같다.

### `readIndexMetadata.ts` — Hook bundle direct import

- **Consumers**: `**/src/hooks/**`
- **Direct import**: `allowed`
- **Reason**: 위와 같다.

### `renderIdentitySection.ts` — Hook bundle direct import

- **Consumers**: `**/src/hooks/**`
- **Direct import**: `allowed`
- **Reason**: 위와 같다. `resolveSectionText` 는 배럴에도 이름이 있지만(비-훅 소비자용) 훅은 같은 이유로 concrete 경로를 쓴다.

## Last Updated

2026-07-30 — L1 전체/gist 계약과 훅 직접 import 면책 7건을 문서화했다.
