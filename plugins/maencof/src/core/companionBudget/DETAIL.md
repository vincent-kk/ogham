# companionBudget — Contract

## Requirements

- 렌더 길이는 반드시 `turnContext` 의 `renderIdentitySection` · `selectSections` 로 측정한다. 마크업을 여기서 다시 조립하면 측정값과 실제 주입 길이가 갈라지므로, 측정과 렌더가 같은 primitive 를 공유하는 것이 이 모듈의 존재 이유다.
- 길이 단위는 코드포인트다(`[...text].length`). UTF-16 단위로 세면 서로게이트 쌍 문자가 두 글자로 잡혀 한글·이모지가 든 섹션이 부당하게 예산을 잡아먹는다.
- 예산 초과는 결과 객체로 반환한다 — throw 하지 않고 런타임에서 자르지도 않는다. 이 모듈은 저작 시점 게이트이고, 무엇을 강등·압축할지는 호출자(companionEdit · companionMigration · setup 스킬)가 정한다.
- 채널이 대상 섹션과 렌더 형태를 함께 가른다. `turn` 은 `inject ∈ {turn, both}` 를 brief 우선으로, `session` 은 `inject ∈ {session, both}` 를 detail 로 렌더한다.
- brief 검증은 길이 역전만 자동 판정한다. brief 가 detail 보다 짧지 않으면 경고를 만들고, 의미 초과(brief ⊄ detail)는 자동 판정이 불가능하므로 저작자 확인에 남긴다.
- 파일 I/O 도 `mcp/` · `hooks/` 의존도 없다. 입력은 섹션 배열뿐이다.

## API Contracts

### Entry point (`index.ts`)

- `measureTurnChars(sections): number` — 매 턴 대상 섹션 렌더 총합.
- `measureSessionChars(sections): number` — 세션 대상 섹션 렌더 총합.
- `assertTurnBudget(sections): BudgetResult` — `TURN_IDENTITY_CHAR_BUDGET` 대비 게이트(hard 기준).
- `assertSessionBudget(sections): BudgetResult` — `SESSION_IDENTITY_CHAR_BUDGET` 대비 게이트(soft 안전판).
- `checkBriefSubsumption(section): BriefSubsumptionResult` — 섹션 하나의 brief 길이 역전 검사.
- 타입: `BudgetOffender` · `BudgetResult` · `BriefSubsumptionResult`.

### `BudgetResult`

`{ ok, total, budget, overBy, offenders }` — `ok` 는 `total <= budget`, `overBy` 는 `max(0, total - budget)`. `offenders` 는 `{ key, chars }` 를 `chars` 내림차순으로 정렬한 목록이라 첫 항목이 곧 최우선 압축·강등 후보다.

### `BriefSubsumptionResult`

`{ ok, warnings }` — brief 가 없으면 언제나 `ok: true`. 경고 문자열은 위반 섹션 key 를 포함한다.

### 예산 상수

두 예산은 `constants/companionIdentity.ts` 가 소유한다. 이 모듈은 값을 복제하지 않고 상수를 읽으며, 숫자를 직접 적는 소비처는 `skills/setup/reference.md` 뿐이다.

## Acceptance Criteria

### AC-render-shared-primitive — 렌더 공유 측정

- 측정이 `renderIdentitySection` 결과 길이를 쓰고 자체 마크업 재구성을 하지 않는다.

### AC-code-point-length — 코드포인트 계수

- 서로게이트 쌍 문자가 한 글자로 계산된다.

### AC-no-throw-no-cut — 비예외·비절단

- 예산 초과 시 예외 없이 `ok: false` 를 반환하고 섹션을 잘라내지 않는다.

### AC-offenders-descending — offender 정렬

- `offenders` 가 렌더 길이 내림차순으로 정렬되어 반환된다.

### AC-brief-length-inversion — brief 길이 역전

- brief 가 detail 보다 짧지 않은 섹션에 경고가 붙는다.

## Last Updated

2026-07-30 — 공유 primitive 측정·코드포인트 계수·비절단 게이트·offender 정렬 계약을 문서화했다.
