# architectureMigrator — DETAIL

## Requirements

- 벌트 아키텍처를 `EXPECTED_ARCHITECTURE_VERSION`(현재 `3.0.0`)으로 올린다. 목표 버전의 정본은 `constants/architecture.ts` 다.
- `planMigration` 은 부수효과가 없다 — 파일시스템을 읽어 연산 목록만 만든다. 실제 변경은 `executeMigration` 이 맡는다.
- 실행은 WAL(Write-Ahead Log) 기반이다. 실패하면 `rollbackMigration` 이 기록된 연산을 역순으로 되돌린다.
- L5 는 평면 구조다. 만들 서브디렉토리가 없고, v2 의 `05_Context/buffer/` 문서는 `05_Context/` 루트로 올리면서 `sub_layer` 를 제거한다.
- v2 의 `05_Context/boundary/` 문서는 L3-structural 로 옮기고 hub 속성으로 바꾼다 — 허브는 레이어가 아니라 역할이므로 자리를 옮기고 속성만 남긴다. `boundary_type` 은 `hub_kind` 로 매핑하며 알 수 없는 값은 `cross_domain` 으로 수렴한다.
- `hub: true` 의 필수 짝인 `purpose` 없이 이관하지 않는다 — 없이 옮기면 즉시 frontmatter 검증에 걸린다.

## API Contracts

버전 갱신은 구조 이관의 마지막이다 — 구조 변경이 끝나기 전에 새 버전으로 표시하지 않는다. 계획과 실행을 분리하고, 실패 시 WAL에 기록된 연산의 역순 복원을 보장한다.

## Acceptance Criteria

### AC-plan-has-no-side-effects — 계획의 무부수효과

- `planMigration` 호출은 파일을 만들거나 옮기거나 지우지 않고, 연산 목록과 요약만 돌려준다.

### AC-rollback-restores — 롤백 복원

- 실행 중 실패하면 WAL 에 기록된 연산이 역순으로 되돌아가 벌트가 실행 전 상태로 남는다.

### AC-version-last — 버전 갱신 최후

- `update_version` 이 연산 목록의 마지막에 온다 — 구조 이관이 모두 끝난 뒤에만 버전이 올라간다.

## Last Updated

마이그레이션 목표·허브 이관·WAL 복원 및 승인 정책이 바뀔 때 갱신한다.
