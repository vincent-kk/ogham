# src — Contract

## Requirements

- 이 소스 트리의 유일한 닻은 검색 **누락 방지(recall)** 다. LLM의 편의에 따른 결과 제거는 금지하며, 호출자가 지정한 수집 한도와 상한 전략은 제한 사실을 드러내어 불완전한 결과를 전수로 오인하지 않게 한다.
- 의존 방향은 `mcp → adapters → core → httpClient → NCBI` 한 방향이다. 역방향 edge 는 0이다.
- 검색 하드 규칙(10k 상한 분할·auto-POST·rate·dedup)은 `core` 가 소유한다. LLM 도, MCP 계층도 아니다.
- 여러 모듈이 공유하는 문자열 값집합·메시지·경로·기본값은 공통 enums와 constants가 소유한다. 단일 모듈 전용 코드·메시지는 지역 상수로 소유해 무관한 모듈의 결합을 늘리지 않는다.
- `api_key` 는 MCP 응답·로그·manifest 어디에도 값으로 나타나지 않는다.
- `version.ts` 는 `version:sync` 로만 갱신한다.

## API Contracts

- 배포 진입점은 esbuild 가 `mcp/serverEntry/` 로부터 만드는 `bridge/mcp-server.cjs` 와 `public/settings.html` 이다.
- `src/index.ts` 는 버전 상수만 노출한다. `mcp/` 를 재노출하지 않는다 — `mcp/server/lifecycle/createServer.ts` 가 `version.ts` 를 참조하므로 재노출은 `src → mcp → server → src` 순환이 된다.
- 서버 수명주기(`createServer`, `startServer`)는 `mcp/` 배럴이 소유한다.

## Acceptance Criteria

### AC-src-layering — 단방향 레이어

- `core/` 에서 `mcp/`·`adapters/` 를 참조하는 import 가 0건이다.
- `mcp/` 안에 검색 하드 규칙 구현이 없다.

### AC-src-single-source — 값 단일 출처

- 공유 문자열의 의미를 지역에서 다시 정의하지 않는다. 모듈 전용 코드·메시지의 지역 상수는 허용한다.

### AC-src-secrecy — 자격증명 비노출

- `api_key` 값이 도구 응답·로그·manifest 에 나타나지 않는다.

## Boundary Exemptions

### version.ts — Generated version constant has no entry point

- **Consumers**: `**/src/**`
- **Direct import**: allowed
- **Reason**: `version.ts` 는 `scripts/injectVersion.mjs` 가 생성하는 단일 상수 파일이고 아무것도 import 하지 않는다. `src/index.ts` 배럴을 경유시키면 `src → mcp → server → src` 순환이 생기므로, 이 참조는 경계를 넘는 대신 면책을 받는다.

## Last Updated

검색 규칙의 계층 소유권과 버전 상수 예외가 바뀔 때 갱신한다.
