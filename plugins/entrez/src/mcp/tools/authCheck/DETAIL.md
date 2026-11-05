# authCheck — Contract

## Requirements

- 미설정 상태에서도 동작한다 — 설정이 없다는 사실 자체가 보고 대상이며 실패가 아니다(`configured: false`).
- `api_key` 는 존재 여부만 보고한다. 값도, 마스킹된 값도 응답에 넣지 않는다.
- 이 도구가 `setup` 의 pre-flight 이자 복구 진입점이다.
- 도달성 probe 실패는 throw 하지 않고 `reachable: false` 로 흡수한다 — 네트워크가 끊겨도 설정 상태는 보고할 수 있어야 한다.
- 미설정을 허용해야 하므로 `buildToolContext` 를 쓰지 않고 config·credentials 를 직접 읽는다.

## API Contracts

호출 형태와 구체적인 반환 값은 공개 진입점과 테스트에서 확인한다.

## Acceptance Criteria

### AC-authcheck-secrecy — 자격증명 비노출

- 응답에 `api_key` 값이 포함되지 않고 존재 여부만 나타난다.

## Last Updated

미설정·도달성 보고와 키 존재 여부 노출 정책이 바뀔 때 갱신한다.
