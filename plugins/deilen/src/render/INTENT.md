## Purpose

markdown → source-line 매핑 base HTML 을 생성하는 서버측 렌더 파이프라인. 무거운 시각화(Mermaid/highlight/KaTeX)는 렌더하지 않고 **표식만** 남겨 클라이언트 lazy-load 에 위임한다. 출력은 allowlist 로 sanitize 한다.

## Structure

| Path          | Role                                                            |
| ------------- | --------------------------------------------------------------- |
| `operations/` | `renderMarkdown` (오케스트레이터) + `RenderMeta`                |
| `markdownIt/` | markdown-it 인스턴스 + math/task/source-line/image 규칙 (organ) |
| `sanitize/`   | allowlist HTML 정제 (태그·속성·URL 스킴) (organ)                |
| `utils/`      | `lineAttrs`·`collectSourceLines`·`walkLocalImages` (organ)      |
| `index.ts`    | barrel                                                          |

## Conventions

- markdown-it `html:true` + `linkify` + `typographer` — raw HTML(GitHub 스타일
  `<details>` 등)은 토큰 단계에서 raw 프로파일 정제 후 첫 여는 태그에 라인 앵커 주입
- 코드펜스→`<pre><code data-lang>`, ` ```mermaid `→`<div class="deilen-mermaid">`, `$…$`/`$$…$$`→`<span class="deilen-math" data-display>`, `- [x]`→`<li class="deilen-task-item"><span class="deilen-task-checkbox">`
- source-line 은 1-based: `data-source-line`=시작(포함), `data-source-end`=끝(markdown-it map[1])
- `file://` 이미지 src→`/api/image/<sid>/<i>` 치환(`imageRewrite` env, 문서 순서); 그 외 스킴 불변

## Boundaries

### Always do

- 모든 출력 HTML 은 `sanitizeHtml` 통과 — `html:true` 이므로 sanitizer 가 유일한
  XSS 방어층
- 블록 토큰에 source-line 앵커 주입 (raw HTML 블록은 첫 여는 태그에 주입)
- raw HTML 유래 콘텐츠는 raw 프로파일로 정제 (내부 class/`data-*` 불허)

### Ask first

- 새 markdown-it 플러그인/규칙 추가
- sanitize allowlist(태그·속성·스킴) 확장

### Never do

- raw HTML 유래 속성에 내부 예약 class(`deilen-*`)·`data-source-*` 허용 (렌더러
  트리거·앵커 위조 경로)
- sanitize 를 우회하는 출력 경로 추가
- 서버에서 Mermaid/KaTeX/highlight 라이브러리 import·실행 (브라우저 자산)

## Dependencies

- `markdown-it` (+ `@types/markdown-it`)
- 내부: `sanitize`, `markdownIt`(sourceLinePlugin), `utils`(collectSourceLines)
