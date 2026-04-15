# markdown-to-storage

## Purpose

Markdown 텍스트를 Confluence Storage Format XHTML 문자열로 변환하는 순수 함수 모듈.
코드 블록은 `ac:structured-macro`, 이미지는 `ac:image` 태그로 출력한다.

## Structure

| 파일 | 역할 |
|---|---|
| `markdown-to-storage.ts` | 진입점 — 빈 입력 처리 후 렌더러에 위임 |
| `render-blocks.ts` | MarkdownBlock 배열을 Storage Format XML 문자열로 변환 |
| `render-inline.ts` | 인라인 토큰을 XML 이스케이프된 Storage Format 태그로 변환 |
| `index.ts` | 배럴 — `markdownToStorage` 단일 재수출 |

## Boundaries

### Always do

- XML 특수문자(`&`, `<`, `>`, `"`)를 항상 이스케이프 처리한다
- 코드 블록은 `ac:structured-macro` + `CDATA` 래퍼로 출력한다
- 블록 파싱은 `../markdown-parsing/`에 위임한다

### Ask first

- 새 Confluence 매크로 타입 지원 추가
- Storage Format 스키마 버전 변경

### Never do

- `core/`, `mcp/` 디렉터리에서 임포트하지 않는다
- HTTP 호출, 파일 I/O, 인증 로직을 포함하지 않는다
- XML 이스케이프를 생략하거나 우회하지 않는다

## Dependencies

- `../markdown-parsing/parse-blocks.ts` — 블록 파싱 (sibling fractal)
- `../markdown-parsing/tokenize-inline.ts` — 인라인 토큰화 (sibling fractal)
