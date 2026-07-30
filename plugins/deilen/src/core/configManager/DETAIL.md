# configManager — Contract

## Requirements

- 설정 파일이 없거나 손상되었으면 throw 하지 않고 `DEFAULT_CONFIG` 로 degrade 한다 — 설정 하나가 플러그인 전체를 못 쓰게 만들지 않는다.
- 저장 전 항상 `ConfigSchema` 로 검증하고, 쓰기는 `lib/atomicWrite`(temp → rename)로만 한다.
- 설정은 `user`·`project` 두 레이어이며 우선순위는 `user < project` 다. 저장은 지정된 한 레이어만 덮어쓴다 — 병합 결과에서 출발하면 `user` 저장이 project 재정의를 user 파일에 구워 넣는다.
- 검증은 병합 결과에만 건다. `project` 는 재정의된 키만 담은 부분 문서라 단독으로 strict 스키마를 통과할 수 없다.
- `config_version` 은 `user` 레이어만의 것이다(부재 = 0, 레거시). 마이그레이션은 user 레이어에만 적용하고 되쓰는 대상도 그 레이어다.
- 마이그레이션 스텝은 리터럴로 동결한다 — live default 를 참조하면 과거 문서가 오늘의 기본값으로 재해석된다.

## API Contracts

- `loadConfig(): Promise<Config>` — 두 레이어를 읽어 마이그레이션·병합·검증한 결과. 부재·손상 시 `DEFAULT_CONFIG` 로 degrade 하며 절대 throw 하지 않는다.
- `loadConfigState(): Promise<ConfigScopeState>` — 설정 페이지용. 레이어별 원문(부재·손상 모두 `null`), 병합 결과, 재정의 목록, 두 레이어의 절대 경로.
- `saveConfig(...)` — 한 레이어만 원자적으로 영속한다(`fileMode` 0o600, `directoryMode` 0o700). 레이어는 마지막 인자로 받아 호출자가 지정할 수 있다.
- 레이어 좌표는 `@ogham/cross-platform` 의 `resolveConfigLayers` 가 정한다 — user 는 `pluginCache('deilen')`, project 는 `<workspace>/.deilen/`.

## Acceptance Criteria

### AC-config-degradation — 손상 내성

- 파일이 없으면 기본 설정을 돌려준다.
- 파싱 불가능한 파일도 throw 없이 기본 설정으로 degrade 한다.

### AC-config-layer-isolation — 레이어 격리

- 한 레이어 저장이 다른 레이어의 값을 자기 파일에 복사하지 않는다.

## Last Updated

2026-07-30 — 설정 로드·저장 계약을 문서화했다.
