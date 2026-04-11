# ast -- AST 정적 분석 계층

## Purpose

`@ast-grep/napi`(tree-sitter) 기반 정적 분석 모듈을 모은 fractal. 파싱 진입점과 언어 매핑 organ, 그리고 순환 복잡도·응집도·의존성·시맨틱 diff의 4개 분석 엔진을 제공한다. `core/`·`mcp/tools/`·`hooks/change-tracker`가 이 결과를 규칙 평가·리포트 생성·변경 추적에 사용한다.

## Structure

| 모듈 | 역할 |
|------|------|
| `parser` | `parseSource`/`parseFile`/`walk` 공용 진입점. 언어 자동 감지 |
| `ast-grep-shared` | `@ast-grep/napi` lazy 로더, 언어 매핑, 파일 탐색, 매치 포맷터 |
| `cyclomatic-complexity` | 함수/메서드별 McCabe CC 계산 (`CC = 1 + 결정점 수`) |
| `lcom4` | 클래스 응집도(메서드-필드 공유 그래프의 connected components 수) |
| `dependency-extractor` | import/export/call 구문 추출 → `DependencyInfo` |
| `tree-diff` | 최상위 선언 added/removed/modified 시맨틱 diff |

## Conventions

- 모든 분석은 순수 함수: 입력 = `string` source, 출력 = 타입 객체
- 파일 I/O는 `parser.parseFile` 한 곳에 집중 (분석 엔진은 호출 금지)
- `@ast-grep/napi`는 `ast-grep-shared.getSgModule`의 lazy 로더만 경유
- 언어/확장자·결정점 상수는 `constants/ast-languages.ts`, `constants/decision-points.ts`에서만 관리

## Boundaries

### Always do

- 새 분석 기능은 `ast/` 안에 sub-fractal 추가 후 `src/index.ts`에 re-export
- AST kind 문자열은 tree-sitter 그래머 기준으로 주석 유지

### Ask first

- `@ast-grep/napi` major 버전 업그레이드 (kind 이름 변경 위험)
- 정적 분석을 LSP/TypeScript Compiler API 기반으로 교체

### Never do

- `core/`, `mcp/`, `hooks/` 역방향 import
- `@ast-grep/napi`를 top-level import (lazy 로딩 필수)

## Dependencies

- `@ast-grep/napi` (optional peer), `../types/`, `../constants/{ast-languages,decision-points}.js`
