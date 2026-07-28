# documentValidator contract

## Requirements

- INTENT.md의 50줄 cap과 3-tier boundary heading을 검증한다.
- DETAIL.md의 append-only 변경을 거부하고 필수 section과 안정 acceptance
  group ID를 검증한다.
- acceptance group heading은 `### <stable-id> — <title>` 형태이며 한 문서
  안에서 중복될 수 없다.
- criteria ledger나 branch mode 문서는 이 validator의 계약이 아니다.
- DETAIL.md의 `## Organ Exemptions`는 조건부 section이다. 없는 것이 정상이며
  면책을 실제로 선언하는 프랙탈만 갖는다.
- 면책 항목은 acceptance group과 같은 `### <organ path> — <title>` 형태이며
  `Consumers`, `Direct import`, `Reason` 필드를 갖는다. organ path에는 `/`가
  올 수 있으므로 acceptance group의 ID 문자 집합과 heading 규칙을 공유하지
  않는다.
- `Reason`이 비면 면책이 아니라 미충족 계약이므로 error다.

## API Contracts

- `validateIntentMd(content)` — INTENT validation result.
- `validateDetailMd(content, oldContent?)` — append와 acceptance group을 합친
  DETAIL validation result.
- `validateDetailAcceptanceGroups(content)` — 추출된 groups와 document
  violations.
- `parseOrganExemptions(content)` — 선언된 organ 면책과 document violations.
  section이 없으면 빈 결과이며 violation도 없다.

## Acceptance Criteria

### AC-detail-groups — Stable acceptance oracle

- 필수 DETAIL section과 한 개 이상의 고유 acceptance group이 있으면
  validation을 통과한다.
- section, group ID 또는 title 누락과 duplicate ID는 error다.

### AC-detail-restructure — Append-only prohibition

- 이전 내용 뒤에 기록만 붙인 변경은 error이고 재구성한 현재 계약은
  append-only finding을 만들지 않는다.

### AC-detail-organ-exemptions — 조건부 면책 선언

- section이 없는 DETAIL.md는 면책 0개와 violation 0개를 낸다.
- 선언된 항목에서 organ path, title, consumers, direct import와 reason을
  추출하고 `validateDetailMd` 결과에 함께 노출한다.
- `Consumers: entry-point`는 배럴 경유 접근을 뜻하며 direct import를 열지
  않는다.
- `Reason`이 비면 error를 내고 문서는 valid가 아니다.

### AC-document-surface — 1.0 document surface

- public surface는 INTENT.md와 DETAIL.md validator만 제공한다.
- `.filid/criteria.md` 전용 validator나 validation type을 노출하지 않는다.

## Last Updated

2026-07-28 — 조건부 `## Organ Exemptions` 파서를 문서 계약에 추가했다.
