# configManager — Contract

## Requirements

- config 는 user(`CENNAD_HOME/config.json`)와 project(`<workspace>/.cennad/config.json`) 두 레이어이며 project 가 user 를 재정의한다.
- 저장은 호출자가 지목한 **한 레이어에만** 간다 — 병합 결과를 되쓰면 project 재정의가 user 기준선에 구워진다.
- `CENNAD_CONFIG_PATH` 가 있으면 그 디렉터리를 active home 으로 쓴다.
- active config 를 JSON/object 로 읽을 수 없고 active home 이 기본 home 이 아닐 때만 `pluginCache('cennad')/config.json` 을 **읽기 전용** fallback 으로 시도한다. fallback 은 파일을 만들거나 복사하지 않으며, 저장은 항상 active 경로로 간다.
- Zod 검증 실패와 병합·정규화 가능한 구형 config 는 `DEFAULT_CONFIG`·normalize 경로로 처리한다 — 설정 하나가 플러그인 전체를 못 쓰게 만들지 않는다.
- 레거시 정수 비율은 enabled flag 로 마이그레이션한다. `/setup` 진입 시 `pruneConfigFile` 이 구 키를 제거하고 기본값을 보완하며, `model_map` 은 `mergeModelMap` 으로 deep merge 한다.

## API Contracts

- config 로드 — 두 레이어 병합 결과. 손상·부재 시 기본값으로 degrade.
- config 저장 — 지목된 한 레이어에만 기록.
- `pruneConfigFile` — 구 키 제거와 기본값 보완.
- `mergeModelMap` — `model_map` deep merge.

## Acceptance Criteria

### AC-layer-isolation — 레이어 격리

- 한 레이어 저장이 다른 레이어의 값을 자기 파일에 복사하지 않는다.
- fallback 경로가 파일을 생성하거나 복사하지 않는다.

### AC-config-degradation — 손상 내성

- 검증 실패 config 가 기본값으로 degrade 하고 throw 하지 않는다.
- 레거시 정수 비율이 enabled flag 로 변환된다.

## Last Updated

2026-07-30 — 설정 레이어와 fallback 계약을 문서화했다.
