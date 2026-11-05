# pages — Contract

## Requirements

- MCP 서버가 로컬 HTTP 로 서빙하는 브라우저 페이지의 프런트엔드 소스 루트다.
- 페이지는 순수 정적 파일(HTML/CSS/JS)이다. npm import 도, 빌드 스텝에 의존하는 코드도 두지 않는다 — 서버는 토큰 게이트 뒤에서 인라인 번들 하나만 서빙하므로 외부 참조는 로드되지 않는다.
- 서버 측 로직은 이 서브트리에 두지 않는다. HTTP 서버와 핸들러는 `mcp/tools/openSettings/` 가 소유한다.
- 정본 자산을 공식 빌드로 인라인한다. 런타임 산출물을 직접 편집하지 않는다.

## API Contracts

- 빈 배럴은 정적 자산의 경계를 표시할 뿐 런타임 심볼을 제공하지 않는다. 소비자는 빌드된 HTML을 읽는다.
- 새 페이지도 마크업·독립 스크립트·스타일을 인라인하는 구조를 유지한다. 토큰 없는 자산 라우트에 의존하지 않는다.

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

정적 자산의 빌드·배송 경계의 내용과 근거가 바뀔 때 갱신한다.
