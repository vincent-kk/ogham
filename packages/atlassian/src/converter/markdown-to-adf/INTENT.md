# markdown-to-adf

## Purpose

Markdown 텍스트를 ADF(Atlassian Document Format) JSON 문서로 변환하는 순수 함수 모듈.
파싱된 블록/인라인 토큰을 ADF 노드 트리로 조립한다.

## Structure

| 파일 | 역할 |
|---|---|
| `markdown-to-adf.ts` | 진입점 — doc 루트 노드 조립 및 빈 입력 처리 |
| `render-blocks.ts` | MarkdownBlock 배열을 ADF 블록 노드로 변환 |
| `render-inline.ts` | 인라인 토큰을 마크가 적용된 ADF text 노드로 변환 |
| `index.ts` | 배럴 — `markdownToAdf` 단일 재수출 |

## Boundaries

### Always do

- 빈 입력에 대해 빈 paragraph를 포함한 유효한 doc 노드를 반환한다
- 블록 파싱은 `../markdown-parsing/`에 위임한다
- `AdfNode` 타입은 `../types/`에서 가져온다

### Ask first

- 새 Markdown 구문 지원 추가 (블록 파서와 동시 변경 필요 시)
- ADF 스키마 버전 변경

### Never do

- `core/`, `mcp/` 디렉터리에서 임포트하지 않는다
- HTTP 호출, 파일 I/O, 인증 로직을 포함하지 않는다
- Markdown 토큰화/파싱 로직을 이 모듈 내부에 직접 구현하지 않는다

## Dependencies

- `../markdown-parsing/parse-blocks.ts` — 블록 파싱 (sibling fractal)
- `../markdown-parsing/tokenize-inline.ts` — 인라인 토큰화 (sibling fractal)
- `../types/adf-node.ts` — AdfNode 타입 정의 (internal organ)
