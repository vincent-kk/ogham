# maencofUpdate — DETAIL

## Requirements

- `update` 는 기존 문서의 frontmatter 와 본문을 수정한다. 경로는 `resolveWithinVault` 로 vault 내부 봉쇄를 검증한다.
- L1 문서 수정은 3중 게이트를 모두 통과해야 한다 — 구조화된 `change_reason`, 20자 이상 `justification`, `confirm_l1: true`.
- L1 문서의 `layer` 필드는 `update` 로 바꿀 수 없고, L1 에서는 `frontmatter.unset` 자체를 쓸 수 없다(구조화된 amendment 경로를 쓴다).
- `frontmatter.unset` 은 모든 레이어에서 `created` · `updated` · `layer` · `tags` 를 거부한다 — 데이터 무결성 핵심 필드다.
- 쓰기 직전 `validateFrontmatter` 게이트를 통과해야 한다. 손상된 frontmatter 의 복구 경로는 `frontmatter.unset` 이다.
- 패치 가능한 frontmatter 표면은 `FrontmatterSchema` 의 전 필드에서 제외 목록을 뺀 전부다. 제외와 사유: `created`·`updated`(자동 관리 — updated 는 매 update 자동 갱신), `accessed_count`(세션 참조 카운터, 자동), `archived`·`archive_path`(archiveExpired 훅이 소유하는 아카이브 불변식), `person`(중첩 객체 — 라인 단위 패처가 표현하지 못한다; 쓰기 경로가 필요해지면 별도 설계). 필드별 값 검증은 이 도구가 재기술하지 않는다 — 쓰기 직전 `validateFrontmatter` 게이트가 레이어·서브레이어 배타 규칙까지 판정한다.
- 직렬화 규칙은 FM_FIELD_SERIALIZERS가 단일 소유하며 타입의 필드 추가가 직렬화기 누락으로 이어지지 않도록 컴파일 단계에서 강제한다.
- 대상 문서의 노드 구성(`buildKnowledgeNode`)은 `allowNonLayerPath` 옵트아웃을 쓴다 — 레이어 디렉토리 밖 경로 문서도 update 대상이며, 그래프 편입 자격은 색인 경로의 기본 게이트(`isLayerDirPath`) 소관이다.

## API Contracts

frontmatter의 쓰기 가능 표면과 deduplicateContent에 전달하는 AUTO_GENERATED_FM_KEYS는 다른 목록이다. 후자를 쓰기 권한으로 해석하지 않는다.

새 metadata 편집도 별도 도구를 늘리지 않고 update에 통합한다. L1 3중 게이트·보호 unset·쓰기 직전 검증을 여러 쓰기 경로에 복제하면 보호가 갈라진다. 제외 필드의 이유는 Requirements가 정본이며 직렬화 규칙과 등록 스키마의 키 동기는 테스트가 고정한다.

## Acceptance Criteria

### AC-document-budget — Readable document size

- Measure the final complete Markdown using core/documentBudget. Above 100 physical lines or 6,000 body Unicode code points, return document_size_exceeded with measurements and rewrite/split guidance.
- Preserve existing warnings and full content; never truncate or reject solely for size. Metadata-only updates and legacy reads also report excessive size.

### AC-frontmatter-surface-complete — 패치 표면 완전성

- `FrontmatterSchema` 의 모든 필드는 update 로 패치 가능하거나, Requirements 의 제외 목록에 사유와 함께 올라 있다. 어느 쪽도 아닌 필드는 계약 위반이다.

### AC-schema-serializer-sync — 스키마·직렬화기 동기

- 등록 스키마(`updateFrontmatterInputSchema`)의 키 집합은 `FM_FIELD_SERIALIZERS` 의 키 ∪ {`hub`, `unset`} 과 정확히 일치한다.

## Last Updated

L1 게이트·보호 unset, 패치 가능 필드의 제외 사유 또는 등록 스키마·직렬화기 동기 계약이 바뀔 때 갱신한다.
