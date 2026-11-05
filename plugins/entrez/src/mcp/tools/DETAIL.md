# tools — Contract

## Requirements

- 도구 하나에 디렉터리 하나다. 각 도구는 `core`/`adapters` 를 얇게 오케스트레이션할 뿐 검색 규칙을 스스로 갖지 않는다.
- 도구끼리 직접 import 하지 않는다.
- 모든 외부 HTTP 는 `core/httpClient` 를 거친다 — 핸들러가 `fetch` 를 직접 부르지 않는다.
- 미설정 상태는 실패가 아니라 `NOT_CONFIGURED` 신호다. 스킬이 이를 받아 `setup` 으로 유도한다.

## API Contracts

호출 형태와 구체적인 반환 값은 공개 진입점과 테스트에서 확인한다.

## Acceptance Criteria

### AC-tools-thin — 얇은 오케스트레이션

- 도구 디렉터리 안에 dedup·분할·lint 구현이 없다.
- 도구 간 직접 import 가 0건이다.

### AC-tools-unconfigured-signal — 미설정 신호

- 설정이 없을 때 도구가 `NOT_CONFIGURED` 를 돌려주고, 조용히 기본값으로 진행하지 않는다.

## Last Updated

도구 오케스트레이션 경계와 미설정 복구 신호가 바뀔 때 갱신한다.
