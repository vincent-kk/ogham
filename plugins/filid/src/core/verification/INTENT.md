# verification — executable document policy

## Purpose

adapter가 분석한 실행 가능 검증 문서를 spec-document와 test-record로 평가하고 DETAIL acceptance group 연결을 검증한다.

## Structure

- PASS/FAIL 판정은 `policy/`만 소유한다 — 다른 organ은 adapter 결과 조합과 owner DETAIL group 해석까지만 하고 판정을 만들지 않는다.
- 공개 경계는 `index.ts` 하나이며, cap과 certainty 상수는 그 밖으로 나가지 않는다.

## Conventions

- 판단 우선순위: 1. certainty 보존 2. 계약 연결 3. 파일별 cap
- core는 파일명, 확장자, 테스트 호출 문법을 해석하지 않는다.

## Boundaries

### Always do

- indeterminate와 unsupported를 PASS와 구분
- 같은 confidence의 adapter가 주장한 파일은 임의 owner를 고르지 않고 제외
- snapshot의 portable absolute path discovery를 재조회하지 않고 중복 claim을 하나로 정규화
- spec 여러 개는 서로 겹치지 않는 실제 DETAIL group에 연결
- test-record coverage를 cap 충족 목적으로 삭제하지 않음

### Ask first

- 15/32 threshold, verification role 또는 violation 의미 변경
- adapter 분석 결과에 새 필수 필드 추가

### Never do

- 3+12 분할이나 test-to-spec promotion 복원
- project 전체 test-record 총수 제한
- discovery 실패나 경합을 빈 exact 분석으로 축소
- 생태계 syntax를 core policy에 추가

## Dependencies

- `../../types/verification.ts`, VerificationAdapter와 documentValidator group parser
