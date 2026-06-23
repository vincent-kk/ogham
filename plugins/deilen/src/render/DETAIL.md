# render — DETAIL

## Requirements

- markdown 본문을 source-line 매핑된 base HTML 로 변환한다.
- GFM 표를 렌더한다.
- GFM task list(`- [x]`/`- [ ]`)를 체크박스 마커(`<span>`)로 렌더한다.
- 코드펜스/mermaid/수식은 **렌더하지 않고 표식만** 남긴다 (클라이언트 lazy-load 대상).
- 모든 블록 요소에 1-based 원본 라인 앵커를 부여한다.
- 출력 HTML 은 allowlist sanitize 로 스크립트·이벤트 핸들러·위험 URL 스킴을 제거한다.

## API Contracts

- `renderMarkdown(markdown: string): RenderMeta`
  - `html`: sanitize 된 base HTML
  - `lineCount`: 원본 markdown 라인 수 (빈 문자열은 0)
  - `title`: 첫 H1 의 텍스트 (없으면 `""`)
  - `sourceLineIndex`: `Array<{ startLine, endLine }>` — 앵커 가능한 블록 범위 목록
- `sanitizeHtml(html: string): string`
  - allowlist 외 태그 제거(내부 텍스트 보존), allowlist 외 속성 제거
  - `href`/`src` 위험 스킴(`javascript:` 등) 제거, `img` 만 `data:image/` 허용
  - `th`/`td` 의 `style` 은 `text-align:(left|right|center)` 만 허용
- `sourceLinePlugin(md: MarkdownIt): void` — core ruler 등록 (블록 토큰 `data-source-line`/`-end`)

## Markers (클라이언트 계약)

- 코드: `<pre data-source-line><code class="language-X" data-lang="X">…원문…</code></pre>`
- mermaid: `<div class="deilen-mermaid" data-source-line><pre class="deilen-mermaid-src">…원문…</pre></div>`
- 수식: `<span class="deilen-math" data-display="0|1">…원문…</span>` (display 는 `<p class="deilen-math-block">` 로 감쌈)
- task list: `<li class="deilen-task-item[ checked]" data-source-line><span class="deilen-task-checkbox[ checked]"></span>…</li>` (체크 시각화는 CSS)

## Acceptance

- 표/코드/mermaid/inline·display 수식/task list 표식이 각각 정확히 생성된다.
- 모든 블록에 `data-source-line` 이 부여된다.
- `<script>`, `onload=`, `javascript:` URL 이 출력에서 제거된다.
