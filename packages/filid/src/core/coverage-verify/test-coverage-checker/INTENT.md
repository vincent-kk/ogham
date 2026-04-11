# test-coverage-checker -- 사용처별 대표 테스트 존재 여부 검증

## Purpose

`UsageSite[]`의 각 항목에 대해 대표 테스트 파일을 3-Strategy로 탐지하고,
`UsageCoverage[]`와 사람이 읽을 수 있는 경고 문자열을 생성한다.

## Strategies (우선순위 순)

1. **Co-located**: `<dir>/<name>.{test,spec}.{ts,tsx}`
2. **Mirror**: `src/<layer>/<name>.ts` → `src/__tests__/unit/<layer>/<name>.test.ts`
3. **Integration**: `src/__tests__/integration/<name>*.{test,spec}.ts` — 파일명이 모듈명과 일치하거나 `<name>-`로 시작

테스트 파일은 `countTestCases`로 검증하며 `total === 0`이면 발견 실패로 처리한다.

## Boundaries

### Always do
- 전략은 위 우선순위대로 시도하고 첫 성공에서 종료
- 파일 읽기 실패는 "미발견"으로 처리 (예외 전파 금지)
- 경고 메시지 포맷: `UNCOVERED: <file> imports [<names>] but has no representative test`

### Ask first
- 새로운 탐색 전략 추가 또는 우선순위 변경
- mirror 경로 규칙(`src/__tests__/unit/` 프리픽스) 변경
- `countTestCases` 외의 테스트 유효성 판정 도입

### Never do
- 테스트 파일 실행 또는 커버리지 수치(lines/branches) 측정
- `UsageSite` 수집 로직 인라인 (usage-tracker 책임)
- 전략 외 경로 글로브로 테스트 추정
