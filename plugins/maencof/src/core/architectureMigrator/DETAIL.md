# architectureMigrator — DETAIL

## Requirements

- 벌트 아키텍처를 `EXPECTED_ARCHITECTURE_VERSION`(현재 `3.0.0`)으로 올린다. 목표 버전의 정본은 `constants/architecture.ts` 다.
- `planMigration` 은 부수효과가 없다 — 파일시스템을 읽어 연산 목록만 만든다. 실제 변경은 `executeMigration` 이 맡는다.
- 실행은 WAL(Write-Ahead Log) 기반이다. 실패하면 `rollbackMigration` 이 기록된 연산을 역순으로 되돌린다.
- L3 문서는 `classifyL3Document` 가 frontmatter 와 태그로 서브레이어를 정하고, `L3_SUBDIR` 아래로 이동시킨 뒤 `sub_layer` 를 그 값으로 갱신한다.
- L5 는 평면 구조다. 만들 서브디렉토리가 없고, v2 의 `05_Context/buffer/` 문서는 `05_Context/` 루트로 올리면서 `sub_layer` 를 제거한다.
- v2 의 `05_Context/boundary/` 문서는 L3-structural 로 옮기고 hub 속성으로 바꾼다 — 허브는 레이어가 아니라 역할이므로 자리를 옮기고 속성만 남긴다. `boundary_type` 은 `hub_kind` 로 매핑하며 알 수 없는 값은 `cross_domain` 으로 수렴한다.
- `hub: true` 의 필수 짝인 `purpose` 없이 이관하지 않는다 — 없이 옮기면 즉시 frontmatter 검증에 걸린다.
- 비워진 레거시 디렉토리(`buffer` · `boundary`)는 `remove_dir` 로 정리한다.

## API Contracts

### Entry point (`index.ts`)

`checkArchitectureVersion` · `classifyL3Document` · `planMigration` · `executeMigration` · `rollbackMigration`

### `MigrationOp` 종류

| Type                 | 의미                                           |
| -------------------- | ---------------------------------------------- |
| `create_dir`         | L3 서브레이어 디렉토리 생성                    |
| `move_file`          | 문서 이동                                      |
| `update_frontmatter` | 단일 필드 갱신 (`newValue: undefined` 는 제거) |
| `remove_dir`         | 비워진 레거시 L5 서브디렉토리 제거             |
| `update_version`     | `.maencof-meta/version.json` 버전 갱신         |

### 계획 순서

1. L3 서브디렉토리 생성 → 2. L3 문서 분류·이동 → 3. L5 평면화와 boundary 이관, 레거시 디렉토리 제거 → 4. 버전 갱신.

`MigrationPlan.summary` 는 `dirsToCreate` · `filesToMove` · `frontmatterUpdates` 세 개수를 보고한다.

## Acceptance Criteria

### AC-plan-has-no-side-effects — 계획의 무부수효과

- `planMigration` 호출은 파일을 만들거나 옮기거나 지우지 않고, 연산 목록과 요약만 돌려준다.

### AC-l5-flattened — L5 평면화

- `05_Context/buffer/` 의 문서는 `05_Context/` 루트로 이동하고 그 `sub_layer` 필드는 제거된다. L5 에 대해서는 어떤 `create_dir` 도 계획되지 않는다.

### AC-boundary-becomes-hub — boundary 의 hub 전환

- `05_Context/boundary/` 문서는 L3-structural 로 이동하고 `boundary_type` 이 `hub_kind` 로 매핑되며, `purpose` 없이 이관되지 않는다. 알 수 없는 `boundary_type` 은 `cross_domain` 이 된다.

### AC-legacy-dirs-removed — 레거시 디렉토리 정리

- 이관이 끝난 `buffer` · `boundary` 디렉토리에 대해 `remove_dir` 연산이 계획된다.

### AC-rollback-restores — 롤백 복원

- 실행 중 실패하면 WAL 에 기록된 연산이 역순으로 되돌아가 벌트가 실행 전 상태로 남는다.

### AC-version-last — 버전 갱신 최후

- `update_version` 이 연산 목록의 마지막에 온다 — 구조 이관이 모두 끝난 뒤에만 버전이 올라간다.

## History

- 2026-08-04 — 목표 버전이 v3 가 되면서 L5 가 서브레이어를 버리고 평면 구조가 되었다. `buffer/` 는 평면화, `boundary/` 는 L3-structural 의 hub 속성으로 이관하고, 비워진 레거시 디렉토리를 지우기 위해 `remove_dir` 연산을 새로 두었다.

## Last Updated

2026-08-04 — v3 마이그레이션 규약(L5 평면화·boundary 이관·레거시 디렉토리 제거)을 문서로 만들었다.
