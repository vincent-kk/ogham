# configManager — Contract

## Requirements

- config 는 user(`CENNAD_HOME/config.json`)와 project(`<workspace>/.cennad/config.json`) 두 레이어이며 project 가 user 를 재정의한다.
- 저장은 호출자가 지목한 **한 레이어에만** 간다 — 병합 결과를 되쓰면 project 재정의가 user 기준선에 구워진다.
- `CENNAD_CONFIG_PATH` 가 있으면 그 디렉터리를 active home 으로 쓴다.
- active config 를 JSON/object 로 읽을 수 없고 active home 이 기본 home 이 아닐 때만 `pluginCache('cennad')/config.json` 을 **읽기 전용** fallback 으로 시도한다. fallback 은 파일을 만들거나 복사하지 않으며, 저장은 항상 active 경로로 간다.
- Zod 검증 실패와 병합·정규화 가능한 구형 config 는 `DEFAULT_CONFIG`·normalize 경로로 처리한다 — 설정 하나가 플러그인 전체를 못 쓰게 만들지 않는다.
- 레거시 정수 비율은 읽기 시 enabled flag로 정규화하며, `model_map`은 `mergeModelMap`으로 deep merge한다. setup을 여는 동작은 user 설정을 다시 쓰지 않는다.

## API Contracts

- `pruneConfigFile` — 명시적 유지보수 호출용 구 키 제거와 기본값 보완 API. setup 자동 경로에서는 호출하지 않는다.

## Acceptance Criteria

검증 코드가 수용 기준을 고정하므로 별도 acceptance group을 선언하지 않는다.

## Last Updated

설정 레이어 소유권·fallback·명시적 저장 정책의 내용이나 적용 범위가 바뀔 때 갱신한다.
