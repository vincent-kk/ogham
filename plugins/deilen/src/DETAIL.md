# src — Contract

## Requirements

- 레이어 의존 방향은 `mcp` → `render`/`core` → `types`/`constants`/`lib`/`utils` 한 방향이며 역방향 edge 는 0이다.
- `core` 는 네트워크를 모른다 — 디스크와 메모리만 다루고 HTTP 는 `mcp/httpServer` 소관이다.
- `render` 는 브라우저 렌더 라이브러리를 import 하지 않는다 — 표식만 남기고 실제 렌더는 클라이언트가 한다.
- 디스크 JSON 키는 snake_case(외부 인터페이스), TypeScript 심볼과 파일명은 camelCase 다.
- 값집합은 `types/enums.ts` 가 단일 출처다.
- `version.ts` 는 `yarn version:sync` 로만 갱신한다.

## API Contracts

- 배포 진입점은 esbuild 가 `mcp/serverEntry/` 로부터 만드는 `bridge/mcp-server.cjs` 와 `public/` FE 산출물이다. `package.json:files` 에 `src`·`dist` 가 없으므로 npm 라이브러리 표면은 없다.
- `src/index.ts` 는 버전 상수, `render` 공개 API(`renderMarkdown`, `sanitizeHtml`, `RenderMeta`), `types/` 공개 타입을 이름으로 노출한다. `mcp/` 를 재노출하지 않는다 — `mcp/server/lifecycle/createServer.ts` 가 `version.ts` 를 참조하므로 재노출은 `src → mcp → server → src` 순환이 된다.
- 서버 수명주기(`createServer`, `startServer`)와 HTTP 싱글톤(`ensureHttpServer`, `getHttpServer`)은 `mcp/` 배럴이 소유한다.

## Acceptance Criteria

### AC-src-layering — 단방향 레이어

- `core/` 에서 `mcp/` 를 참조하는 import 가 0건이다.
- `render/` 에 mermaid·katex·highlight import 가 0건이다.

### AC-src-single-source — 값 단일 출처

- 상태·모드 문자열이 `types/enums.ts` 에서만 온다.
- 디스크 경로가 `constants/paths.ts` 에서만 온다.

### AC-src-generated — 생성물 불가침

- `version.ts`, `bridge/`, `public/` 에 손편집 흔적이 없다.

## Boundary Exemptions

### version.ts — Generated version constant has no entry point

- **Consumers**: `**/src/**`
- **Direct import**: allowed
- **Reason**: `version.ts` 는 `scripts/injectVersion.mjs` 가 생성하는 단일 상수 파일이고 아무것도 import 하지 않는다. `src/index.ts` 배럴을 경유시키면 `src → mcp → server → src` 순환이 생기는데, 상수 하나 때문에 사이클을 사는 거래는 성립하지 않는다.

## Last Updated

2026-07-30 — 레이어 계약을 문서화하고 생성된 `version.ts` 참조 면책을 선언했다.
