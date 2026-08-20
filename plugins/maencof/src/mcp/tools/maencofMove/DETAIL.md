# maencofMove — DETAIL

## Requirements

- `move`는 vault 문서를 대상 레이어 디렉토리로 이동한다. WAL 순서(대상 쓰기 → 소스 삭제)로 원자성을 보장한다.
- 소스가 L1(Core)이면 이동을 거부한다.
- frontmatter의 `layer`/`updated`를 갱신하고, `target_sub_layer`가 없으면 `sub_layer` 필드를 제거한다.
- 소스가 L5 문서이고 대상이 L5 가 아니면 L5 전용 필드(`buffer_type` · `promotion_target` · `source_context`)를 자동 제거한다(승격 시 잔재 방지).
- `target_sub_layer`는 L3(relational/structural/topical)에서만 디렉토리 경로에 반영된다. L5 는 평면 구조라 서브레이어가 없다.
- `target_subdirectory`는 대상 레이어(서브레이어가 있으면 그 아래) 디렉토리 하위의 중첩 디렉토리를 지정한다. 입력은 검증한다 — 파일명 힌트와 달리 디렉토리 세그먼트는 이미 존재하는 실명과 맞아야 하므로 정규화(sanitizeSegment)를 적용하지 않는다. 세그먼트는 원형 그대로 대상 경로에 들어간다.
  - 세그먼트는 `[A-Za-z0-9가-힣._-]+` 만 허용하며, 벗어나면 세그먼트 원문을 담은 에러로 거부한다.
  - `.` 로 시작하는 세그먼트(`.maencof` 등 런타임 디렉토리 오염 경로)는 거부한다.
  - 첫 세그먼트가 레이어 디렉토리(`01_Core`~`05_Context`) 또는 서고(`99_Archive`)면 대소문자 무관 거부한다 — 서고 거부 메시지는 `mv` + frontmatter 편집 안내를 담는다.
  - `..` 세그먼트는 traversal로 거부한다.
  - 깊이는 `MAX_FILENAME_SUBDIR_DEPTH`(constants/filename)를 초과할 수 없다.
  - 대상 레이어가 `FLAT_LAYERS`(constants/architecture; L1·L5)에 속하면 지정 자체를 거부한다 — 평면 레이어는 중첩 디렉토리를 갖지 않는다.
- 같은 레이어로의 이동은 `target_sub_layer` 또는 `target_subdirectory`가 지정된 경우에만 허용한다(레이어 내 재배치).
- 소스와 대상 경로 모두 `resolveWithinVault`(core/pathGuard)로 vault 내부 봉쇄를 검증한다.
- 쓰기 직전 갱신된 frontmatter를 `validateFrontmatter`로 검증한다(read-path와 동일 스키마).
- 소스 문서의 노드 구성(`buildKnowledgeNode`)은 `allowNonLayerPath` 옵트아웃을 쓴다 — 레이어 디렉토리 밖 경로 문서도 이동 소스가 될 수 있으며, 그래프 편입 자격은 색인 경로의 기본 게이트(`isLayerDirPath`) 소관이다.

## API Contracts

### Input (`MaencofMoveInput`)

| Field                 | Type      | Notes                                              |
| --------------------- | --------- | -------------------------------------------------- |
| `path`                | string    | 소스 문서 vault 상대 경로                          |
| `target_layer`        | 1-5       | 목표 레이어                                        |
| `reason`              | string?   | 전이 사유 (기록·에코 없음 — 호출자 문맥용)         |
| `confidence`          | number?   | L3→L2 전이 신뢰도 (기록·에코 없음)                 |
| `target_sub_layer`    | SubLayer? | L3에서만 경로 반영                                 |
| `target_subdirectory` | string?   | 레이어/서브레이어 아래 중첩 디렉토리 (최대 깊이 2) |

### Result

- 성공: `{ success: true, path: <새 상대 경로>, message, warnings? }`
- 실패 사유: 소스 없음 · L1 소스 · 잘못된 target_layer · 동일 레이어 무의미 이동 · 대상 경로 중복 · 서브디렉토리 검증 실패(traversal · 깊이 초과 · 허용 밖 문자 · `.` 선행 세그먼트 · 레이어/서고 예약 루트) · frontmatter 검증 실패 · vault 봉쇄 위반

