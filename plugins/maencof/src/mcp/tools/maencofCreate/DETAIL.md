# maencofCreate — DETAIL

## Requirements

- `create` 는 새 지식 문서를 대상 레이어 디렉토리에 만든다. 레이어 디렉토리는 `LAYER_DIR`, L3 서브레이어 디렉토리는 `L3_SUBDIR` 가 정본이다.
- 서브레이어 디렉토리는 L3 에서만 경로에 반영된다. L5 는 평면 구조라 `buffer_type` 이 있어도 하위 디렉토리를 만들지 않는다.
- `subdirectory` 세그먼트는 `sanitizeSegment` 로 정규화하고, `..` 는 traversal 로 거부하며, 깊이는 `MAX_FILENAME_SUBDIR_DEPTH` 를 넘을 수 없다.
- 파일명이 주어지지 않으면 `title` → `tags` 순으로 슬러그를 만들고, 모두 비면 타임스탬프로 폴백한다.
- 최종 경로는 `resolveWithinVault` 로 vault 내부 봉쇄를 검증한다.
- 쓰기 직전 `validateFrontmatter` 로 frontmatter 객체를 검증한다 — read-path 와 같은 `FrontmatterSchema` 게이트다.
- L1 문서는 비어 있지 않은 `gist` 없이는 만들 수 없다.
- 본문은 `deduplicateContent` 를 거쳐 중복 블록을 줄인 뒤 기록한다.

## API Contracts

### Frontmatter 조립 (`inputToFrontmatterObject`)

항상 쓰는 필드는 `created` · `updated`(둘 다 오늘) · `tags` · `layer` 넷이다. 나머지는 입력에 있을 때만 실린다.

| Field                                                 | 조건                     | 비고                             |
| ----------------------------------------------------- | ------------------------ | -------------------------------- |
| `sub_layer`                                           | 입력에 있을 때           | 경로 반영은 L3 만                |
| `title` · `source` · `expires` · `gist`               | 입력에 있을 때           | —                                |
| `mentioned_persons`                                   | 비어 있지 않은 배열일 때 | 빈 배열은 싣지 않는다            |
| `buffer_type` · `promotion_target` · `source_context` | 입력에 있을 때           | L5 전용 — 스키마가 교차 검증한다 |
| `hub` · `hub_kind` · `purpose`                        | 입력에 있을 때           | hub 는 레이어 직교 속성          |

### Result (`MaencofCrudResult`)

- 성공: `{ success: true, path: <vault 상대 경로>, message }`
- 실패 사유: 잘못된 layer · 파일명 해석 실패 · traversal/깊이 초과 · vault 봉쇄 위반 · frontmatter 검증 실패 · L1 gist 누락 · 대상 경로 중복

## Acceptance Criteria

### AC-l3-only-sub-layer-dir — 서브레이어 디렉토리 한정

- `sub_layer` 가 경로에 반영되는 것은 `layer === 3` 일 때뿐이다. L5 문서는 `buffer_type` 을 가져도 레이어 디렉토리 루트에 생성된다.

### AC-validated-before-write — 쓰기 직전 검증

- 조립된 frontmatter 가 `validateFrontmatter` 를 통과하지 못하면 파일을 만들지 않고 검증 오류를 그대로 돌려준다.

### AC-l1-requires-gist — L1 한 줄 요약 강제

- `layer: 1` 호출에 비어 있지 않은 `gist` 가 없으면 문서가 생성되지 않는다.

### AC-subdirectory-guarded — 중첩 디렉토리 방어

- `subdirectory` 의 `..` 세그먼트는 거부되고, 깊이가 `MAX_FILENAME_SUBDIR_DEPTH` 를 넘으면 생성이 실패한다.

### AC-vault-containment — vault 봉쇄

- 해석된 절대 경로가 vault 밖이면 `resolveWithinVault` 가 막고 파일을 만들지 않는다.

### AC-empty-optionals-omitted — 빈 선택 필드 생략

- 입력에 없는 선택 필드와 빈 `mentioned_persons` 배열은 frontmatter 에 키로 남지 않는다.

## History

- 2026-08-04 — L5 재정의로 임시 수용소가 서브레이어를 버리면서, `buffer_type` · `promotion_target` · `source_context` 와 hub 3필드가 조립 대상에 들어오고 서브레이어 디렉토리 결정이 L3 단독 조건이 되었다.

## Last Updated

2026-08-04 — 도구 fractal 이 소유해야 할 create 출력 계약을 문서로 만들었다.
