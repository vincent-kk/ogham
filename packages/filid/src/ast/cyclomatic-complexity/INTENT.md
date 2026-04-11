# cyclomatic-complexity -- 함수별 순환 복잡도 계산

## Purpose

`@ast-grep/napi` AST를 순회해 각 함수/메서드의 McCabe Cyclomatic Complexity(CC)를 계산한다. `CC > 15` FCA 규칙과 `test-metrics` MCP 도구가 이 값을 사용한다.

## Structure

- `cyclomatic-complexity.ts` — `calculateCC` (public), `computeCC` / `getNodeName` / `processClassMethods` (internal)

## Conventions

- 공식: `CC = 1 + 결정점 수`
- 결정점: `constants/decision-points.ts`의 `DECISION_KINDS` Set (if, for, while, do-while, conditional, ternary 등)
- `switch_case`는 카운트, `switch_default`는 카운트 제외 (tree-sitter 분리)
- `binary_expression`에서 `&&`/`||` 자식 발견 시 +1 (함수 1회만, break로 탈출)
- 지원 선언 형태: `function_declaration`, arrow/`function_expression`을 할당한 `lexical_declaration`, `class_declaration`의 `method_definition`, 위 셋의 `export_statement` 래퍼
- 함수가 0개면 `(file)` 키로 CC=1 단일 엔트리 반환

## Boundaries

### Always do

- 결정점 종류 변경 시 `constants/decision-points.ts`만 수정
- 신규 함수 형태 지원 시 루트 루프에 top-level kind 분기 추가

### Ask first

- 임계값 로직(`> 15`)을 모듈 내부에 두기 (현재 `fractal-validator`가 임계값 판단 담당)
- CC 정의를 Modified McCabe / Extended CC로 교체

### Never do

- 결정점을 문자열 배열로 하드코딩 (Set 상수 사용 필수)
- 파일 I/O 수행 (입력은 항상 source string)

## Dependencies

- `@ast-grep/napi` (`SgNode`)
- `../parser/` (`parseSource`, `walk`)
- `../../types/metrics.js` (`CyclomaticComplexityResult`)
- `../../constants/decision-points.js` (`DECISION_KINDS`)
