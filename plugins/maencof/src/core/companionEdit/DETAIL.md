# companionEdit — Contract

## Requirements

- `.maencof-meta/companion-identity.json` 을 바꾸는 유일한 허가 채널이다. 파일 직접 편집 금지 규칙의 예외는 이 경로 하나뿐이고, `companion_edit` MCP 도구가 여기로 위임한다.
- 흐름은 고정이다: 로드 → (레거시면) 정본 정규화 → 연산 적용(메모리) → 검증 → `commit !== true` 면 diff 만, `commit === true` 면 백업 후 저장.
- preview 경로는 파일을 절대 쓰지 않는다. `commit` 이 참이 아닌 모든 호출에서 디스크는 불변이고, 반환되는 `identity_preview` 는 메모리상의 후보다.
- 로드는 항상 `companionNormalize` 를 거친다. 레거시 v1 파일도 같은 편집 연산을 받을 수 있어야 하고, 매핑을 여기서 다시 구현하면 렌더·마이그레이션과 어긋난다.
- 저장 전 검증은 세 겹이다 — 정본 `CompanionIdentitySchema` Zod 파싱, 매 턴 예산 단조-개선 게이트, brief 길이 역전 검사. 앞의 두 개 중 하나라도 error 를 만들면 커밋을 거부한다.
- 매 턴 예산은 절대 기준이 아니라 **단조 기준** 이다. 편집 후 총합이 `TURN_IDENTITY_CHAR_BUDGET` 이내이거나 편집 전 총합을 악화시키지 않으면 통과한다 — 마이그레이션 직후 이미 초과한 상태에서도 brief 를 하나씩 붙여 예산 아래로 수렴할 수 있어야 하기 때문이다. 초과를 더 키우는 편집만 error 가 된다.
- 세션 예산은 soft 다. 초과해도 warning 으로만 남고 커밋을 막지 않는다.
- 마지막 섹션은 지울 수 없다. 섹션이 하나도 없는 동반자는 렌더할 것이 없으므로 `remove_section` 이 마지막 하나를 지우려 하면 거부한다.
- `key` 는 정체성이라 `update_section` 이 바꾸지 못한다. 패치의 `key` 는 병합에서 무시되고 기존 값이 유지된다.
- 커밋은 `backupPath` 규칙으로 백업한 뒤 Zod 가 파싱한 데이터(`parsed.data`)를 쓴다. 입력 그대로가 아니라 스키마를 통과한 값이 파일에 남는다.
- 실패는 예외가 아니라 결과 객체다. 파일 부재·JSON 파싱 실패·필수 필드 누락 모두 `success: false` + `errors` 로 돌려준다.

## API Contracts

### Entry point (`index.ts`)

`applyCompanionEdit(vaultPath: string, input: CompanionEditInput): CompanionEditResult` — 동기.

### Operations

| Operation        | Required input                         | Behavior                                                       |
| ---------------- | -------------------------------------- | -------------------------------------------------------------- |
| `add_section`    | `section.{key,inject,salience,detail}` | 새 축 추가. 같은 key 가 있으면 `update_section` 을 쓰라고 거부 |
| `update_section` | `key`, `section`                       | 제공된 필드만 병합. `key` 는 불변                              |
| `remove_section` | `key`                                  | 섹션 삭제. 마지막 하나는 거부                                  |
| `update_core`    | `core`                                 | `name` · `greeting` 만 패치                                    |

### `CompanionEditResult`

- `success` — 검증 통과 여부. preview 에서도 의미가 있다(에러 없으면 true).
- `committed` — 실제로 파일을 썼는지. preview 는 언제나 false.
- `operation` · `changed` — 요청 연산과 그 요약 문자열(`add_section "key"` 형태).
- `errors` — 커밋을 막는 사유(Zod 이슈, 예산 악화, brief 길이 역전).
- `warnings` — 막지 않는 사유(예산 초과 상태이나 개선 중, 세션 예산 초과).
- `turn_budget` — `{ total, budget, ok, offenders }`. 편집 **후** 후보 기준이다.
- `identity_preview` — 후보 identity. preview 와 커밋 거부 경로에서만 실리고, 커밋 성공 응답에서는 null 이다 — 방금 저장한 내용의 전체 에코는 컨텍스트 낭비다.
- `backup_path` — 커밋에서만 존재하는 선택 필드.

### 저장 형식

`schema_version: 2`, `created_at` 은 기존 값을 ISO 로 보정해 유지, `updated_at` 은 매 편집마다 현재 시각. 들여쓰기 2 + 끝 개행.

## Acceptance Criteria

### AC-preview-never-writes — preview 무변경

- `commit` 이 true 가 아닌 모든 호출에서 identity 파일이 변경되지 않는다.

### AC-turn-budget-monotone — 매 턴 예산 단조 기준

- 초과 상태에서 총합을 줄이는 편집은 warning 과 함께 통과하고, 초과를 키우는 편집만 error 로 거부된다.

### AC-session-budget-soft — 세션 예산 soft

- 세션 예산 초과가 warning 에만 나타나고 커밋을 막지 않는다.

### AC-last-section-retained — 마지막 섹션 보존

- 섹션이 하나뿐일 때 `remove_section` 이 거부된다.

### AC-section-key-immutable — 섹션 key 불변

- `update_section` 패치에 `key` 가 있어도 기존 key 가 유지된다.

### AC-commit-backs-up — 커밋 백업

- 커밋 경로가 쓰기 전에 백업 파일을 남기고 그 경로를 `backup_path` 로 보고한다.

### AC-commit-no-echo — 커밋 성공 무에코

- `commit: true` 로 저장에 성공한 응답의 `identity_preview` 는 null 이다. preview 와 커밋 거부 응답은 후보 identity 를 유지한다.

### AC-failure-as-result — 실패의 결과화

- 파일 부재·파싱 실패·필수 필드 누락이 예외 대신 `success: false` + `errors` 로 반환된다.

## Last Updated

2026-08-04 — 커밋 성공 응답의 `identity_preview` 전체 에코를 제거했다(null 반환).
