# pages — Contract

## Requirements

- MCP 서버가 로컬 HTTP 로 서빙하는 브라우저 페이지의 프런트엔드 소스 루트다. 현재 페이지는 `settings/` 하나다.
- 페이지는 순수 정적 파일(HTML/CSS/JS)이다. npm import 도, 빌드 스텝에 의존하는 코드도 두지 않는다 — 서버는 토큰 게이트 뒤에서 인라인 번들 하나만 서빙하므로 외부 참조는 로드되지 않는다.
- 서버 측 로직은 이 서브트리에 두지 않는다. HTTP 서버와 핸들러는 `mcp/tools/openSettings/` 가 소유한다.
- 빌드 시 `scripts/buildSettingsHtml.mjs` 가 페이지별로 단일 HTML 을 인라인 번들해 `public/` 에 낸다.

## API Contracts

- `index.ts` 는 `export {}` 인 빈 배럴이다. 이 fractal 의 산출물은 TypeScript 심볼이 아니라 정적 자산이며, 배럴은 FCA entry point 요건을 채우기 위해서만 존재한다.
- 자산 소비자는 이 배럴이 아니라 빌드 산출물 `public/settings.html` 을 읽는다. 소비 경로는 `mcp/tools/openSettings/utils/loadSettingsHtml.ts` 다.
- 새 페이지는 `settings/` 와 같은 구조(`index.html` + `scripts/` + `styles/`)를 따른다.

## Acceptance Criteria

### AC-pages-empty-barrel — 빈 배럴 유지

- `pages/index.ts` 가 런타임 값을 export 하지 않는다.

### AC-pages-static-only — 정적 자산만 보유

- `pages/**` 의 `.js` 파일에 `import` 문이나 `require(` 호출이 없다.
- `pages/**` 에 `.ts` 구현 파일이 없다(`index.ts` 배럴 제외).

### AC-pages-no-server-code — 서버 로직 부재

- `pages/**` 가 `node:http` 를 참조하지 않는다.

### AC-pages-structure-parity — 페이지 구조 동형

- 모든 페이지 디렉터리가 `index.html` 을 가진다.

## Last Updated

2026-08-06 — 정적 자산 루트와 빈 배럴 entry point 계약을 최초 문서화했다.
