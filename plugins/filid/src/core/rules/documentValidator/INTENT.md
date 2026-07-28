# documentValidator — 문서 계약 유효성 검증

## Purpose

INTENT.md(50줄 제한)의 3-tier 경계와 DETAIL.md(append-only 방지)의 현재 계약·acceptance group을 검증한다.

## Structure

- `validators/validateIntentMd.ts` — 50줄 제한 + 3-tier boundary 존재 검사
- `validators/validateDetailMd.ts` — `detectAppendOnly`와 acceptance group 검사 조합
- `validators/countLines.ts` — 줄 수 계산
- `acceptanceGroups/` — 필수 section과 안정 group ID 검사 organ
- `boundaryExemptions/` — 조건부 `## Boundary Exemptions` 선언 파서 organ
- `index.ts` — 위 6개 함수를 이름으로 재수출하는 배럴

## Conventions

- 검사는 문서 텍스트만 읽고 판정한다. 파일을 고치지도, 소스 코드를 조회하지도 않는다.
- 줄 수는 `countLines` 하나만 쓴다. trailing newline 계수 차이가 50줄 캡 판정을 가르므로 호출부에서 따로 세지 않는다.
- acceptance group ID는 문서 내에서 유일해야 하며, 이 ID가 verification contract의 oracle이 된다.
- `## Boundary Exemptions`는 조건부 section이다. 부재는 위반이 아니고, 존재하면서 `Reason`이 비면 위반이다.
- 구 이름 `## Organ Exemptions`도 같은 문법으로 계속 읽는다.

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

## Dependencies

- `constants/documentValidation.ts`, `types/documents.ts` — 그 외 tree·adapter·config에 의존하지 않는다.
