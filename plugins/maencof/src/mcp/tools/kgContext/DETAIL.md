# kgContext — Contract

## Requirements

- `kg_context` 는 쿼리로 후보를 고르고(`helpers/selectContextCandidates`, 상한 20 — 후보와 함께 query 파생 단어별 매칭 계수 `wordSeedCounts` 를 돌려준다) 토큰 예산 안에서 컨텍스트를 조립한다. 조립은 `search/contextAssembler.assembleContext` 에 위임한다.
- 두 모드를 갖는다: 기본(content) 모드는 조립 markdown(`context`)을, `include_content: false` 는 조립 없이 선택 문서 목록(`documents: { path, title, score }[]`)만 돌려준다 — 파일을 직접 읽을 수 있는 호출자가 선별 조회하는 경로다.
- `include_full: true` 면 상위 최대 3개 문서의 쿼리-매칭 스니펫(`extractBestSnippet`)을 덧붙인다. 스니펫 문자 상한은 잔여 예산(`token_budget` − 목록 markdown 추정치)에 연동해 300~1200자로 클램프하고, 잔여 예산이 0 이하면 스니펫 단계를 건너뛴다. 스니펫도 예산의 일부다 — `estimateTokens` 합계가 `token_budget` 을 넘으면 뒤 스니펫부터 덜어내고, `estimatedTokens` 는 스니펫 포함 최종 컨텍스트 기준으로 보고한다.
- `layer_filter`·`sub_layer`·`scope` 는 예산 소비 전에 후보 선정 단계에서 적용된다.
- seed 해석 상태는 두 모드 모두에서 응답 `seedResolution` 이 항상 보고한다 — 대상은 query 파생 **단어**뿐이고 인접 2-gram phrase 파생은 resolved·unresolved 어느 쪽에도 싣지 않는다(투기 파생). `resolved` 는 단어→어휘 매칭 노드 수, `unresolved` 는 미해석 단어 원문(미해석 존재 시에만 키 존재).
- `graph` 가 null 이면 재색인 안내를 담은 `{ error }` 를 돌려준다.

## API Contracts

- `handleKgContext(graph: KnowledgeGraph | null, input: KgContextInput, vaultRoot?: string): Promise<KgContextResult | { error: string }>`
- `KgContextInput` — `query`(필수) · `token_budget`(기본 2000) · `include_full`(기본 false) · `since`/`until` · `layer_filter` · `sub_layer` · `scope` · `include_content`(기본 true).
- `KgContextResult` — content 모드: `{ context, documentCount, estimatedTokens, truncatedCount, seedResolution }` / paths 모드: `{ documents, documentCount, seedResolution }`. 형태의 정본은 `types/mcpKg.ts`.

## Acceptance Criteria

### AC-paths-mode — 경로-만 모드

- `include_content: false` 응답은 `context` 없이 `documents` 목록을 담고, `documentCount` 는 그 길이와 같다.

### AC-snippet-budget — 스니펫 예산 계상

- `include_full` 스니펫을 붙인 최종 `context` 의 `estimateTokens` 추정치가 `token_budget` 을 넘지 않고, `estimatedTokens` 가 그 값을 보고한다.

### AC-prefilter — 선정 전 필터

- `layer_filter` 로 제외된 레이어 문서는 예산을 소비하지 않고 `context` 에도 나타나지 않는다.

### AC-snippet-sizing — 잔여 예산 연동

- 잔여 예산이 넉넉하면 스니펫이 종전 고정 300자를 넘어 자라고(상한 1200자), 잔여 예산이 0 이하면 `include_full` 이어도 스니펫이 붙지 않는다.

### AC-seed-resolution-always — 단어 해석 상시 가시화

- content·paths 두 모드 모두 `seedResolution` 을 담는다. query 파생 단어 중 미해석분만 `unresolved` 에 실리고, 인접 2-gram phrase 파생은 resolved·unresolved 어디에도 나타나지 않는다.

## History

- 2026-08-05 — include_full 스니펫 상한을 잔여 예산 연동(300~1200자 클램프)으로 바꾸고, 잔여 예산 소진 시 스니펫 생략을 계약에 추가했다.
- 2026-08-05 — content/paths 모드와 include_full 스니펫 예산 계상 계약을 문서화했다 (cross-review FIX-012).

## Last Updated

2026-08-10 — seed 해석 가시화: 단어 단위 `seedResolution` 상시 보고와 `selectContextCandidates` 의 `wordSeedCounts` 반환 계약을 추가했다 (seed-resolution 개발요청서 + 사용자 리뷰 확정).
