# closeViewer — Contract

## Requirements

- `close_viewer` 는 세션 상태를 `closed` 로 전이하고 대기 중인 resolver 를 정리한다.
- 페이지 자체는 남는다 — 닫힌 뒤에도 사용자는 읽던 문서를 계속 볼 수 있고, 새로고침하면 제출만 비활성화된다.
- 프로젝트 스코프는 `ensureHttpServer` 보다 먼저 해석한다.

## API Contracts

- `handleCloseViewer(...)` — `{ status: "closed" }` 를 돌려준다.
- 입력: `session_id`, `project_root?`.

## Acceptance Criteria

### AC-close-resolver-cleanup — 대기 정리

- 닫을 때 해당 세션의 long-poll resolver 가 `closing` 으로 settle 된다.

### AC-close-page-persistence — 페이지 보존

- 닫은 뒤에도 뷰어 페이지는 접근 가능하고, 새로고침 시 제출이 비활성화된다.

## Last Updated

2026-07-30 — 세션 종료와 페이지 보존 계약을 문서화했다.
