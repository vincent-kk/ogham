# dependency-extractor -- import·export·call 정적 추출

## Purpose

TypeScript/JavaScript 소스에서 import 구문, export 선언, 호출식(`CallExpression`)을 AST 기반으로 추출해 `DependencyInfo`(imports/exports/calls)를 반환한다. `fractal-validator`의 순환 의존성 검사와 `mcp/ast-analyze` 도구가 이 결과를 소비한다.

## Structure

- `dependency-extractor.ts` — `extractDependencies` (public), `getCallee` / `stripQuotes` (internal)

## Conventions

- Import 처리: 기본 import + named specifier + namespace import (`* as ns`) 모두 단일 `specifiers` 배열로 평탄화
- `isTypeOnly` 판정은 원문 텍스트 prefix(`'import type'` / `'export type'`) 기준 — AST 플래그 대신 문자열 검사
- Export 처리 종류: `export { ... }` 절, `export function/class/const/interface/type`, `export default`, 위 각각에 대한 line 번호 부착
- 소스 경로는 `stripQuotes`로 양쪽 따옴표만 제거 (escape 처리 없음)
- 호출식은 전체 AST를 `walk`로 순회하며 수집 — 함수 스코프 구분 없음
- `member_expression` 호출은 `obj.prop` 문자열로 합성 (중첩은 재귀)

## Boundaries

### Always do

- 새 export 형태 지원 시 `ExportInfo` 필드 확장 (`isTypeOnly`, `isDefault` 유지)
- 모든 line 번호는 tree-sitter 0-based → `+1` 변환

### Ask first

- `walk` 전체 순회를 export 블록 내로 한정 (성능 최적화)
- 호출식을 함수 스코프별로 그룹화

### Never do

- 정규식으로 import/export를 파싱 (반드시 AST 기반)
- 소스 문자열 escape 해석 직접 구현

## Dependencies

- `@ast-grep/napi` (`SgNode`)
- `../parser/` (`parseSource`, `walk`)
- `../../types/ast.js` (`DependencyInfo`, `ImportInfo`, `ExportInfo`, `CallInfo`)
