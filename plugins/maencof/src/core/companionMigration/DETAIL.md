# companionMigration — Contract

## Requirements

- `.maencof-meta/companion-identity.json` 의 레거시(v1) → 정본(v2) 파일 마이그레이션을 수행한다. MCP 서버 기동 경로(`mcp/serverEntry`)가 매 부팅 1회 호출한다.
- 멱등이다. `schema_version >= 2` 면 즉시 no-op 으로 끝나므로 매 기동 호출이 안전하다.
- 훅은 얇게 유지하고 무거운 1회성 변환은 여기서 한다 — 이 변환이 훅 번들에 들어가면 이벤트별 크기 가드를 넘긴다.
- 레거시 필드 매핑을 자체 구현하지 않고 `companionNormalize` 를 재사용한다. 렌더·편집·마이그레이션 세 경로가 같은 매핑을 공유해야 하기 때문이다.
- v1→v2 필드 매핑만 한다. 지침 파일(`CLAUDE.md` 등) identity 외 파일은 건드리지 않는다.
- 매 턴 예산을 초과하면 turn 대상 섹션(`inject ∈ {turn, both}`)을 salience 오름차순(동률은 원래 순서)으로 `inject: "session"` 으로 강등해 `TURN_IDENTITY_CHAR_BUDGET` 이내로 맞춘다. 강등 대상이 소진되면 예산을 못 맞춰도 멈춘다. 이 조정은 v1 매핑이 합성한 기본값을 고치는 것이지 사용자 저작값을 되돌리는 것이 아니다.
- 쓰기 전 백업하고, Zod(`CompanionIdentitySchema`) 검증을 통과한 데이터만 기록한다.
- 실패는 격리된다. 파싱 오류·정규화 실패·스키마 위반·예외 모두 `appendErrorLogSafe` 로 기록하고 원본을 그대로 둔 채 결과 객체로 반환한다 — 마이그레이션 오류가 서버 기동을 막지 않는다.
- 강등이 일어난 경우도 error-log 에 남긴다. 사용자가 저작하지 않은 조정이므로 흔적 없이 지나가면 안 된다.

## API Contracts

### Entry point (`index.ts`)

- `runCompanionMigration(cwd: string): CompanionMigrationResult` — 동기.
- 타입: `CompanionMigrationResult` · `CompanionMigrationReason`.

### `CompanionMigrationResult`

`{ migrated, reason, backupPath?, demotedToSession? }`

| `reason`          | `migrated` | 의미                                                     |
| ----------------- | ---------- | -------------------------------------------------------- |
| `no-file`         | false      | identity 파일 없음 — 설치 전 상태, 오류가 아니다         |
| `already-current` | false      | `schema_version >= 2` — 멱등 no-op                       |
| `invalid`         | false      | 정규화 실패 또는 정본 스키마 위반. 원본 유지 + error-log |
| `migrated`        | true       | 백업 후 v2 로 기록 완료                                  |
| `error`           | false      | 읽기/파싱/쓰기 예외. 원본 유지 + error-log               |

- `backupPath` — `migrated` 일 때만 존재.
- `demotedToSession` — 예산 맞추기로 강등된 섹션 key 목록. 강등이 없으면 필드 자체가 없다.

### 저장 형식

`schema_version: 2`, `created_at` 은 기존 값을 ISO 로 보정해 유지, `updated_at` 은 마이그레이션 시각. 들여쓰기 2 + 끝 개행.

## Acceptance Criteria

### AC-idempotent — 멱등

- `schema_version >= 2` 인 파일에 대해 쓰기 없이 `already-current` 를 반환한다.

### AC-missing-file-not-error — 파일 부재 무해

- identity 파일이 없으면 `no-file` 로 조용히 끝나고 아무것도 만들지 않는다.

### AC-backup-before-write — 쓰기 전 백업

- `migrated` 경로가 기록 전에 백업을 남기고 그 경로를 반환한다.

### AC-schema-gate — 스키마 게이트

- 정본 스키마를 통과하지 못한 후보는 기록되지 않고 원본이 유지된다.

### AC-turn-budget-demotion — 예산 강등

- 예산 초과 시 salience 낮은 turn 섹션부터 `inject: "session"` 으로 강등되고 그 key 들이 결과와 error-log 에 남는다.

### AC-failure-isolated — 실패 격리

- 어떤 실패 경로에서도 예외를 던지지 않고 원본 파일을 그대로 둔다.

## Last Updated

2026-07-30 — 멱등 조건·reason 별 결과·백업/스키마 게이트·예산 강등·실패 격리 계약을 문서화했다.
