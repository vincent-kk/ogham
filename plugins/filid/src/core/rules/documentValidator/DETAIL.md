# documentValidator contract

## Requirements

- INTENT.md의 50줄 cap과 3-tier boundary heading을 검증한다.
- DETAIL.md의 append-only 변경을 거부하고 필수 section과 안정 acceptance
  group ID를 검증한다.
- acceptance group heading은 `### <stable-id> — <title>` 형태이며 한 문서
  안에서 중복될 수 없다.
- criteria ledger나 branch mode 문서는 이 validator의 계약이 아니다.

## API Contracts

- `validateIntentMd(content)` — INTENT validation result.
- `validateDetailMd(content, oldContent?)` — append와 acceptance group을 합친
  DETAIL validation result.
- `validateDetailAcceptanceGroups(content)` — 추출된 groups와 document
  violations.

## Acceptance Criteria

### AC-detail-groups — Stable acceptance oracle

- 필수 DETAIL section과 한 개 이상의 고유 acceptance group이 있으면
  validation을 통과한다.
- section, group ID 또는 title 누락과 duplicate ID는 error다.

### AC-detail-restructure — Append-only prohibition

- 이전 내용 뒤에 기록만 붙인 변경은 error이고 재구성한 현재 계약은
  append-only finding을 만들지 않는다.

### AC-document-surface — 1.0 document surface

- public surface는 INTENT.md와 DETAIL.md validator만 제공한다.
- `.filid/criteria.md` 전용 validator나 validation type을 노출하지 않는다.

## Last Updated

2026-07-27 — legacy criteria validator를 제거한 1.0 문서 계약으로 재구성했다.
