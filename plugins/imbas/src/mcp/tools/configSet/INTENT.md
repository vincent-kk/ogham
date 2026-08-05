# configSet

## Purpose

`config_set` 도구 핸들러. 호출자가 지정한 한 계층(user 또는 project)의 원본 문서에 업데이트를 적용해 그 계층만 기록한다.

## Structure

- `configSet.ts` — `handleConfigSet` · `ConfigSetInput`

## Conventions

- `scope` 는 기본값 없는 필수 입력이다. 두 계층 모두 유효한 대상이라, 조용한 기본값은 프로젝트 결정을 사용자 파일에 넣거나 그 반대를 만든다.
- 업데이트는 지정 계층의 원본 문서에만 적용한다 — 다른 계층에서 상속되던 값이 대상 파일에 배어들지 않아, user 기본값 변경이 이후에도 워크스페이스로 흘러든다.
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

- `../../../core/configManager` — `updateConfigLayer`
- `@ogham/cross-platform` — `projectRoot`
