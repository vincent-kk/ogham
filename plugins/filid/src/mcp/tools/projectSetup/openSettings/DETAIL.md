# project_setup settings action contract

## Requirements

- 설정 페이지에 `initialScope`를 주입한다. 공통 `resolveInitialConfigScope`가 project 설정 존재 → user 설정 존재 → 최초 project 순으로 결정하며, 페이지가 조건을 중복하지 않는다.

- Start or reuse a token-protected loopback settings server for one project.
- Concurrent calls share the in-flight startup. A different project waits for startup and replacement; an older server's close callback cannot clear its successor.
- Load normalized config v3, including in-memory v1/v2 migration diagnostics, into page state.
- Validate raw v3 file documents and persist their shorthand through configLoader.
- Preserve managed rule-document selection and resynchronization behavior.
- Bound each wait and return a resumable URL when the form is still pending.

## API Contracts

- Output uses the common envelope; summary preserves saved/closed/pending, URL, message and optional save summary.
- `SaveBody.config` is strict raw config v3; unknown or legacy keys are rejected.

## Acceptance Criteria

### AC-open-settings-v2 — State and persistence

- Missing config yields a valid v3 default state.
- A v1/v2 config is exposed as migrated v3 state with migration diagnostics.
- A valid save writes v3 and settles the bounded waiter as saved.

### AC-open-settings-guard — Local session boundary

- Missing or incorrect session tokens are rejected.
- Wait timeout returns a reusable pending URL.
- Overlapping calls for one project open one browser tab and use the same server. Failed startup releases the in-flight slot for retry.

## Last Updated

설정 서버의 동시 기동·재사용, config 저장이나 bounded 대기 계약이 바뀔 때 갱신한다.
