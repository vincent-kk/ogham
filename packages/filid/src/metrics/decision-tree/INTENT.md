# decision-tree -- 3+12 초과 시 처방 결정

## Purpose

테스트 수·LCOM4·순환 복잡도 세 지표를 받아 `ok` / `split` / `compress` / `parameterize` 중 하나의 처방을 반환한다. 3+12 규칙이 위반되었을 때 "어떻게 고쳐야 하는지"를 안내하는 순수 의사결정 함수.

## Structure

- `decision-tree.ts` — `decide` (public), `DecisionInput` 인터페이스

## Conventions

- 결정 파이프라인 (짧은 회로, 위에서 아래로):
  1. `testCount <= 15` → `ok` (조치 불필요)
  2. `lcom4 >= 2` → `split` (SRP 위반, 하위 fractal로 추출)
  3. `cyclomaticComplexity > 15` → `compress` (응집 양호, 흐름 과다 → 전략 패턴·메서드 추출)
  4. 그 외 → `parameterize` (중복 엣지 케이스를 data-driven 테이블로 병합)
- 임계값 세 개는 모두 `constants/quality-thresholds.ts`에서 import: `THREE_PLUS_TWELVE_THRESHOLD`, `LCOM4_SPLIT_THRESHOLD`, `CC_THRESHOLD`
- `reason` 문자열에는 실제 입력 값을 포함 (디버깅 용이)
- `metrics` 필드는 입력 그대로 에코 (로깅·UI 표시용)

## Boundaries

### Always do

- 분기 순서 유지 — split이 parameterize보다 먼저 평가되어야 함
- 모든 분기에서 동일한 `metrics` 객체 참조로 에코

### Ask first

- 새 `action` 값 추가 (예: `extract-helper`, `reduce-mock`)
- 임계값 비교 연산자 변경 (`>=` ↔ `>`)

### Never do

- 숫자 리터럴로 임계값 하드코딩
- `testCount` 보정 로직 도입 (입력을 그대로 신뢰)

## Dependencies

- `../../types/metrics.js` (`DecisionResult`)
- `../../constants/quality-thresholds.js` (`THREE_PLUS_TWELVE_THRESHOLD`, `LCOM4_SPLIT_THRESHOLD`, `CC_THRESHOLD`)
