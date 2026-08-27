# jiraCommentThread — Contract

## Requirements

- `mode` 기본값은 `read` 다. `read`·`scan`·`probe`·`save_profile` 네 모드가 각각 `src/jira/index.js` 의 함수 하나에 대응한다.
- MCP 프로토콜이 요구하는 최상위 object 스키마를 유지하면서, 같은 Zod 스키마의 mode refinement 가 `read → issue_key`, `scan → jql`, `probe → sample_issue_key`, `save_profile → profile` 을 각각 필수로 검사하고 다른 모드의 필드를 거부한다. `mode` 생략은 `read` 로 검증한다.
- `ctx.is_cloud === true` 면 요청을 보내지 않고 `Error("jira_comment_thread supports Server/Data Center sites only; use fetch GET /issue/{key}/comment on Cloud.")` 를 던진다.
- 이 fractal 에는 도메인 규칙이 없다 — 분기와 위임뿐이다.

## API Contracts

- `handleJiraCommentThread(args, ctx)` — 모드별 결과 객체를 그대로 반환한다(봉투는 `wrapHandler` 가 씌운다).

## Acceptance Criteria

### AC-adapter-thin — 얇은 어댑터

- `jiraCommentThread.ts` 가 import 하는 `src/jira` 경로는 `../../../jira/index.js` 하나다.

### AC-cloud-rejected — Cloud 거부

- `is_cloud: true` 컨텍스트로 호출하면 요청 함수가 호출되지 않고 오류가 난다.

### AC-mode-schema — 모드별 입력 스키마

- `tools/list` 의 `inputSchema.type` 은 `object` 이며, 각 모드의 필수 필드 누락과 다른 모드 필드 혼합은 MCP 입력 검증에서 거부되고 네 모드의 최소 유효 입력은 통과한다.

## Last Updated

2026-08-28 — 어댑터 계약을 신설했다.