### 파일명 유지 규칙

이동 시 파일명은 `basename(path)`을 유지한다. 소스의 중첩 디렉토리는 보존되지 않으며, 대상 배치는 `target_sub_layer`/`target_subdirectory` 조합으로만 결정된다.

## Acceptance Criteria

### AC-wal-order — 원자성 쓰기 순서

- 이동은 대상 쓰기 성공 이후에만 소스를 삭제한다. 대상 쓰기가 실패하면 소스는 그대로 남는다.

### AC-l1-source-rejected — L1 소스 이동 거부

- 소스가 L1(Core) 문서면 이동이 거부되고 어떤 파일도 생성·삭제되지 않는다.

### AC-l5-fields-dropped-on-promotion — 승격 시 L5 전용 필드 제거

- L5 문서를 L5 가 아닌 레이어로 옮기면 `buffer_type` · `promotion_target` · `source_context` 가 대상 frontmatter 에 남지 않는다.

### AC-sub-layer-cleared-without-target — 서브레이어 잔재 제거

- `target_sub_layer` 없이 이동하면 대상 frontmatter 에 `sub_layer` 필드가 남지 않는다.

### AC-subdirectory-guarded — 중첩 디렉토리 방어

- `target_subdirectory` 의 `..` 세그먼트는 거부되고, 깊이가 `MAX_FILENAME_SUBDIR_DEPTH` 를 넘으면 이동이 실패한다.

### AC-subdirectory-verbatim — 세그먼트 원형 보존

- `_`·대문자·한글을 포함한 세그먼트가 변형 없이 대상 경로에 보존된다.

### AC-subdirectory-charset — 허용 밖 문자 거부

- `[A-Za-z0-9가-힣._-]+` 를 벗어난 세그먼트(공백·`!` 등)는 세그먼트 원문을 담은 에러로 거부된다.

### AC-reserved-root-rejected — 레이어·서고 루트 거부

- 첫 세그먼트가 레이어 디렉토리(`01_Core`~`05_Context`) 또는 서고(`99_Archive`)면 대소문자 무관 거부하고, 서고는 `mv` + frontmatter 편집 안내를 담는다.

### AC-hidden-segment-rejected — `.` 선행 세그먼트 거부

- `.` 로 시작하는 세그먼트(`.maencof` 등 런타임 디렉토리 오염 경로)는 거부된다.

### AC-flat-target-rejected — 평면 대상 레이어 서브디렉토리 거부

- `target_layer` 가 `FLAT_LAYERS`(1·5)에 속하면 `target_subdirectory` 지정 시 이동이 실패하고 소스가 보존된다.

### AC-vault-containment — vault 봉쇄

- 소스와 대상 경로가 모두 `resolveWithinVault` 를 통과해야 하며, vault 밖으로 해석되는 경로는 이동을 실패시킨다.

### AC-validated-before-write — 쓰기 직전 검증

- 갱신된 frontmatter 가 `validateFrontmatter` 를 통과하지 못하면 대상 파일을 쓰지 않는다.

## History

- 2026-08-21 — `target_subdirectory` 를 정규화(sanitizeSegment)에서 검증·원형 보존으로 전환했다. 디렉토리 세그먼트는 이미 존재하는 실명과 맞아야 하는데 슬러그화가 조용한 근사 경로를 만들던 불일치의 해소다 ([이슈](../../../../docs/issues/2026-08-21-move-target-subdirectory-slug.md)).
- 2026-08-04 — 평면 레이어(L1·L5) 대상의 `target_subdirectory` 를 거부하도록 계약을 좁혔다. 설계가 평면으로 선언한 레이어에 이동 경로만 중첩을 허용하던 불일치의 해소이며, 정본은 `FLAT_LAYERS` 다.

## Last Updated

2026-08-21 — `target_subdirectory` 검증 전환 계약(원형 보존 · 문자 검증 · 레이어/서고 루트 거부)을 반영했다.
