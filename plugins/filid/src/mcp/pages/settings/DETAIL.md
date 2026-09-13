# settings page contract

## Requirements

- 서버가 공통 `resolveInitialConfigScope`로 계산한 `initialScope`를 초기 선택으로 사용한다. project 설정이 있으면 project, user 설정만 있으면 user, 둘 다 없으면 project다. 페이지는 이 조건을 재판단하지 않는다.

- Render the current Filid config v2 and managed rule-document state without external assets.
- Preserve hidden config fields while editing `language`, rule overrides, and structure options.
- Store maximum depth at `structure.maxDepth`, peer overrides at `structure.additionalAllowedPeers`, organ names at `structure.additionalOrganNames`, and entry overrides under the selected adapter ID in `structure.entryPointOverrides`.
- Keep adapter selection intact unless the page exposes an explicit adapter control.
- Validate user-entered peer override JSON before sending `POST /save`.

## API Contracts

- The injected `SettingsPageState.config` and submitted `SaveBody.config` conform to config v2.
- Existing field element IDs remain stable for the 1.0 migration seam; their serialized meaning follows config v2.
- Every state-changing request includes the server-issued token query parameter.

## Acceptance Criteria

### AC-settings-project-default — 프로젝트 기본 범위

- 서버의 `initialScope`가 user와 project 어느 값이든 페이지가 그대로 선택한다.
- 사용자가 범위를 바꾸면 해당 계층을 편집·저장하며, 상태 재수신은 이 선택을 덮어쓰지 않는다.

### AC-settings-v2-roundtrip — Config preservation

- Editing visible fields writes their config v2 structure locations.
- Adapter selection and unedited structure keys survive a save unchanged.

### AC-settings-validation — Invalid peer input

- Malformed peer override JSON prevents submission and identifies the field.

## Last Updated

2026-09-13 — 프로젝트 기본 범위와 명시적 전역 저장 선택 계약을 반영했다.
