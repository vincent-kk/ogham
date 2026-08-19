# maencofUpdate — DETAIL

## Requirements

- `update` 는 기존 문서의 frontmatter 와 본문을 수정한다. 경로는 `resolveWithinVault` 로 vault 내부 봉쇄를 검증한다.
- L1 문서 수정은 3중 게이트를 모두 통과해야 한다 — 구조화된 `change_reason`, 20자 이상 `justification`, `confirm_l1: true`.
- L1 문서의 `layer` 필드는 `update` 로 바꿀 수 없고, L1 에서는 `frontmatter.unset` 자체를 쓸 수 없다(구조화된 amendment 경로를 쓴다).
- `frontmatter.unset` 은 모든 레이어에서 `created` · `updated` · `layer` · `tags` 를 거부한다 — 데이터 무결성 핵심 필드다.
- unset 은 set 보다 먼저 처리한다. 같은 키를 set 과 unset 에 함께 주면 set 이 이긴다.
- 쓰기 직전 `validateFrontmatter` 게이트를 통과해야 한다. 손상된 frontmatter 의 복구 경로는 `frontmatter.unset` 이다.
- 패치 가능한 frontmatter 표면은 `FrontmatterSchema` 의 전 필드에서 제외 목록을 뺀 전부다. 제외와 사유: `created`·`updated`(자동 관리 — updated 는 매 update 자동 갱신), `accessed_count`(세션 참조 카운터, 자동), `archived`·`archive_path`(archiveExpired 훅이 소유하는 아카이브 불변식), `person`(중첩 객체 — 라인 단위 패처가 표현하지 못한다; 쓰기 경로가 필요해지면 별도 설계). 필드별 값 검증은 이 도구가 재기술하지 않는다 — 쓰기 직전 `validateFrontmatter` 게이트가 레이어·서브레이어 배타 규칙까지 판정한다.
- 직렬화 규칙은 `FM_FIELD_SERIALIZERS` 테이블 하나가 소유한다: 자유 문자열은 `quoteYamlValue` 인용, 문자열 배열은 원소별 인용 후 `[a, b]` 인라인, 숫자·enum·날짜는 비인용. 타입에 필드를 추가하면 테이블이 컴파일 단계에서 직렬화기를 강제한다.
- 대상 문서의 노드 구성(`buildKnowledgeNode`)은 `allowNonLayerPath` 옵트아웃을 쓴다 — 레이어 디렉토리 밖 경로 문서도 update 대상이며, 그래프 편입 자격은 색인 경로의 기본 게이트(`isLayerDirPath`) 소관이다.
- 본문 수정은 `deduplicateContent` 를 거친다.

## API Contracts

### Frontmatter 패치 (`MaencofUpdateFrontmatter`)

| 연산                       | 동작                                                                                |
| -------------------------- | ----------------------------------------------------------------------------------- |
| `unset: string[]`          | 키 라인을 제거한다. 보호 필드는 거부, L1 은 연산 자체를 거부한다.                   |
| `hub: false` / `hub: true` | 키 제거 / `hub: true` 패치 — 유일한 값-조건 분기                                    |
| 자유 문자열 필드           | `quoteYamlValue` 인용 후 패치 (`title` · `purpose` · `source` · `domain` 등)        |
| 문자열 배열 필드           | 원소별 인용 후 `[a, b]` 인라인 (`tags` · `mentioned_persons` · `expertise_domains`) |
| 숫자·enum·날짜 필드        | 비인용 패치 (`layer` · `confidence` · `sub_layer` · `expires` · L3/L5 enum 류)      |

호출자가 쓸 수 없는 것은 created(불변)와 updated(자동 갱신)다. AUTO_GENERATED_FM_KEYS 는 본문 중복 제거(deduplicateContent)에 넘기는 키 목록이며 쓰기 권한 목록이 아니다.

### Result (`MaencofCrudResult`)

- 성공: `{ success: true, path, message }`
- 실패 사유: 파일 없음 · vault 봉쇄 위반 · L1 3중 게이트 미충족 · L1 layer 변경 시도 · L1 unset 시도 · 보호 필드 unset · frontmatter 검증 실패

## Acceptance Criteria

### AC-l1-triple-gate — L1 3중 게이트

- L1 문서 수정은 `change_reason` · 20자 이상 `justification` · `confirm_l1: true` 셋을 모두 갖추지 못하면 파일을 바꾸지 않는다.

### AC-l1-layer-immutable — L1 레이어 불변

- L1 문서의 `layer` 를 바꾸려는 호출은 거부된다.

### AC-protected-unset-blocked — 보호 필드 unset 차단

- `created` · `updated` · `layer` · `tags` 를 `frontmatter.unset` 에 넣은 호출은 어떤 레이어에서도 거부되고, 거부된 키 목록이 메시지에 들어간다.

### AC-unset-before-set — unset 선처리

- 같은 키가 set 과 unset 에 함께 오면 결과 frontmatter 에는 set 값이 남는다.

### AC-hub-false-removes-key — hub 해제의 키 제거

- `hub: false` 는 `hub` 를 `false` 로 쓰지 않고 키 자체를 제거한다.

### AC-validated-before-write — 쓰기 직전 검증

- 갱신된 frontmatter 가 `validateFrontmatter` 를 통과하지 못하면 파일을 쓰지 않고, 복구 수단으로 `frontmatter.unset` 을 안내한다.

### AC-frontmatter-surface-complete — 패치 표면 완전성

- `FrontmatterSchema` 의 모든 필드는 update 로 패치 가능하거나, Requirements 의 제외 목록에 사유와 함께 올라 있다. 어느 쪽도 아닌 필드는 계약 위반이다.

### AC-schema-serializer-sync — 스키마·직렬화기 동기

- 등록 스키마(`updateFrontmatterInputSchema`)의 키 집합은 `FM_FIELD_SERIALIZERS` 의 키 ∪ {`hub`, `unset`} 과 정확히 일치한다. spec `updateSchemaSurfaceSync.test.ts` 가 고정한다.

## History

- 2026-08-20 — frontmatter 패치 표면을 스키마 전 필드로 넓혔다. 그전에는 16개 편집 가능 필드(source · expires · domain 계열 · L3 서브레이어 확장 · L5 버퍼 필드)에 쓰기 경로가 없어 skills/remember 가 "no MCP write path" 를 명시하는 상태였고, 신규 도구 대신 update 통합을 택했다 — 게이트(L1 3중·보호 unset·쓰기 직전 검증)를 복제하지 않기 위해서다.
- 2026-08-04 — hub 3필드(`hub` · `hub_kind` · `purpose`) 패치·제거 분기가 추가되면서 도구의 frontmatter 계약이 넓어졌다. 이전에는 이 계약이 `mcp/server/registrations/DETAIL.md` 에만 기록되어 소유 fractal 밖에 있었다.

## Last Updated

2026-08-20 — frontmatter 패치 표면과 스키마·직렬화기 동기 계약을 현행화했다.
