# core — Contract

## Requirements

- 검색 도메인의 하드 규칙은 LLM 이 아니라 이 계층이 소유한다 — 누락 방지(recall) 보장은 코드의 책임이다.
- 각 하위 fractal 은 자기 배럴로만 건넌다. 외부 소비자는 `core/index.ts` 를 경계로 쓴다.
- core 는 상위 레이어(`mcp`·`adapters`)를 import 하지 않는다. 의존은 `mcp → adapters → core` 한 방향이다.
- 외부 HTTP는 `httpClient`를 통하고 검색 계산에 필요한 네트워크는 함수로 주입한다. config와 searchJob의 파일 I/O는 설정 보호와 작업 재개를 위한 영속화 책임이므로 이 순수 계산 경계와 구분한다.

## API Contracts

호출 형태와 구체적인 반환 값은 공개 진입점과 테스트에서 확인한다.

## Acceptance Criteria

### AC-core-layer-direction — 단방향 의존

- `core/` 에서 `mcp/`·`adapters/` 를 참조하는 import 가 0건이다.

### AC-core-network-single-path — 네트워크 단일 통로

- `httpClient` 밖의 core 모듈에 `fetch` 직접 호출이 없다.
- 네트워크가 필요한 recall 모듈은 함수 주입(`CountFn`·`EspellFn`)으로 받는다.

## Last Updated

결정론 검색 규칙의 소유권과 네트워크 주입 경계가 바뀔 때 갱신한다.
