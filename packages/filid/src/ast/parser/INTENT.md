# parser -- AST 파싱 진입점과 walker

## Purpose

`@ast-grep/napi` (tree-sitter 백엔드)를 래핑한 단일 파싱 진입점. 파일 확장자로 언어를 자동 감지해 `SgNode` 루트를 반환하고, 모든 분석 모듈이 공통으로 사용하는 재귀 `walk` 함수를 제공한다.

## Structure

- `parser.ts` — `parseSource`, `parseFile`, `walk`

## Conventions

- 언어 감지: 파일 확장자 → `EXT_TO_LANG[ext] ?? 'typescript'` → `toLangEnum`
- `@ast-grep/napi` 로딩 실패 시 명확한 에러 메시지 throw (install 가이드 포함)
- `parseFile`은 `readFileSync`로 동기 I/O만 허용 (비동기 파서 호출은 아래 레벨)
- `walk`는 노드가 falsy면 즉시 return — null/undefined 안전
- 기본 파일명은 `'anonymous.ts'` (인라인 분석용)

## Boundaries

### Always do

- 파싱/walking 외 분석 로직은 하위 모듈(`lcom4`, `cyclomatic-complexity` 등)로 위임
- 언어 매핑 변경 시 `constants/ast-languages.ts`와 동기화

### Ask first

- `walk` 알고리즘을 재귀에서 반복문 + 스택으로 교체
- `parseFile`을 비동기 I/O(`readFile`)로 전환

### Never do

- 파서 인스턴스 전역 캐싱 (lazy loader는 `ast-grep-shared`에만 존재)
- 분석 로직을 `parser.ts` 내부에 인라인
- `core/`, `mcp/`, `hooks/` 역방향 import

## Dependencies

- `@ast-grep/napi` (외부 peer)
- `../ast-grep-shared/` (`getSgModule`, `getSgLoadError`, `EXT_TO_LANG`, `toLangEnum`)
- `node:fs` (`readFileSync`)
