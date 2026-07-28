# fractalValidator -- snapshot 구조 검증 facade

## Purpose

동일한 `ProjectSnapshot`에서 규칙 평가와 실제 dependency graph 검증을 조합해 구조 finding을 반환한다.

## Structure

- `validateStructure.ts` — snapshot 전체 규칙을 한 번 평가한다.
- `validateDependencies.ts` — snapshot dependency graph의 cycle과 certainty를 검증한다.
- `validateNode.ts` — node 단위 호환 검증을 제공한다.
- `index.ts` — 공개 진입점을 구성한다.

## Conventions

- tradeoff 우선순위는 1. 증거 보존 2. 중복 없는 평가 3. 이전 호출자 호환이다.
- containment 관계를 import dependency로 간주하지 않는다.
- 분석할 수 없는 증거는 PASS가 아니라 명시적 finding이다.

## Boundaries

### Always do

- 구조와 dependency 검증에 같은 snapshot 인스턴스를 사용한다.
- project granularity 규칙은 snapshot당 한 번만 실행한다.
- cycle finding에는 graph가 보존한 경로 증거를 연결한다.

### Ask first

- validator 공개 반환 타입이나 severity 의미를 변경한다.
- snapshot 없이 live filesystem을 읽는 검증 경로를 추가한다.

### Never do

- containment edge로 dependency cycle을 추정한다.
- 분석 예외나 unresolved dependency를 빈 violation으로 바꾼다.
- 특정 언어의 확장자, 진입점 이름, 테스트 문법을 해석한다.

## Dependencies

- `../ruleEngine/`
- `../../analysis/dependencyGraph/`
- `../../../types/`
