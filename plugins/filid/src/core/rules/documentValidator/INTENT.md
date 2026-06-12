# documentValidator -- 문서 계약 유효성 검증

## Purpose

INTENT.md(50줄 제한) / DETAIL.md(append-only 금지) / criteria.md(수용 기준 원장) 유효성 검증.

## Structure

- `validateIntentMd.ts` — 50줄 제한 + 3-tier boundary 존재 검사
- `validateDetailMd.ts` — append-only 패턴 탐지
- `validateCriteriaMd.ts` — claim 필수 필드(claim/observable/expected/scope/status)·status enum·claim 삭제 금지·중복 id·동어반복 검사
- `countLines.ts` — 줄 수 계산

## Boundaries

### Always do

- 변경 후 관련 테스트 업데이트
- criteria 검사 규칙(필수 필드·enum)은 `constants/documentValidation.ts` 상수 경유

### Ask first

- 공개 API 시그니처 변경
- criteria 필수 필드 집합 변경 (원장 계약 — 이슈 합의 필요)

### Never do

- 모듈 경계 외부 로직 인라인
- 의미론적 동어반복 판정 추가 (기계 판정은 정규화 동치까지만; 의미 판정은 harvest 인터뷰·review 단계 소관)
