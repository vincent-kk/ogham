# core — Contract

## Requirements

- 검색 도메인의 하드 규칙은 LLM 이 아니라 이 계층이 소유한다 — 누락 방지(recall) 보장은 코드의 책임이다.
- 각 하위 fractal 은 자기 배럴로만 건넌다. 외부 소비자는 `core/index.ts` 를 경계로 쓴다.
- core 는 상위 레이어(`mcp`·`adapters`)를 import 하지 않는다. 의존은 `mcp → adapters → core` 한 방향이다.
- 네트워크를 쓰는 모듈은 `httpClient` 뿐이다. 나머지는 함수 주입으로 순수성을 지킨다.

## API Contracts

- HTTP: `httpRequest`, `validateUrl`
- db 해석: `resolveDb`, `buildBaseUrl`
- 설정: `loadConfig`, `saveConfig`, `loadCredentials`, `saveCredentials`, `resolveRateLimit`(+ `ResolvedRateLimit`)
- recall 엔진: `union`(`mergeRecords` 외), `segmenter`(`planSegments` 외), `espell`, `queryLint`, `searchJob`

각 심볼의 의미는 소유 fractal 의 DETAIL 계약을 따른다. 배럴은 의미를 더하지 않는다.

## Acceptance Criteria

### AC-core-layer-direction — 단방향 의존

- `core/` 에서 `mcp/`·`adapters/` 를 참조하는 import 가 0건이다.

### AC-core-network-single-path — 네트워크 단일 통로

- `httpClient` 밖의 core 모듈에 `fetch` 직접 호출이 없다.
- 네트워크가 필요한 recall 모듈은 함수 주입(`CountFn`·`EspellFn`)으로 받는다.

## Last Updated

2026-07-30 — core 묶음의 경계와 배럴 표면을 문서화했다.
