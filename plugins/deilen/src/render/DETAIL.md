# render — DETAIL

## Requirements

- markdown 본문을 source-line 매핑된 base HTML 로 변환한다.
- GFM 표를 렌더한다.
- GFM task list(`- [x]`/`- [ ]`)를 체크박스 마커(`<span>`)로 렌더한다.
- 코드펜스/mermaid/수식은 **렌더하지 않고 표식만** 남긴다 (클라이언트 lazy-load 대상).
- 모든 블록 요소에 1-based 원본 라인 앵커를 부여한다.
- raw HTML(GitHub 스타일 `<details>`/`<summary>` 등)을 직접 렌더한다 (`html:true`).
  - raw HTML 유래 콘텐츠는 토큰 단계에서 **raw 프로파일** 로 정제한다: 내부 예약
    속성(`class`, `data-source-line`/`-end`, `data-lang`, `data-display`, `data-src`)
    불허 — 클라이언트 렌더러 위조·앵커 위조 차단. 콘텐츠 속성(`href`, `src`,
    `open`, `title` 등)만 허용.
  - `html_block` 은 정제 후 첫 여는 태그에 라인 앵커를 주입한다 (래퍼 div 는
    `<details>` 열림/닫힘 블록 사이에 markdown 이 오는 GitHub 패턴의 DOM 구조를
    깨므로 사용하지 않는다). 첫 토큰이 태그로 시작하지 않으면 앵커 없음(열화 허용).
  - `html_inline` 은 map 이 없어 앵커를 갖지 않는다 (부모 블록 앵커로 커버).
  - raw `<img src="file://…">` 는 imageRewrite 를 타지 않으며 스킴 차단으로 제거된다
    — file:// 이미지는 markdown 문법(`![](file://…)`)만 지원.
- 출력 HTML 은 allowlist sanitize 로 정제한다. `html:true` 전환으로 sanitizer 가
  **유일한 XSS 방어층** 이다:
  - allowlist 외 태그 제거(내부 텍스트 보존). 단 `script`/`style` 은 **내용째** 삭제.
  - HTML 주석·`<!DOCTYPE>`·`<![CDATA[`·`<? … ?>` 제거 (미종결 시 문자열 끝까지).
  - 승인 태그로 재구성되지 않은 잔여 `<` 는 전부 `&lt;` 로 이스케이프 — 미완성
    태그(`<div onclick=x` + 무 `>`)가 브라우저에서 attribute-soup 로 재해석되는
    경로 차단.
  - 속성값은 엔티티 **decode → 검증 → re-encode**. `href`/`src` 는 decode 후 제어
    문자를 제거한 값으로 스킴 검사 — `java&#115;cript:`·`java&colon;script:` 류
    난독화 우회 차단.
- `file://` 이미지 src 는 `/api/image/<sid>/<i>` 라우트로 치환해 뷰어가 로컬 이미지를
  표시할 수 있게 한다(http/https/data/상대 스킴은 불변).

## API Contracts

- `renderMarkdown(markdown: string, options?: { imageRewrite?: { sessionId, token } }): RenderMeta`
  - `html`: sanitize 된 base HTML
  - `lineCount`: 원본 markdown 라인 수 (빈 문자열은 0)
  - `sourceLineIndex`: `Array<{ startLine, endLine }>` — 앵커 가능한 블록 범위 목록
  - `options.imageRewrite` 지정 시 `file://` 이미지 src 를 `/api/image/<sid>/<i>`(문서 순서 인덱스)로 치환; 그 외 스킴은 불변
- `walkLocalImages(markdown, visit): void`
  - `file://` 이미지 src 를 문서 순서로 방문 — 렌더 치환과 동일 인덱스. `/api/image` 서빙이 "이 문서가 참조한 경로" 멤버십을 복원하는 단일 소스
- `sanitizeHtml(html: string, profile?: "rendered" | "raw"): string`
  - `rendered`(기본): markdown-it 산출 HTML 용 — 내부 예약 속성 허용
  - `raw`: 작성자 raw HTML 용 — 내부 예약 속성 불허 (markdownIt 렌더러 규칙에서 사용)
  - 두 프로파일 공통: 주석/선언/PI/CDATA 제거, script/style 내용째 삭제, allowlist 외
    태그 제거(텍스트 보존), 잔여 `<` 이스케이프, 속성 decode→검증→re-encode
  - `href`/`src` 위험 스킴(`javascript:` 등) 제거, `img` 만 `data:image/` 허용
  - `th`/`td` 의 `style` 은 `text-align:(left|right|center)` 만 허용
- `sourceLinePlugin(markdownIt: MarkdownIt): void` — core ruler 등록 (블록 토큰 `data-source-line`/`-end`)

## Allowlist (GitHub 패리티)

- 기존 33개 태그 + `details summary b i ins dl dt dd q cite abbr dfn samp var small
time wbr figure figcaption caption tfoot ruby rt rp` (GitHub html-pipeline 허용
  집합 기준; `tt`/`strike`(구식), `picture`/`source`(srcset 파싱 필요), `bdo` 는 제외)
- 콘텐츠 속성: `details[open]`, `time[datetime]`, `abbr[title]`, `ol[start]`
  (`<ol start>` 는 markdown-it 자체 산출물이기도 한 기존 결함 수정)

## Markers (클라이언트 계약)

- 코드: `<pre data-source-line><code class="language-X" data-lang="X">…원문…</code></pre>`
- mermaid: `<div class="deilen-mermaid" data-source-line><pre class="deilen-mermaid-src">…원문…</pre></div>`
- 수식: `<span class="deilen-math" data-display="0|1">…원문…</span>` (display 는 `<p class="deilen-math-block">` 로 감쌈)
- task list: `<li class="deilen-task-item[ checked]" data-source-line><span class="deilen-task-checkbox[ checked]"></span>…</li>` (체크 시각화는 CSS)
- raw HTML 블록: 첫 여는 태그에 `data-source-line`/`data-source-end` 주입 — 뷰어
  anchorTargets(직계 자식 수집)가 그대로 인식. 내부 예약 class/data-\* 는 raw 유래
  에서 등장 불가.

## Acceptance

- 표/코드/mermaid/inline·display 수식/task list 표식이 각각 정확히 생성된다.
- 모든 markdown 블록에 `data-source-line` 이 부여되고, raw HTML 블록은 첫 여는
  태그에 부여된다.
- `<details><summary>` 블록이 구조 그대로 렌더되고 `open` 속성이 보존된다.
- `<script>`(내용 포함), `onload=` 류 핸들러, `javascript:` URL(엔티티 난독화 포함),
  HTML 주석, raw 유래 `class="deilen-*"`/`data-source-line` 위조가 출력에서 제거된다.
- 미완성 태그의 잔여 `<` 가 이스케이프되어 후속 마크업을 삼키지 못한다.
