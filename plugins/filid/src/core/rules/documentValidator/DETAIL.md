# documentValidator contract

## Requirements

- INTENT.md의 50줄 cap과 3-tier boundary heading을 검증한다.
- INTENT.md에서 한 `## ` 섹션에 경로 토큰 3개 이상이면 `derivable-content` warning을 낸다. 경로 토큰은 `/`를 포함한 공백 없는 code span이다 — 생태계 확장자 목록은 참조하지 않는다(core 언어 중립). code fence 안, glob(`*` 포함), `@` scope 이름, `<placeholder>`, scheme 접두 지정자(`node:`·`https:` 류)는 토큰이 아니다.
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
- `splitMarkdownSections(content)` — fence를 제거한 `## ` 단위 section 분해. `extractPathTokens(text)` — 구분자 보유 code span 경로 토큰 추출: 쓰인 형태(말미 `/` 포함)를 보존하고, 말미 `/`만 다른 중복은 등장 순서와 무관하게 디렉터리 표기(`/` 말미)를 우선해 하나로 접는다. snapshot evidence의 stale-path·derivable-structure 검사가 재사용한다.

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

### AC-intent-derivable — 열거 검출

- 한 `## ` 섹션 본문에 서로 다른 경로 토큰 3개 이상 → `derivable-content` warning 1건, 섹션명이 메시지에 들어가고 violation의 `section` 필드가 섹션 제목(전문(preamble)은 빈 문자열)을 싣는다.
- 경로 토큰 2개 이하, fence 내부 토큰, `*` 포함 glob, `@` 스코프 이름, `<placeholder>`, scheme 접두 지정자, 구분자 없는 bare 파일명은 위반을 만들지 않는다.
- warning이므로 문서 `valid`는 유지된다.

### AC-document-surface — 1.0 document surface

- public surface는 INTENT.md·DETAIL.md validator와, snapshot evidence가 재사용하는 markdown 분해 유틸(`splitMarkdownSections`, `extractPathTokens`)만 제공한다.
- `.filid/criteria.md` 전용 validator나 validation type을 노출하지 않는다.

## Boundary Exemptions

### validators — Hook bundle direct import

- **Consumers**: `**/src/hooks/**`, `**/__tests__/**`
- **Direct import**: allowed
- **Reason**: 훅 번들은 배럴을 import할 수 없다 — esbuild 가 배럴이 재노출하는 모듈 전체를 번들로 끌어오고, `scripts/buildHooks.mjs` 의 바이트 캡이 이를 빌드 실패로 막는다.

## Last Updated

2026-08-16 — 경로 토큰을 언어 중립(구분자 필수)으로 재정의하고 scheme·placeholder 제외와 violation `section` 필드를 추가했다.
