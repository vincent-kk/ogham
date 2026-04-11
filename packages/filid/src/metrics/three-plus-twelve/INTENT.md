# three-plus-twelve -- 3+12 규칙 검증

## Purpose

FCA-AI 3+12 규칙(핵심 3 + 엣지 12 = 최대 15 케이스)을 `spec.ts` 파일에 한해 검증한다. 초과하면 모듈 분리 또는 파라미터화 대상으로 표식한다. `test.ts`는 규칙 적용 대상이 아님.

## Structure

- `three-plus-twelve.ts` — `check312Rule`

## Conventions

- 검사 대상: `fileType === 'spec'`인 `TestCaseCount` 항목만 (`test.ts`는 규칙 면제)
- 임계값: `THREE_PLUS_TWELVE_THRESHOLD`(=15) — `constants/quality-thresholds.ts` 단일 소스
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

- `test-counter`를 내부에서 호출 (카운팅은 상위 orchestrator 책임)
- `count` 재계산 — 입력 `total`만 사용

## Dependencies

- `../../types/metrics.js` (`TestCaseCount`, `ThreePlusTwelveResult`)
- `../../constants/quality-thresholds.js` (`THREE_PLUS_TWELVE_THRESHOLD`)
