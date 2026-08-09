# kgSuggestLinks — Contract

## Requirements

- `kg_suggest_links` 는 소스 태그(기존 문서 `path` 의 태그 + `tags` + `content_hint` 키워드 추출의 합집합)로 태그 Jaccard 후보를 고르고 SA 보강 점수를 더해 상위 N개 연결을 제안한다. 그래프가 없거나 소스 태그가 비면 빈 결과를 돌려준다.
- `candidates_explored` 는 Jaccard 필터를 통과한 후보 수다 — 0 은 소스 태그가 어떤 문서 태그와도 겹치지 않아 탐색이 시작되지 않았다는 신호다.
- `input.tags` 가 제공되면 응답 `seedResolution` 이 그 해석 상태를 보고한다 — `resolved` 는 입력 태그→해당 태그 보유 문서 수, `unresolved` 는 볼트 태그 어휘에 없는 입력 태그 원문(미해석 존재 시에만 키 존재). `path`·`content_hint` 파생 태그는 보고 대상이 아니다(경로 태그는 정의상 볼트에 있고, 추출 키워드는 투기 파생). `tags` 미제공이면 필드 자체가 없고, 그래프 부재/빈 인덱스 조기 반환에도 싣지 않는다.

## API Contracts

- `handleKgSuggestLinks(graph: KnowledgeGraph | null, input: KgSuggestLinksInput): KgSuggestLinksResult`
- `KgSuggestLinksInput` — `path?` · `tags?` · `content_hint?` · `max_suggestions`(기본 5) · `min_score`(기본 0.2).
- `KgSuggestLinksResult` — `suggestions: LinkSuggestion[]`(점수 내림차순, 상위 N) · `candidates_explored` · `duration_ms` · `seedResolution?`(`tags` 제공 시). 형태의 정본은 `types/mcpKg.ts`.

## Acceptance Criteria

### AC-tag-resolution-on-input — 입력 태그 해석 가시화

- `tags` 에 실존·부재 태그를 섞어 호출하면 `seedResolution.resolved` 가 실존 태그별 보유 문서 수를, `unresolved` 가 부재 태그 원문을 담는다. `tags` 없이(`path`/`content_hint` 만) 호출하면 `seedResolution` 키가 없다.

## Last Updated

2026-08-10 — 계약 문서 신설: 기존 2단계 추천 계약을 기록하고 `input.tags` 해석 가시화(`seedResolution`)와 `candidates_explored` 의 0 의미를 계약에 추가했다 (seed-resolution 개발요청서 + 사용자 리뷰 확정).
