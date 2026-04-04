# ast -- AST 분석 모듈

## Purpose

`@ast-grep/napi` 기반 AST 파싱 및 정적 분석 기능을 제공한다. 순환 복잡도(CC), 응집도(LCOM4), 의존성 추출, 트리 비교 등을 수행한다.

## Structure

| 모듈 | 역할 |
|------|------|
| `parser` | 소스 코드 파싱 및 AST 노드 순회 |
| `ast-grep-shared` | ast-grep 공유 유틸리티 (언어 매핑, 포맷터) |
| `cyclomatic-complexity` | 순환 복잡도 계산 |
| `dependency-extractor` | import/export 의존성 추출 |
| `lcom4` | 클래스 응집도 (LCOM4) 계산 |
| `tree-diff` | AST 트리 비교 |

## Boundaries

### Always do
- AST 분석 함수는 순수 함수로 유지 (파일 I/O는 parser에서만)
- 새 분석 기능 추가 시 `src/index.ts`에 re-export

### Ask first
- `@ast-grep/napi` 버전 업그레이드 (호환성 영향)

### Never do
- `core/`, `mcp/`, `hooks/` 모듈 직접 import

## Dependencies
- `@ast-grep/napi`, `../types/`
