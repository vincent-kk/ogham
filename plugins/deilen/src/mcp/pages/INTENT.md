## Purpose

뷰어·설정 프런트엔드 소스 컨테이너. 런타임 TS export 가 없는 정적 FE 빌드 입력으로, esbuild 가 `bridge/` 산출물로 묶는다.

## Structure

| Path        | Role                                              |
| ----------- | ------------------------------------------------- |
| `viewer/`   | 문서 뷰어 FE (HTML/CSS/JS + lazy 렌더러 entry)    |
| `settings/` | 설정 FE (HTML/CSS/JS)                             |
| `index.ts`  | 빌드 입력 표식 (`export {}`) — 런타임 export 없음 |

## Conventions

- 빌드 산출: `buildViewerHtml` → `bridge/viewer.html`, `buildSettingsHtml` → `bridge/settings.html`, `buildRenderers` → `bridge/assets/*.js`
- 산출물은 런타임에 `mcp/httpServer` 가 디스크에서 읽어 서빙 (MCP 번들 미포함)
- 외부 CDN·동봉 폰트 금지 (KaTeX 는 MathML)

## Boundaries

### Always do

- FE 자산은 빌드 스크립트(`scripts/build*.mjs`)로만 `bridge/` 에 산출

### Ask first

- 새 페이지 추가 (빌드 파이프라인 영향)
- 외부 라이브러리 추가

### Never do

- 빌드 산출물(`bridge/*.html`, `bridge/assets/*`) 직접 수정
- 이 디렉토리에서 런타임 TS 심볼 export

## Dependencies

- **빌드 시점**: `scripts/buildViewerHtml.mjs`, `buildSettingsHtml.mjs`, `buildRenderers.mjs` (`esbuild`)
- **런타임 의존성 없음**: 서빙은 `mcp/httpServer` 책임
