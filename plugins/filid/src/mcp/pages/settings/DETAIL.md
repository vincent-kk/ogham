# settings page contract

## Requirements

- 사용자가 범위를 바꾸면 그 계층을 편집·저장한다. 상태를 다시 받아도 이 선택을 덮어쓰지 않는다.

- 서버가 공통 `resolveInitialConfigScope`로 계산한 `initialScope`를 초기 선택으로 사용한다. project 설정이 있으면 project, user 설정만 있으면 user, 둘 다 없으면 project다. 페이지는 이 조건을 재판단하지 않는다.

- Render the current Filid config v3 and managed rule-document state without external assets.
- Preserve hidden config fields while editing `language`, override-only rules, `ignore`, `structure.excludeFromScan`, `review.generatedPaths`, and structure options.
- Store maximum depth at `structure.maxDepth`, peer overrides at `structure.allowedPeers`, organ names at `structure.organNames`, and entry overrides under the selected adapter ID in `structure.entryPointOverrides`.
- Keep adapter selection intact unless the page exposes an explicit adapter control.
- Validate user-entered peer override JSON before sending `POST /save`.

## API Contracts

- 부분 적용은 완료된 변경과 구분해 오류로 표시하고 실패 대상·미시도·실제 백업 정보를 보여준다. 부분 적용 응답에서 저장 후 자동 닫기를 실행하지 않는다.

- Injected state uses normalized config objects and includes built-in rule defaults; submitted `SaveBody.config` is a raw v3 file document that may contain shorthand.
- Existing field IDs remain stable: `#ignore-paths` ("Ignore (all operations)"), `#exclude-from-scan` ("Exclude from structure scan (still reviewed)"), and `#generated-paths` ("Generated paths (review)") each hold one project-relative pattern per line.
- Every state-changing request includes the server-issued token query parameter.

## Acceptance Criteria

### AC-settings-v3-roundtrip — Config preservation

- Editing visible fields writes v3 paths, override-only rules, and shorthand allowed peers while preserving unedited fields.
- Allowed peers with several paths or an adapter ID remain objects across page save and reload; only peers representable by shorthand become strings.
- A pattern under `ignore`, `structure.excludeFromScan`, or `review.generatedPaths` survives page save and reload.
- Adapter selection and unedited structure keys survive a save unchanged.

### AC-settings-validation — Invalid peer input

- Malformed peer override JSON prevents submission and identifies the field.

## Last Updated

초기·변경 범위 선택, 보존하는 config 필드나 고정 field ID가 바뀔 때 갱신한다.
