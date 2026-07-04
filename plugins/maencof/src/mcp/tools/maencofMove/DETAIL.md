# maencofMove — DETAIL

## Requirements

- `move`는 vault 문서를 대상 레이어 디렉토리로 이동한다. WAL 순서(대상 쓰기 → 소스 삭제)로 원자성을 보장한다.
- 소스가 L1(Core)이면 이동을 거부한다.
- frontmatter의 `layer`/`updated`를 갱신하고, `target_sub_layer`가 없으면 `sub_layer` 필드를 제거한다.
- 소스가 L5-Buffer 문서이면 buffer 전용 필드(`buffer_type`, `promotion_target`)를 자동 제거한다(승격 시 잔재 방지).
- `target_sub_layer`는 L3(relational/structural/topical)·L5(buffer/boundary)에서만 디렉토리 경로에 반영된다.
- `target_subdirectory`는 대상 레이어(서브레이어가 있으면 그 아래) 디렉토리 하위의 중첩 디렉토리를 지정한다.
  - 세그먼트별로 `sanitizeSegment`(core/filenameSlug)로 정규화한다.
  - `..` 세그먼트는 traversal로 거부한다.
  - 깊이는 `MAX_FILENAME_SUBDIR_DEPTH`(constants/filename)를 초과할 수 없다.
- 같은 레이어로의 이동은 `target_sub_layer` 또는 `target_subdirectory`가 지정된 경우에만 허용한다(레이어 내 재배치).
- 소스와 대상 경로 모두 `resolveWithinVault`(core/pathGuard)로 vault 내부 봉쇄를 검증한다.
- 쓰기 직전 갱신된 frontmatter를 `validateFrontmatter`로 검증한다(read-path와 동일 스키마).

## API Contracts

### Input (`MaencofMoveInput`)

| Field                 | Type      | Notes                                              |
| --------------------- | --------- | -------------------------------------------------- |
| `path`                | string    | 소스 문서 vault 상대 경로                          |
| `target_layer`        | 1-5       | 목표 레이어                                        |
| `reason`              | string?   | 전이 사유 (응답 warnings에 echo)                   |
| `confidence`          | number?   | L3→L2 전이 신뢰도 (응답 warnings에 echo)           |
| `target_sub_layer`    | SubLayer? | L3/L5에서만 경로 반영                              |
| `target_subdirectory` | string?   | 레이어/서브레이어 아래 중첩 디렉토리 (최대 깊이 2) |

### Result

- 성공: `{ success: true, path: <새 상대 경로>, message, warnings? }`
- 실패 사유: 소스 없음 · L1 소스 · 잘못된 target_layer · 동일 레이어 무의미 이동 · 대상 경로 중복 · traversal/깊이 초과 · frontmatter 검증 실패 · vault 봉쇄 위반

### 파일명 유지 규칙

이동 시 파일명은 `basename(path)`을 유지한다. 소스의 중첩 디렉토리는 보존되지 않으며,
대상 배치는 `target_sub_layer`/`target_subdirectory` 조합으로만 결정된다.
