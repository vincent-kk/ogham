# documentValidator — 문서 계약 유효성 검증

## Purpose

INTENT.md(50줄 제한)의 3-tier 경계와 DETAIL.md(append-only 방지)의 현재 계약·acceptance group을 검증한다.

## Structure

- `validateIntentMd.ts` — 50줄 제한 + 3-tier boundary 존재 검사
- `validateDetailMd.ts` — append-only와 acceptance group 검사 조합
- `acceptanceGroups/` — 필수 section과 안정 group ID 검사 organ
- `countLines.ts` — 줄 수 계산

## Boundaries

### Always do

- 변경 후 관련 테스트 업데이트
- DETAIL acceptance group ID를 verification contract oracle로 제공

### Ask first

- 공개 API 시그니처 변경
- acceptance group heading 또는 필수 section 계약 변경

### Never do

- 모듈 경계 외부 로직 인라인
- adapter별 contract marker syntax 해석
- criteria ledger나 branch mode 문서 검증 추가
