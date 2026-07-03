# Rendering — Markdown Pipeline & Lazy-load

## 서버측 base 렌더

`render/markdownIt/markdownInstance.ts` 의 `markdown-it` 인스턴스(오케스트레이터 `render/operations/renderMarkdown.ts`)가 markdown → base HTML 을 생성한다. 무거운 시각화는 서버에서 렌더하지 않는다(클라이언트 lazy-load). 서버 책임은 ① 구조 HTML, ② source-line 매핑, ③ sanitize.

- `markdown-it({ html: true, linkify: true, typographer: true })` — GitHub 스타일 raw HTML(`<details>`/`<summary>` 등)을 직접 렌더한다.
- 표(GFM table) 활성. 코드펜스/수식/mermaid 는 **렌더하지 않고 표식만 남긴다**:
  - 코드펜스: `<pre><code class="language-XXX" data-lang="XXX">…원문…</code></pre>` (하이라이트는 클라이언트).
  - mermaid 펜스(` ```mermaid `): `<div class="deilen-mermaid" data-src="…원문…">` (그래프는 클라이언트).
  - 수식(`$…$`, `$$…$$`): `<span class="deilen-math" data-display="0|1">…원문…</span>` (조판은 클라이언트).
- sanitize: `render/sanitize/sanitizeHtml.ts` 가 출력 HTML 을 허용 태그/속성 화이트리스트로 정제 — `html:true` 이므로 **유일한 XSS 방어층**. Claude 산출이라도 신뢰 경계로 취급.
- raw HTML 처리 (`html_block`/`html_inline` 렌더러 규칙):
  - 토큰 단계에서 **raw 프로파일** 로 정제: 내부 예약 속성(`class`, `data-source-line`/`-end`, `data-lang`, `data-display`, `data-src`) 불허 — 작성자 HTML 이 lazy-load 렌더러를 위조 트리거하거나 라인 앵커를 위조하는 경로 차단. 콘텐츠 속성(`href`/`src`/`open`/`title`/`datetime`/`start` 등)만 허용.
  - `html_block` 은 정제 후 첫 여는 태그에 라인 앵커 주입(래퍼 div 는 `<details>` 열림/닫힘 블록 사이에 markdown 이 오는 GitHub 패턴의 DOM 을 깨므로 미사용). `html_inline` 은 map 이 없어 부모 블록 앵커로 커버.
  - sanitizer 강화: 주석/`<!DOCTYPE>`/CDATA/PI 제거, `script`/`style` 내용째 삭제, 승인 태그로 재구성되지 않은 잔여 `<` 전부 이스케이프(미완성 태그의 attribute-soup 재해석 차단), 속성값 엔티티 decode→검증→re-encode(`java&#115;cript:` 류 난독화 차단).
  - 허용 태그는 GitHub html-pipeline 패리티 지향(details/summary/dl/dt/dd/figure/figcaption/ins/q/cite/abbr/dfn/samp/var/small/time/wbr/ruby/rt/rp/caption/tfoot/b/i 추가; tt/strike/picture/source/bdo 제외).

## 로컬 이미지 (file://)

마크다운의 `![](file://…)` 이미지는 렌더 단계에서 src 를 세션 스코프 `/api/image/<sid>/<i>` 라우트로 치환한다(`render/markdownIt/imageRule.ts`, `env.imageRewrite`). 그래서 `file://` 원본은 sanitize 에 도달하지 않고, 최종 src 는 상대경로라 allowlist 를 통과한다. 통합 동기: 다른 워크스페이스의 분석 그래프(예: r-statistics 산출 PNG/SVG)를 절대경로로 참조해 표시.

- 인덱스 `<i>` 는 문서 내 `file://` 이미지 등장 순서(0-based). 렌더 치환과 `render/utils/walkLocalImages.ts` 가 동일 순회를 공유해 일치한다.
- `http(s)`/`data:`/상대경로 src 는 변형 없이 통과. POSIX 절대경로(`/abs/…`)는 사이트루트 상대로 해석돼 표시되지 않으므로 `file://` 로 적는다.
- 치환은 markdown 이미지 토큰(`![](file://…)`) 한정. raw `<img src="file://…">` 는 rewrite 를 타지 않고 sanitize 의 스킴 차단으로 제거된다 — 로컬 이미지는 markdown 문법으로 적어야 한다.
- 서빙은 `/api/image` 라우트가 viewer.md 멤버십(문서가 실제 참조한 경로)·표시 확장자(png/jpg/jpeg/gif/webp/svg)·`realpath`·`max_image_mb` 로 가드한다([web-ui.md](./web-ui.md)).
- markdown-it `validateLink` 는 `file://` 만 추가 허용(이미지 토큰 생성). `file://` 링크 href 는 sanitize 가 계속 제거한다.

## source-line 매핑

markdown-it 블록 토큰의 `token.map = [startLine, endLine]` 를 이용한다. core ruler 를 추가해 `nesting !== -1` 이고 `map` 이 있는 토큰에 `token.attrSet('data-source-line', String(map[0]))`, 끝줄은 `data-source-end` 로 주입.

- 결과: 모든 markdown 블록 요소가 원본 라인 범위를 보유 → 피드백 UI 의 라인 앵커가 된다.
- raw HTML 블록은 attrSet 이 기본 렌더러에 반영되지 않으므로, `html_block` 렌더러 규칙이 정제된 콘텐츠의 첫 여는 태그에 앵커를 문자열 주입한다. 닫는 태그로 시작하는 블록(`</details>` 등)과 `html_inline` 은 앵커 없음(선택 기반 코멘트는 조상 앵커로 동작).
- `render/markdownIt/sourceLinePlugin.ts` 가 이 ruler 를 정의. 렌더 메타(`{ html, lineCount, sourceLineIndex }`)를 함께 반환해 뷰어가 라인↔요소를 양방향 조회.

## 클라이언트 점진적 향상 (lazy-load)

base HTML 은 경량으로 즉시 표시되고, 무거운 렌더러는 **해당 노드가 실제 존재할 때만** 동적 import 한다. 모든 chunk 는 로컬 서버(`/assets/<chunk>`)에서 서빙 — 외부 CDN 미사용(오프라인·프라이버시).

| 기능            | 감지 조건                  | 동적 import 대상         |
| --------------- | -------------------------- | ------------------------ |
| 코드 하이라이트 | `pre code[data-lang]` 존재 | `/assets/highlight.js`   |
| Mermaid         | `.deilen-mermaid` 존재     | `/assets/mermaid.js`     |
| 수식(KaTeX)     | `.deilen-math` 존재        | `/assets/katex.js`(+css) |

```js
// pages/viewer/scripts/enhance.js (개념)
if (document.querySelector("pre code[data-lang]"))
  import("/assets/highlight.js").then((m) => m.highlightAll());
if (document.querySelector(".deilen-mermaid"))
  import("/assets/mermaid.js").then((m) => m.renderAll());
if (document.querySelector(".deilen-math"))
  import("/assets/katex.js").then((m) => m.typesetAll());
```

- 미사용 렌더러는 **0 바이트 로드** — 브라우저 메모리·초기 페인트 최소화(요구사항).
- chunk 는 전용 `buildRenderers.mjs` 가 렌더러당 독립 브라우저 엔트리로 빌드한 `bridge/assets/*.js`. base `viewerHtml.ts` 에 인라인되지 않는다. 상세는 [mcp-runtime.md](./mcp-runtime.md).
- 렌더 실패(예: 잘못된 mermaid 문법)는 해당 블록만 원문 fallback + 인라인 에러 배지, 페이지 전체는 유지.
- **클라이언트 렌더 보안**: Mermaid `securityLevel:'strict'`, KaTeX `trust:false`. 서버 sanitize 는 클라이언트 생성 SVG/HTML 에 미치지 않으므로 생성물도 클라이언트에서 정제.
- 감지 조건의 class/data 속성은 서버 렌더러만 산출 가능 — raw HTML 유래 마크업은 raw 프로파일 정제로 해당 속성을 가질 수 없어, 작성자 HTML 이 lazy-load 렌더러를 임의 트리거하지 못한다.
- **KaTeX CSS·폰트**: `buildRenderers.mjs` 가 `katex.css` + woff2 폰트도 `bridge/assets/` 에 산출, 로더가 `<link>` 주입(자산 인증은 web-ui 자산 라우트 정책에 따름).

## 적재 비용 분리 (런타임 · 브라우저 · 디스크)

"용량"은 셋으로 분리되며, 무거운 렌더러는 ①·②에 전혀 포함되지 않는다.

| 용량                            | 내용                                        | Mermaid 등 포함 |
| ------------------------------- | ------------------------------------------- | --------------- |
| ① MCP 런타임 (`mcp-server.cjs`) | markdown-it(서버 base) + HTTP 서버 + 핸들러 | 아니오          |
| ② 브라우저 탭                   | 동적 import 된 렌더러 chunk                 | 사용 시에만     |
| ③ 설치 디스크 (동봉 자산)       | `bridge/assets/*.js` chunk                  | 예 (유일 비용)  |

- 서버 코드는 mermaid/katex/highlight 를 **절대 `import` 하지 않는다**. `handleGetAsset` 가 `fs` 로 바이트만 스트리밍 → Node 가 파싱·실행하지 않음 → MCP 런타임 메모리 불변.
- 브라우저는 해당 노드 감지 시에만 `import('/assets/*.js')` → 미사용 렌더러는 fetch 자체가 없음(탭 메모리 0).
- 정책: **전부 동봉 + lazy 서빙** — highlight/KaTeX/Mermaid 모두 `bridge/assets/` 에 chunk 로 동봉, 무설정·오프라인 보장. 비용은 설치 용량(③)뿐.
- 빌드 가드: `buildMcpServer.mjs` 가 `mcp-server.cjs` 번들에 `mermaid|katex|highlight` 포함 시 빌드 실패(cennad `FORBIDDEN_PATTERNS` 선례) — ①을 구조적으로 강제.
- `config.renderers.{mermaid,highlight,math}=false` 는 동봉을 막지 않고 클라이언트 감지·import 만 건너뛴다(강제 비활성).

## 테마

- `config.theme`: `light | dark | auto`(prefers-color-scheme). `RenderOptions.theme` 로 호출별 override.
- CSS 변수 토큰(`--bg`, `--text`, `--accent` 등) 기반 — skill-creator viewer 의 팔레트 구조 참고.
- 본문 폭(`--content-width`), 폰트는 config 노출.

## 라인 앵커 ↔ 피드백

- 각 블록의 `data-source-line`/`data-source-end` 가 코멘트 앵커(`{ startLine, endLine, sourceText }`)의 근거.
- 텍스트 선택(Range) 시 가장 가까운 `[data-source-line]` 조상에서 라인 범위 산출.
- 자세한 피드백 페이로드는 [feedback-protocol.md](./feedback-protocol.md).
