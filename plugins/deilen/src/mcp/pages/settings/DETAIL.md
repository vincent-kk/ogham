# settings — Contract

## Requirements

- 서버가 공통 `resolveInitialConfigScope`로 계산한 `initialScope`를 초기 선택으로 사용한다. project 설정이 있으면 project, user 설정만 있으면 user, 둘 다 없으면 project다. 페이지는 이 조건을 재판단하지 않는다.

- 설정 페이지는 `user`·`project` 두 레이어의 원문과 병합 결과를 함께 보여준다 — 지금 고치는 값이 어느 레이어의 것인지 보이지 않으면 저장이 반대편 파일을 덮는다.
- 저장 요청은 대상 레이어를 `scope` 로 명시한다. 기본값을 두지 않는다.
- 저장 문서는 고른 레이어에서 출발한다 — 병합 결과에서 출발하면 project 재정의가 user 기준선에 구워진다.
- 폼 밖의 값(`last_intent` 등)은 저장 시 기존 값으로 merge 보존한다.
- `project` 스코프 제출은 재정의된 키만 담는다. 키를 빼는 것이 곧 재정의 해제이므로 해제용 별도 라우트가 없다.
- 상속 상태는 필드 래퍼의 `data-scope-state`(`own`/`inherited`/`overridden`) 하나로만 표현하고, 배지·해제 버튼 노출은 CSS 가 결정한다.
- 이 페이지가 ogham 스코프 설정 UI 의 정본 구현이다 — 다른 플러그인 설정 페이지가 이 구조를 따른다.
- 외부 CDN·동봉 폰트를 쓰지 않으며 페이지 문구는 영어로 유지한다.

## API Contracts

- 소비 라우트: `GET /api/config` → `{ ok: true, state: ConfigScopeState }`, `POST /api/config` ← `{ scope: "user" | "project", config: object }`.
- `state.layers.{user,project}` 는 각 레이어 원문(부재·손상 모두 `null`), `state.effective` 는 병합 결과, `state.paths` 는 두 레이어의 절대 경로다.

## Acceptance Criteria

### AC-settings-project-default — 프로젝트 기본 범위

- 서버의 `initialScope`가 user와 project 어느 값이든 페이지가 그대로 선택한다.
- 사용자가 범위를 바꾸면 해당 계층을 편집·저장하며, 상태 재수신은 이 선택을 덮어쓰지 않는다.

### AC-settings-layer-visibility — 레이어 가시성

- 페이지가 두 레이어의 원문과 병합 결과를 구분해 보여준다.
- 저장 대상 레이어가 사용자에게 명시된다.

### AC-settings-save-scope — 저장 스코프

- `scope` 없는 저장 요청은 400 으로 거부된다.
- 프로젝트 경로가 없는데 `scope: "project"` 면 400 이다.
- 저장 후 응답이 갱신된 `ConfigScopeState` 를 담는다.

## Last Updated

2026-09-13 — 프로젝트 기본 범위와 명시적 전역 저장 선택 계약을 반영했다.
