# src — Contract

## Requirements

- 이 소스 트리의 유일한 닻은 검색 **누락 방지(recall)** 다. 편의를 위해 결과를 줄이는 결정은 어디에도 두지 않는다.
- 의존 방향은 `mcp → adapters → core → httpClient → NCBI` 한 방향이다. 역방향 edge 는 0이다.
- 검색 하드 규칙(10k 상한 분할·auto-POST·rate·dedup)은 `core` 가 소유한다. LLM 도, MCP 계층도 아니다.
- 문자열 값집합은 `types/enums.ts`, 메시지·경로·기본값은 `constants/*` 가 단일 출처다.
- `api_key` 는 MCP 응답·로그·manifest 어디에도 값으로 나타나지 않는다.
- `version.ts` 는 `version:sync` 로만 갱신한다.

## API Contracts

- 배포 진입점은 esbuild 가 `mcp/serverEntry/` 로부터 만드는 `bridge/mcp-server.cjs` 와 `public/settings.html` 이다.
- `src/index.ts` 는 버전 상수만 노출한다. `mcp/` 를 재노출하지 않는다 — `server/lifecycle/createServer.ts` 가 `version.ts` 를 참조하므로 재노출은 `src → mcp → server → src` 순환이 된다.
- 서버 수명주기(`createServer`, `startServer`)는 `mcp/` 배럴이 소유한다.

## Acceptance Criteria

### AC-src-layering — 단방향 레이어

- `core/` 에서 `mcp/`·`adapters/` 를 참조하는 import 가 0건이다.
- `mcp/` 안에 검색 하드 규칙 구현이 없다.

### AC-src-single-source — 값 단일 출처

- 인라인 문자열 리터럴 대신 `types/enums.ts`·`constants/*` 의 심볼이 쓰인다.

### AC-src-secrecy — 자격증명 비노출

- `api_key` 값이 도구 응답·로그·manifest 에 나타나지 않는다.

## Boundary Exemptions

### version.ts — Generated version constant has no entry point

- **Consumers**: `**/src/**`
- **Direct import**: allowed
- **Reason**: `version.ts` 는 `scripts/injectVersion.mjs` 가 생성하는 단일 상수 파일이고 아무것도 import 하지 않는다. `src/index.ts` 배럴을 경유시키면 `src → mcp → server → src` 순환이 생기므로, 이 참조는 경계를 넘는 대신 면책을 받는다.

## Last Updated

2026-07-30 — 레이어 계약을 문서화하고 생성된 `version.ts` 참조 면책을 선언했다.
