## Purpose

`collect_feedback` 도구 핸들러. bounded long-poll 로 라인 단위 피드백을 수집해 MCP content 로 반환하고, 타임아웃 시 pending 마커를 돌려 재호출을 유도한다.

## Structure

| File                                 | Role                                                         |
| ------------------------------------ | ------------------------------------------------------------ |
| `collectFeedback.ts`                 | 핸들러 — 세션 검증 → `awaitFeedback` → complete/pending 분기 |
| `operations/buildFeedbackContent.ts` | 코멘트 요약 text 블록 + 첨부 이미지 base64 image 블록        |
| `index.ts`                           | barrel — `handleCollectFeedback`, 입력·pending 타입          |

## Conventions

- 세션은 `getSession` 으로 cwd 스코프 검증; 부재는 `unknown`. 닫힌 세션은 buffer 또는 디스크(`feedback.json` status=complete)에서 complete 회수, 둘 다 없으면 `closed` throw
- 대기 시간은 `wait_seconds ?? config.collect_timeout_seconds`, `[1, MAX_COLLECT_WAIT_SECONDS]` 클램프
- `complete` → 피드백 content (반환 직후 `clearCollectedFeedback` 으로 feedback.json/images 정리, meta.json/viewer.md 는 새로고침용 보존; best-effort, 실패는 TTL prune 백스톱), `closing` → `closed` throw, 그 외 → `{ status: 'pending', draft_count }`
- 읽을 수 없는 첨부 이미지는 전체 실패 대신 스킵

## Boundaries

### Always do

- `extra.signal` 을 `awaitFeedback` 에 전달 (abort 전파)
- 대기 시간을 상한으로 클램프 (클라이언트 MCP 타임아웃 이내)

### Ask first

- pending 응답 형태 변경
- 이미지 인코딩·content 레이아웃 변경

### Never do

- 상한 없는 무한 대기
- 닫힌 세션에서 새 피드백 long-poll 대기 (미전달 complete 회수는 허용)

## Dependencies

- `../../../core` (config·feedbackStore·projectHash·sessionStore), `../../httpServer`, `../../shared`, `../../../constants`
- `node:fs/promises`, `@modelcontextprotocol/sdk` (타입)
