## Purpose

문서 뷰어 프런트엔드. 렌더된 HTML 을 마운트하고 테마·복사·라인 단위 코멘트를 제공하며, 무거운 렌더러는 lazy-load 한다. 빌드 시 단일 `bridge/viewer.html` 로 inline+minify 된다.

## Structure

| Path                                       | Role                                              |
| ------------------------------------------ | ------------------------------------------------- |
| `index.html`                               | 단일 페이지 마크업, `__DEILEN_STATE__` 슬롯       |
| `styles/styles.css`                        | 테마(light/dark/auto) 토큰·타이포                 |
| `scripts/app.js`                           | 진입점 — state hydrate·마운트·테마·heartbeat      |
| `scripts/enhance.js`                       | `/assets/*` lazy import (highlight/mermaid/katex) |
| `scripts/{comments,images,submit,copy}.js` | 코멘트·이미지·피드백 전송·복사                    |
| `renderers/*.entry.ts`                     | 무거운 렌더러 esbuild 진입점 → `bridge/assets/`   |
| `index.ts`                                 | 빌드 입력 표식 (`export {}`)                      |

## Conventions

- 모든 fetch 는 `?token=` 부착 (state 의 token); POST body 는 JSON 또는 multipart(이미지)
- 무거운 렌더러는 `/assets/*` 로 lazy — 실패 시 읽을 수 있는 source fallback 유지
- 동봉 폰트 없음: KaTeX 는 MathML, highlight 는 page CSS, mermaid 는 SVG
- `prefers-reduced-motion`·`prefers-color-scheme` 존중
- 푸터 제출은 2 의도(`revise`/`discuss`, 동일 스타일·disabled 만 색조 구분) + 상단바 Close(`dismiss`). 코멘트 하이라이트는 앰버(`--mark`), 작성 중은 더스티 로즈(`--pending`) — 앰버·회색 선택·보라 accent 모두와 구분

## Boundaries

### Always do

- 무거운 렌더러는 lazy chunk 로 분리 (MCP 번들·HTML inline 금지)
- fetch 에 `?token=` 부착

### Ask first

- 새 lazy 렌더러·스크립트 추가
- 외부 라이브러리 추가

### Never do

- `eval`·inline 핸들러·외부 origin fetch
- 빌드 산출물(`bridge/viewer.html`, `bridge/assets/*`) 직접 수정

## Dependencies

- **빌드 시점**: `scripts/buildViewerHtml.mjs`·`buildRenderers.mjs` (`esbuild`), `highlight.js`/`mermaid`/`katex`
- **런타임 의존성 없음**: 브라우저 native API 만
