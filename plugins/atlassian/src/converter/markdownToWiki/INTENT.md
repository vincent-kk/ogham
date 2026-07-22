# markdownToWiki

## Purpose

Markdown 텍스트를 Jira Wiki Markup 문자열로 변환하는 순수 함수 모듈.
Jira Server/DC v2 REST API의 본문 포맷으로 사용된다.

## Structure

| 파일                | 역할                                                                   |
| ------------------- | ---------------------------------------------------------------------- |
| `markdownToWiki.ts` | 진입점 — `markdownToWiki(md): string`                                  |
| `renderBlocks.ts`   | MarkdownBlock 배열을 Wiki 블록 문자열로 변환                           |
| `renderInline.ts`   | 인라인 토큰을 Wiki 인라인 마크업으로 변환 + 리터럴 특수문자 이스케이프 |
| `index.ts`          | 배럴 — `markdownToWiki` 단일 재수출                                    |

## Boundaries

### Always do

- 빈 입력에 대해 빈 문자열을 반환한다
- 블록 파싱은 `../markdownParsing/`에 위임한다
- 알 수 없는 토큰은 throw 없이 raw text로 fallback 처리한다
- text·code·strong·em·strike 토큰의 wiki 특수문자(`[]{}|*_-+^~!`)를 `\`로 이스케이프한다 — 기존 `\X`는 통과, link/image 본문은 원문 유지 (`\` 이스케이프가 링크 파싱을 깨거나 alt에 노출됨)

### Ask first

- 새 Markdown 구문 지원 추가
- Jira Wiki Markup 매핑 규칙 변경

### Never do

- `core/`, `mcp/` 디렉터리에서 임포트하지 않는다
- HTTP 호출, 파일 I/O, 인증 로직을 포함하지 않는다
- Markdown 토큰화/파싱 로직을 이 모듈 내부에 직접 구현하지 않는다

## Dependencies

- `../markdownParsing/` — 블록 파싱 + 인라인 토큰화 (sibling fractal)
