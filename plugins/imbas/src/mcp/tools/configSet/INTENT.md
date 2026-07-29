# configSet

## Purpose

`config_set` 도구 핸들러. 유효 설정에 업데이트를 적용한 뒤 호출자가 지정한 한 계층(user 또는 project)에 기록한다.

## Structure

- `configSet.ts` — `handleConfigSet` · `ConfigSetInput`

## Conventions

- `scope` 는 기본값 없는 필수 입력이다. 두 계층 모두 유효한 대상이라, 조용한 기본값은 프로젝트 결정을 사용자 파일에 넣거나 그 반대를 만든다.
- 업데이트는 병합된 유효 설정에 적용한 뒤 지정 계층에 안착한다 — project 계층이 재정의 중인 필드를 `user` 로 쓰면 병합값이 기록되며, 이는 설정 페이지와 같은 동작이다.
- 프로젝트 루트는 `projectRoot(input.project_root)` 로 해석한다.

## Boundaries

### Always do

- 비즈니스 로직은 core/ 모듈에 위임
- 쓰기 대상 계층을 호출자에게 받아 그대로 전달

### Ask first

- inputSchema 변경

### Never do

- 핸들러에 비즈니스 로직 직접 구현
- `scope` 에 기본값 부여

## Dependencies

- `../../../core/configManager` — `loadConfig`·`applyConfigUpdates`·`saveConfig`
- `@ogham/cross-platform/host-paths` — `projectRoot`
