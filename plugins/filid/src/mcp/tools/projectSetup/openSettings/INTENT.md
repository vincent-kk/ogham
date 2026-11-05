

## Purpose

The `project_setup settings` child. It serves the v3 config and rule-document form on `127.0.0.1` and returns a bounded long-poll result.

## Conventions

- 한 프로젝트의 pending 설정 세션은 재호출로 이어 기다릴 수 있다. 서로 다른 프로젝트는 같은 서버 상태를 공유하지 않는다.
- 대기는 상한 안으로 제한하고 host abort signal을 전달한다. 호출이 끝나도 waiter가 남는 일을 막는다.
- 브라우저 열기는 신규 기동에서만 best-effort로 수행한다. headless 환경도 URL로 세션을 이어갈 수 있어야 한다.

## Boundaries

### Always do

- 프로젝트 루트는 `@ogham/cross-platform` 의 `projectRoot(path?)` 로 해석
- 저장은 반드시 configLoader core (`writeConfig`/`syncRuleDocs`) 를 경유
- v1/v2 로드는 in-memory migration diagnostics와 함께 표시하되 저장은 v3만 허용

### Ask first

- 응답 스키마 변경 (setup 스킬 계약)
- 대기 상한 변경

### Never do

- `127.0.0.1` 외 주소로 바인딩
- token 발급/검증을 `@ogham/http-kit` 밖에서 재구현
- 상한 없는 무한 대기

## Dependencies

- `../../../../core/infra/configLoader` — 설정 migration과 저장·규칙 동기화의 정책을 이 core에 일임해 HTTP 세션이 영속 정책을 복제하지 않는다.
