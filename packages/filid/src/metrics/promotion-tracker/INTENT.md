# promotion-tracker -- test.ts → spec.ts 승격 적격성

## Purpose

안정성이 충분한 `test.ts` 파일을 파라미터화된 `spec.ts`로 승격할 수 있는지 판정한다. 일정 기간(`stableDays`) 동안 실패 이력이 없는 테스트만 적격이며, 적격 판정 후 `filid-promote` 스킬이 실제 병합·삭제를 수행한다.

## Structure

- `promotion-tracker.ts` — `checkPromotionEligibility` (public), `PromotionInput` 인터페이스

## Conventions

- 적격 조건 (둘 다 만족):
  1. `stableDays >= stabilityThreshold` (기본 `DEFAULT_STABILITY_DAYS`=90)
  2. `lastFailure === null` (어떤 실패 이력도 있으면 부적격)
- 임계값 override: `checkPromotionEligibility(input, customThreshold)` 두 번째 인자로 주입 (테스트·CI 단축용)
- 결과 객체는 입력을 에코하면서 `eligible` 플래그를 추가 — 호출자가 추가 판단에 재활용
- 시간 계산은 호출자 책임 — 이 모듈은 `stableDays` 정수만 소비 (Date 연산 금지)

## Boundaries

### Always do

- 기본 임계값은 반드시 `constants/quality-thresholds.ts`의 `DEFAULT_STABILITY_DAYS` 경유
- `eligible` 판정에 테스트 스코어·커버리지 같은 추가 지표 넣지 않음 (단순성 유지)

### Ask first

- 기본 안정 기간(90일) 변경
- `lastFailure` 기준을 "최근 N일 내 실패 없음"으로 완화

### Never do

- `Date` 객체·`Date.now()` 직접 호출 (순수 함수 유지)
- 파일 I/O 수행 (입력은 모두 `PromotionInput`)
- `test-counter` 등 다른 metrics 모듈 import (독립 판정기)

## Dependencies

- `../../types/metrics.js` (`PromotionCandidate`)
- `../../constants/quality-thresholds.js` (`DEFAULT_STABILITY_DAYS`)
