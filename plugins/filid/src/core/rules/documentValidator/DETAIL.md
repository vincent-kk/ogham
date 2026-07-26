# documentValidator contract

## Requirements

- INTENT.md의 50줄 cap과 3-tier boundary heading을 검증한다.
- DETAIL.md의 append-only 변경을 거부하고 필수 section과 안정 acceptance
  group ID를 검증한다.
- acceptance group heading은 `### <stable-id> — <title>` 형태이며 한 문서
  안에서 중복될 수 없다.
- legacy criteria.md validator는 migration seam 동안만 유지한다.

## API Contracts

- `validateIntentMd(content)` — INTENT validation result.
- `validateDetailMd(content, oldContent?)` — append와 acceptance group을 합친
  DETAIL validation result.
- `validateDetailAcceptanceGroups(content)` — 추출된 groups와 document
  violations.
- `validateCriteriaMd(content, previous?)` — 제거 예정 legacy validator.

## Acceptance Criteria

### AC-detail-groups — Stable acceptance oracle

- 필수 DETAIL section과 한 개 이상의 고유 acceptance group이 있으면
  validation을 통과한다.
- section, group ID 또는 title 누락과 duplicate ID는 error다.

### AC-detail-restructure — Append-only prohibition

- 이전 내용 뒤에 기록만 붙인 변경은 error이고 재구성한 현재 계약은
  append-only finding을 만들지 않는다.

## Last Updated

2026-07-26 — DETAIL acceptance group validation을 추가했다.
