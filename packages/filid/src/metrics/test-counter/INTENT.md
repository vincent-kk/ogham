# test-counter -- 테스트 파일 내 케이스 카운팅

## Purpose

`test.ts`/`spec.ts` 파일 내용을 줄 단위로 스캔해 `it()`/`test()` 호출 수를 기본(basic) 케이스와 복잡(complex) 케이스로 분류한다. `three-plus-twelve` 규칙과 `decision-tree`가 이 결과를 소비한다.

## Structure

- `test-counter.ts` — `countTestCases` (public), `detectFileType` (internal), `RawTestFile` 인터페이스

## Conventions

- 파일 타입: `.spec.` 포함이면 `'spec'`, 그 외는 `'test'` (`detectFileType`의 단순 포함 검사)
- 깊이 추적: `describe[\s.(]` 매치 시 `describeDepth++`, `^}\);?$` 매치 시 `describeDepth--`
- basic vs complex: `describeDepth <= 1` → basic, 그 외 → complex
- AST 파서 사용 금지 — 정규식 라인 기반 카운팅 (경량 / 빠른 피드백)
- 매치 패턴은 `^(it|test)[\s.(]` — `it.each(...)`, `test.each(...)` 포함

## Boundaries

### Always do

- 신규 테스트 DSL 패턴(`it.concurrent` 등) 추가 시 정규식 문자 클래스만 확장
- 닫는 중괄호 매치는 `});` / `})` + 뒤 공백 허용 패턴 유지

### Ask first

- 정규식 기반 카운팅을 AST 파싱으로 전환
- `it.skip` / `test.todo` 제외 여부

### Never do

- 중괄호 깊이 대신 들여쓰기 깊이로 describe nesting 판정
- 파일 I/O 수행 (입력은 항상 `RawTestFile` 객체)

## Dependencies

- `../../types/metrics.js` (`TestCaseCount`)
