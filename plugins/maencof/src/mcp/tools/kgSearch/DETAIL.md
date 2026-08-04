# kgSearch — Contract

## Requirements

- `kg_search` 는 시드(경로 또는 키워드)에서 Spreading Activation 으로 관련 문서를 찾아 **참조 메타**를 돌려준다. 쿼리 엔진(`search/queryEngine`)의 `ActivationResult` 는 불변이고, 노드 메타 매핑은 이 핸들러의 몫이다.
- 기본 응답 항목은 `{ path, score, hops, title, tags, gist? }` 다. hop 체인은 `include_trace: true` 일 때만 `trace` 로, 본문 전문은 `include_content: true` 일 때만 `content` 로 싣는다 — 응답은 LLM 컨텍스트로 들어가므로 기본형은 가볍게 유지한다.
- `include_content` 의 본문 읽기는 `vaultRoot` 파라미터로 위임받아 `core/vaultScanner.readVaultFile` 로 수행한다. 파일 부재·읽기 실패 문서는 오류 대신 `content` 를 생략한다.
- `sub_layer` 필터는 SA 이후(post-filter), `layer_filter`·`since`/`until` 은 쿼리 엔진 옵션으로 전달한다.
- `graph` 가 null 이면 재색인 안내를 담은 `{ error }` 를 돌려준다.

## API Contracts

- `handleKgSearch(graph: KnowledgeGraph | null, input: KgSearchInput, vaultRoot?: string): Promise<KgSearchResult | { error: string }>`
- `KgSearchInput` — `seed`(필수) · `max_results`(기본 10) · `decay`(0.7) · `threshold`(0.1) · `max_hops`(5) · `since`/`until` · `layer_filter` · `sub_layer` · `include_trace`(기본 false) · `include_content`(기본 false).
- `KgSearchResult` — `results: KgSearchResultItem[]`(점수 내림차순) · `durationMs` · `exploredNodes`. 항목 형태의 정본은 `types/mcpKg.ts` 의 `KgSearchResultItem`.

## Acceptance Criteria

### AC-reference-meta-default — 기본 참조 메타

- 옵션 없는 호출의 결과 항목은 `path`·`title`·`tags`(·`gist`)를 담고 `trace`·`content`·`nodeId` 키를 갖지 않는다.

### AC-trace-optional — hop 체인 옵션화

- `include_trace: true` 일 때만 시드→노드 경로가 `trace` 로 실린다.

### AC-content-optional — 본문 옵션화

- `include_content: true` 이고 vault 에 파일이 있으면 `content` 에 원문 전문이 실리고, 파일이 없는 노드는 `content` 없이 반환된다.

## Last Updated

2026-08-05 — 참조 메타 기본 응답과 trace/content 옵션 계약을 문서화했다 (cross-review FIX-011).
