# testCaseGate -- 테스트 케이스 증가 게이트

## Purpose

`spec.ts` 파일당 테스트 케이스 총량을 게이트한다 — 총량이 `MAX_TEST_CASES`를 넘으면 모듈 분리 또는 파라미터화 대상으로 표식한다. `3`(basic) + `12`(complex) = `15`는 튜닝 가능한 관례이며 절대값이 아니다(총량만 강제). `test.ts`는 게이트 면제.

## Structure

- `testCaseGate.ts` — `checkTestCaseGate`

## Conventions

- 검사 대상: `fileType === 'spec'`인 `TestCaseCount` 항목만 (`test.ts`는 규칙 면제)
- 임계값: `MAX_TEST_CASES`(= `MAX_BASIC_CASES` + `MAX_COMPLEX_CASES` = 15) — `constants/qualityThresholds.ts` 단일 소스, 자유 튜닝
- 위반 판정: `f.total > threshold` (강등 `>`, `>=` 아님)
- 반환 구조: `violated` 플래그 + 전체 `files` 배열 + `violatingFiles` 경로 목록
- 입력 배열 전체를 한 번만 순회 (O(n))

## Boundaries

### Always do

- 임계값 접근은 상수 import로만 (숫자 리터럴 하드코딩 금지)
- `violated = violatingFiles.length > 0` 동치 유지

### Ask first

- 규칙 대상을 `test.ts`로 확장
- 임계값을 파일 크기·복잡도와 결합한 가중치로 전환

### Never do

- `testCounter`를 내부에서 호출 (카운팅은 상위 orchestrator 책임)
- `count` 재계산 — 입력 `total`만 사용

## Dependencies

- `../../types/metrics.js` (`TestCaseCount`, `TestCaseGateResult`)
- `../../constants/qualityThresholds.js` (`MAX_TEST_CASES`)
