# Rendering — Markdown Pipeline & Lazy-load

## 서버측 base 렌더

`render/markdownRenderer.ts` 의 `markdown-it` 인스턴스가 markdown → base HTML 을 생성한다. 무거운 시각화는 서버에서 렌더하지 않는다(클라이언트 lazy-load). 서버 책임은 ① 구조 HTML, ② source-line 매핑, ③ sanitize.

- `markdown-it({ html: false, linkify: true, typographer: true })` — 원본 HTML 비허용(XSS 차단 1차).
- 표(GFM table) 활성. 코드펜스/수식/mermaid 는 **렌더하지 않고 표식만 남긴다**:
  - 코드펜스: `<pre><code class="language-XXX" data-lang="XXX">…원문…</code></pre>` (하이라이트는 클라이언트).
  - mermaid 펜스(` ```mermaid `): `<div class="dalen-mermaid" data-src="…원문…">` (그래프는 클라이언트).
  - 수식(`$…$`, `$$…$$`): `<span class="dalen-math" data-display="0|1">…원문…</span>` (조판은 클라이언트).
- sanitize: `render/sanitize.ts` 가 출력 HTML 을 허용 태그/속성 화이트리스트로 정제(2차). Claude 산출이라도 신뢰 경계로 취급.

## source-line 매핑

markdown-it 블록 토큰의 `token.map = [startLine, endLine]` 를 이용한다. core ruler 를 추가해 `nesting !== -1` 이고 `map` 이 있는 토큰에 `token.attrSet('data-source-line', String(map[0]))`, 끝줄은 `data-source-end` 로 주입.

- 결과: 모든 블록 요소가 원본 markdown 라인 범위를 보유 → 피드백 UI 의 라인 앵커가 된다.
- `render/sourceLineMap.ts` 가 이 ruler 를 정의. 렌더 메타(`{ html, lineCount, title, sourceLineIndex }`)를 함께 반환해 뷰어가 라인↔요소를 양방향 조회.

## 클라이언트 점진적 향상 (lazy-load)

base HTML 은 경량으로 즉시 표시되고, 무거운 렌더러는 **해당 노드가 실제 존재할 때만** 동적 import 한다. 모든 chunk 는 로컬 서버(`/assets/<chunk>`)에서 서빙 — 외부 CDN 미사용(오프라인·프라이버시).

| 기능            | 감지 조건                  | 동적 import 대상         |
| --------------- | -------------------------- | ------------------------ |
| 코드 하이라이트 | `pre code[data-lang]` 존재 | `/assets/highlight.js`   |
| Mermaid         | `.dalen-mermaid` 존재      | `/assets/mermaid.js`     |
| 수식(KaTeX)     | `.dalen-math` 존재         | `/assets/katex.js`(+css) |

```js
// pages/report/scripts/enhance.js (개념)
if (document.querySelector("pre code[data-lang]"))
  import("/assets/highlight.js").then((m) => m.highlightAll());
if (document.querySelector(".dalen-mermaid"))
  import("/assets/mermaid.js").then((m) => m.renderAll());
if (document.querySelector(".dalen-math"))
  import("/assets/katex.js").then((m) => m.typesetAll());
```

- 미사용 렌더러는 **0 바이트 로드** — 브라우저 메모리·초기 페인트 최소화(요구사항).
- chunk 는 전용 `buildRenderers.mjs` 가 렌더러당 독립 브라우저 엔트리로 빌드한 `bridge/assets/*.js`. base `reportHtml.ts` 에 인라인되지 않는다. 상세는 [mcp-runtime.md](./mcp-runtime.md).
- 렌더 실패(예: 잘못된 mermaid 문법)는 해당 블록만 원문 fallback + 인라인 에러 배지, 페이지 전체는 유지.
- **클라이언트 렌더 보안**: Mermaid `securityLevel:'strict'`, KaTeX `trust:false`. 서버 sanitize 는 클라이언트 생성 SVG/HTML 에 미치지 않으므로 생성물도 클라이언트에서 정제.
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
