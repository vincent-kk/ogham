# kgSearch — Contract

## Requirements

- `kg_search` 는 시드(경로 또는 키워드)에서 Spreading Activation 으로 관련 문서를 찾아 **참조 메타**를 돌려준다. 쿼리 엔진(`search/queryEngine`)의 `ActivationResult` 는 불변이고, 노드 메타 매핑은 이 핸들러의 몫이다.
- 기본 응답 항목은 `{ path, score, hops, title, tags, gist? }` 다. hop 체인은 `include_trace: true` 일 때만 `trace` 로, 본문 전문은 `include_content: true` 일 때만 `content` 로 싣는다 — 응답은 LLM 컨텍스트로 들어가므로 기본형은 가볍게 유지한다.
- seed 해석 상태는 응답 `seedResolution` 이 항상 보고한다 — `resolved` 는 seed 원문→어휘 매칭 노드 수(시드 budget 캡 이전), `unresolved` 는 어떤 노드에도 매칭되지 않은 원문(입력 순서·중복 제거, 미해석 존재 시에만 키 존재). `results` 는 해석된 seed 만 반영하며 내용·점수·순서는 불변이다.
- `include_content` 의 본문 읽기는 `vaultRoot` 파라미터로 위임받아 `core/vaultScanner.readVaultFile` 로 수행한다. 파일 부재·읽기 실패 문서는 오류 대신 `content` 를 생략한다.
- `sub_layer` 필터는 SA 이후(post-filter), `layer_filter`·`since`/`until` 은 쿼리 엔진 옵션으로 전달한다.
- `graph` 가 null 이면 재색인 안내를 담은 `{ error }` 를 돌려준다.

## API Contracts

- `handleKgSearch(graph: KnowledgeGraph | null, input: KgSearchInput, vaultRoot?: string): Promise<KgSearchResult | { error: string }>`
- `KgSearchInput` — `seed`(필수) · `max_results`(기본 10) · `decay`(0.7) · `threshold`(0.1) · `max_hops`(5) · `since`/`until` · `layer_filter` · `sub_layer` · `include_trace`(기본 false) · `include_content`(기본 false).
- `KgSearchResult` — `results: KgSearchResultItem[]`(점수 내림차순) · `durationMs` · `exploredNodes` · `seedResolution`(항상). 항목·`SeedResolution` 형태의 정본은 `types/mcpKg.ts`.

## Acceptance Criteria

### AC-reference-meta-default — 기본 참조 메타

- 옵션 없는 호출의 결과 항목은 `path`·`title`·`tags`(·`gist`)를 담고 `trace`·`content`·`nodeId` 키를 갖지 않는다.

### AC-trace-optional — hop 체인 옵션화

- `include_trace: true` 일 때만 시드→노드 경로가 `trace` 로 실린다.

### AC-content-optional — 본문 옵션화

- `include_content: true` 이고 vault 에 파일이 있으면 `content` 에 원문 전문이 실리고, 파일이 없는 노드는 `content` 없이 반환된다.

### AC-seed-resolution-always — seed 해석 상시 가시화

- 전부/일부/전무 해석의 3-상태가 응답만으로 구분된다: 전부 해석이면 `seedResolution.resolved` 만(`unresolved` 키 부재), 일부 실패면 생존 seed 계수 + 미해석 원문 목록, 전무면 빈 `resolved` + 전체 `unresolved`(이때 `exploredNodes` 는 0). 동일 인자 재호출(캐시 적중)에도 유지된다.

## History

- 2026-08-05 — 참조 메타 기본 응답과 trace/content 옵션 계약을 문서화했다 (cross-review FIX-011).

## Last Updated

2026-08-10 — seed 해석 가시화: `seedResolution`(resolved 계수 + unresolved 목록) 상시 보고 계약을 추가했다 (seed-resolution 개발요청서 + 사용자 리뷰 확정).
