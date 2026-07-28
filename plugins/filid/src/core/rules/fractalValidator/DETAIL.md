# fractalValidator Contract

## Requirements

- 모든 구조 규칙은 호출자가 제공한 하나의 `ProjectSnapshot`을 소비한다.
- node 규칙은 각 대상 node에, project 규칙은 snapshot 전체에 한 번만 적용한다.
- dependency 검증은 `DependencyGraph.edges`와 `cycles`를 사용하며 tree containment를 dependency로 사용하지 않는다.
- graph가 `indeterminate`이면 cycle이 없더라도 불확실성 finding을 반환한다.
- 규칙 예외는 빈 결과로 숨기지 않고 검증 finding으로 반환한다.

## API Contracts

- `validateStructure(snapshot, rules?, options?)`는 snapshot-derived `StructureValidationResult`를 반환한다.
- `validateDependencies(graph)`는 실제 cycle과 graph certainty를 검증한다.
- 전환 기간의 tree-only 호출은 공개 호환 경계에서만 지원하며 dependency
  증거 부재를 `indeterminate` finding으로 반환한다. 새 분석 파이프라인은
  snapshot을 전달한다.
- validator는 filesystem이나 config를 다시 읽지 않는다.

## Acceptance Criteria

### AC-validator-graph — 실제 dependency 검증

- 실제 A → B → A edge는 cycle violation을 만든다.
- 부모-자식 containment만 있는 tree는 dependency cycle을 만들지 않는다.

### AC-validator-certainty — 억지 PASS 금지

- unresolved dependency가 cycle 결론에 영향을 주면 결과에 indeterminate finding이 남는다.
- legacy `FractalTree` 입력은 containment를 dependency로 추정하지 않고
  dependency graph 부재를 indeterminate finding으로 반환한다.
- rule evaluator 예외가 발생해도 빈 PASS로 보고되지 않는다.

### AC-validator-granularity — 중복 없는 결과

- project 규칙은 node 수와 무관하게 snapshot당 한 번 평가된다.

## Last Updated

2026-07-27
