# documentValidator contract

## Requirements

- INTENT.md의 50줄 cap과 3-tier boundary heading을 검증한다.
- DETAIL.md의 append-only 변경을 거부하고 필수 section과 안정 acceptance
  group ID를 검증한다.
- acceptance group heading은 `### <stable-id> — <title>` 형태이며 한 문서
  안에서 중복될 수 없다.
- criteria ledger나 branch mode 문서는 이 validator의 계약이 아니다.
- DETAIL.md의 `## Boundary Exemptions`는 조건부 section이다. 없는 것이 정상
  이며 면책을 실제로 선언하는 프랙탈만 갖는다. `## Organ Exemptions`는 같은
  문법의 legacy 별칭으로 계속 인정한다.
- 면책 항목은 acceptance group과 같은 `### <target path> — <title>` 형태이며
  `Consumers`, `Direct import`, `Reason` 필드를 갖는다. target path에는 `/`가
  올 수 있으므로 acceptance group의 ID 문자 집합과 heading 규칙을 공유하지
  않는다. target은 organ 경로일 수도, fractal 내부 경로일 수도 있다.
- `Reason`이 비면 면책이 아니라 미충족 계약이므로 error다.

## API Contracts

- `validateIntentMd(content)` — INTENT validation result.
- `validateDetailMd(content, oldContent?)` — append와 acceptance group을 합친
  DETAIL validation result.
- `validateDetailAcceptanceGroups(content)` — 추출된 groups와 document
  violations.
- `parseBoundaryExemptions(content)` — 선언된 면책과 document violations.
  section이 없으면 빈 결과이며 violation도 없다.

## Acceptance Criteria

### AC-detail-groups — Stable acceptance oracle

- 필수 DETAIL section과 한 개 이상의 고유 acceptance group이 있으면
  validation을 통과한다.
- section, group ID 또는 title 누락과 duplicate ID는 error다.

### AC-detail-restructure — Append-only prohibition

- 이전 내용 뒤에 기록만 붙인 변경은 error이고 재구성한 현재 계약은
  append-only finding을 만들지 않는다.

### AC-detail-boundary-exemptions — 조건부 면책 선언

- section이 없는 DETAIL.md는 면책 0개와 violation 0개를 낸다.
- 선언된 항목에서 target path, title, consumers, direct import와 reason을
  추출하고 `validateDetailMd` 결과에 함께 노출한다.
- `## Organ Exemptions` heading도 같은 문법의 legacy 별칭으로 파싱한다.
- `Consumers: entry-point`는 배럴 경유 접근을 뜻하며 direct import를 열지
  않는다.
- `Reason`이 비면 error를 내고 문서는 valid가 아니다.

### AC-document-surface — 1.0 document surface

- public surface는 INTENT.md와 DETAIL.md validator만 제공한다.
- `.filid/criteria.md` 전용 validator나 validation type을 노출하지 않는다.

## Boundary Exemptions

### documentValidator.ts — Hook bundle direct import

- **Consumers**: `**/src/hooks/**`, `**/__tests__/**`
- **Direct import**: allowed
- **Reason**: 훅 번들은 배럴을 import할 수 없다 — esbuild 가 배럴이 재노출하는 모듈 전체를 번들로 끌어오고, `scripts/buildHooks.mjs` 의 바이트 캡이 이를 빌드 실패로 막는다.

## Last Updated

2026-07-28 — 면책 파서를 `## Boundary Exemptions`로 일반화하고 legacy heading을 별칭으로 인정한다.
