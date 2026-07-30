# documentValidator contract

## Requirements

- INTENT.md의 50줄 cap과 3-tier boundary heading을 검증한다.
- DETAIL.md의 append-only 변경을 거부하고 필수 section과 안정 acceptance group ID를 검증한다.
- acceptance group heading은 `### <stable-id> — <title>` 형태이며 한 문서 안에서 중복될 수 없다.
- criteria ledger나 branch mode 문서는 이 validator의 계약이 아니다.
- DETAIL.md의 `## Boundary Exemptions`는 조건부 section이다. 없는 것이 정상 이며 면책을 실제로 선언하는 프랙탈만 갖는다. `## Organ Exemptions`는 같은 문법의 legacy 별칭으로 계속 인정한다.
- 면책 항목은 acceptance group과 같은 `### <target path> — <title>` 형태이며 `Consumers`, `Direct import`, `Reason` 필드를 갖는다. target path에는 `/`가 올 수 있으므로 acceptance group의 ID 문자 집합과 heading 규칙을 공유하지 않는다. target은 organ 경로일 수도, fractal 내부 경로일 수도 있다.
- target path, 각 consumer 항목과 `Direct import` 값은 code span으로 감쌀 수 있고, 파서는 감싼 backtick을 벗긴 값을 읽는다. markdown formatter가 `__tests__`를 강조 문법으로 바꿔 버리므로 code span이 이름을 원문 그대로 지키는 유일한 표기이며, backtick이 없는 표기도 계속 읽는다.
- `Reason`은 산문이라 code span을 벗기지 않는다. 그 안의 backtick은 저자가 쓴 그대로 남는다.
- `Reason`이 비면 면책이 아니라 미충족 계약이므로 error다.

## API Contracts

- `validateIntentMd(content)` — INTENT validation result.
- `validateDetailMd(content, oldContent?)` — append와 acceptance group을 합친 DETAIL validation result.
- `validateDetailAcceptanceGroups(content)` — 추출된 groups와 document violations.
- `parseBoundaryExemptions(content)` — 선언된 면책과 document violations. section이 없으면 빈 결과이며 violation도 없다.

## Acceptance Criteria

### AC-detail-groups — Stable acceptance oracle

- 필수 DETAIL section과 한 개 이상의 고유 acceptance group이 있으면 validation을 통과한다.
- section, group ID 또는 title 누락과 duplicate ID는 error다.

### AC-detail-restructure — Append-only prohibition

- 이전 내용 뒤에 기록만 붙인 변경은 error이고 재구성한 현재 계약은 append-only finding을 만들지 않는다.

### AC-detail-boundary-exemptions — 조건부 면책 선언

- section이 없는 DETAIL.md는 면책 0개와 violation 0개를 낸다.
- 선언된 항목에서 target path, title, consumers, direct import와 reason을 추출하고 `validateDetailMd` 결과에 함께 노출한다.
- `## Organ Exemptions` heading도 같은 문법의 legacy 별칭으로 파싱한다.
- ``### `__tests__` — ...`` 처럼 code span으로 감싼 target path에서 backtick을 벗긴 `__tests__`를 추출한다. consumer 항목과 `` `allowed` `` 도 같게 다룬다.
- `Consumers: entry-point`는 배럴 경유 접근을 뜻하며 direct import를 열지 않는다.
- `Reason`이 비면 error를 내고 문서는 valid가 아니다.

### AC-document-surface — 1.0 document surface

- public surface는 INTENT.md와 DETAIL.md validator만 제공한다.
- `.filid/criteria.md` 전용 validator나 validation type을 노출하지 않는다.

## Boundary Exemptions

### validators — Hook bundle direct import

- **Consumers**: `**/src/hooks/**`, `**/__tests__/**`
- **Direct import**: allowed
- **Reason**: 훅 번들은 배럴을 import할 수 없다 — esbuild 가 배럴이 재노출하는 모듈 전체를 번들로 끌어오고, `scripts/buildHooks.mjs` 의 바이트 캡이 이를 빌드 실패로 막는다.

## Last Updated

2026-07-30 — 면책 선언의 target path·consumers·direct import를 code span으로 감싸도 읽는다. markdown formatter가 `__tests__`를 훼손하는 것을 저자가 막을 수 있는 표기를 파서가 지원한다.
