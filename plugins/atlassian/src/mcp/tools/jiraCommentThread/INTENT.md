[filid:lang:ko]

## Purpose

`jira_comment_thread` 도구의 얇은 어댑터. `mode` 로 분기해 `src/jira` 의 함수 하나를 부르고 결과를 그대로 돌려준다. Cloud 사이트는 거부한다.

## Structure

| 경로                   | 역할                             |
| ---------------------- | -------------------------------- |
| `jiraCommentThread.ts` | `handleJiraCommentThread` 핸들러 |
| `index.ts`             | 이름 있는 공개 배럴              |

## Boundaries

### Always do

- `ctx.is_cloud === true` 면 `fetch` 경로를 안내하는 오류를 던진다.
- 입력은 `types/commentThread.ts` 의 모드별 zod 스키마를 `server.ts` 가 등록해 검증하고 여기서는 `mode` 분기만 한다.

### Ask first

- 새 모드 또는 어댑터 책임 추가

### Never do

- `src/jira/commentThread/` 내부 파일을 import 하지 않는다.
- 병합·판정 로직을 보유하지 않는다.

## Dependencies

- `jira/index` — `readCommentThread`·`scanCommentThreads`·`probeCommentThread`·`saveCommentThreadProfile`
- `types/index` — `FetchContext`, `JiraCommentThreadInput`
