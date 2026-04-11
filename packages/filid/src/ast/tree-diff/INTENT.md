# tree-diff -- 시맨틱 AST 차이 비교

## Purpose

두 소스 버전의 최상위 선언(함수/클래스/변수/인터페이스/타입)을 비교해 `added`/`removed`/`modified` 변경을 식별하고, 공백·포맷만 달라진 경우는 `hasSemanticChanges=false`로 구분한다. `hooks/change-tracker`와 PR 요약이 의미 있는 변경만 필터링하기 위해 사용한다.

## Structure

- `tree-diff.ts` — `computeTreeDiff` (public), `extractDeclarations` / `getNameFromNode` (internal), `DeclSignature` (internal)

## Conventions

- 비교 단위: 최상위 선언만 (함수 내부 바디 변경은 `modified`로만 표현)
- 정규화: `stmt.text().replace(/\s+/g, '')` — 모든 whitespace 제거 후 문자열 비교
- 선언 키: `name` 필드. 동일 이름이면 같은 선언으로 간주 (시그니처/오버로드 구분 없음)
- Export 래핑은 한 단계 unwrap: `export_statement` 안의 선언을 top-level처럼 취급
- `formattingOnlyChanges` = `changes.length === 0 && oldSource.trim() !== newSource.trim() ? 1 : 0`
- 지원 선언 종류: `function_declaration`, `class_declaration`, `lexical_declaration`/`variable_declaration`(각 `variable_declarator`), `interface_declaration`, `type_alias_declaration`

## Boundaries

### Always do

- 신규 선언 종류 추가 시 unwrap 분기와 top-level 분기 양쪽에 추가
- line 번호는 tree-sitter 0-based → `+1` 변환

### Ask first

- 이름 외 시그니처(파라미터/리턴 타입)까지 포함해 `modified` 판정 세분화
- 함수 바디 내부 변경을 sub-diff로 분리

### Never do

- 텍스트 비교를 normalize 없이 `===`로 수행
- 특정 kind 제외 로직을 구현 세부에 하드코딩 (명시적 분기 유지)

## Dependencies

- `@ast-grep/napi` (`SgNode`)
- `../parser/` (`parseSource`)
- `../../types/ast.js` (`TreeDiffResult`, `TreeDiffChange`)
