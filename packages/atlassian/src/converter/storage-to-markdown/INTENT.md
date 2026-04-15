# storage-to-markdown

## Purpose

Confluence Storage Format XHTML을 Markdown 텍스트로 변환하는 순수 함수 모듈.
자체 HTML 파서를 사용하며, 파싱 실패 시 태그 제거 폴백으로 안전하게 복원한다.

## Structure

| 파일 | 역할 |
|---|---|
| `storage-to-markdown.ts` | 진입점 — 파싱 → 렌더링 → 공백 정규화, 오류 시 폴백 |
| `parse-html.ts` | 재귀 하강 방식 HTML/XHTML 파서 (CDATA, 주석, void 요소 처리) |
| `html-node.ts` | `HtmlElement` / `HtmlNode` 타입 정의 |
| `render-storage-node.ts` | HtmlNode를 Markdown 문자열로 재귀 변환 |
| `render-storage-table.ts` | table/thead/tbody/tr/td/th를 GFM 파이프 테이블로 렌더링 |
| `index.ts` | 배럴 — `storageToMarkdown` 단일 재수출 |

## Boundaries

### Always do

- 파싱 오류 발생 시 `strip-tags-fallback`으로 안전하게 폴백한다
- `ac:structured-macro`는 blockquote 형태로 표현한다
- 연속 3개 이상 개행을 2개로 정규화한다

### Ask first

- 외부 HTML 파싱 라이브러리(예: `node-html-parser`) 도입
- 새 Confluence 전용 태그(`ac:`, `ri:`) 처리 규칙 추가

### Never do

- `core/`, `mcp/` 디렉터리에서 임포트하지 않는다
- HTTP 호출, 파일 I/O, 인증 로직을 포함하지 않는다
- 파싱 실패를 예외로 전파하지 않는다 (반드시 폴백 처리)

## Dependencies

- `./html-node.ts` — HtmlNode 타입 (내부 organ)
- `./strip-tags-fallback.ts` — 폴백 텍스트 추출 (내부 organ)
