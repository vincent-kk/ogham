# sessionEnd

## Requirements

- 입력: SessionEnd 이벤트 (`session_id`, `cwd`, optional `skills_used` / `files_modified`).
- 출력: stdout JSON `{ continue: true, message?: string }` (recap 활성 시 message 포함).
- 수행 책임:
  - `recordSessionEnd(cwd, {...})` — `dailynotes/sessions/{date}.json` 의 session_id 레코드를 마감(`endedAt`, skills/files)하고 SessionStart baseline 대비 볼트작업 차분(`vaultOps`)을 산출 (sessionStore 위임). 기록한 일자를 반환.
  - `buildDailyDigest(cwd, date)` — 마감된 일자의 작업 digest(`activity/digests/daily/{date}.json`)를 멱등 재생성 (workIndex 위임).
  - `removeSessionFiles(sessionId, cwd)` — 세션 컨텍스트 파일 삭제.
  - `removeTurnContext(cwd)` — turnContext 캐시 삭제. turnContext는 session-scope이므로 세션 종료와 동시에 폐기.
  - `session_recap.enabled === true`이면 recap 메시지를 빌드하여 `message`로 emit.
- 구 `.maencof-meta/sessions/*.md` 는 쓰지 않는다(자연 폐기). 세션 라이프사이클은 dailynote .md 에 남기지 않는다.
- vault-scope 데이터(graph, weights, snapshot, stale-nodes, usageStats 등)는 절대 손대지 않는다(usageStats 는 차분 계산용 read-only).

## API Contracts

- 독립 bridge 없음 — SessionEnd 디스패처(`eventDispatch`)가 `runSessionEnd` 를 호출한다.
- export: `runSessionEnd(input: SessionEndInput): SessionEndResult`.
- 의존 모듈: `sessionStore` (세션 레코드 마감 + 차분), `workIndex` (일일 digest 재생성), `cacheManager` (세션 파일 + turnContext 삭제), recap 빌더 (옵션).
- 실패 정책: 모든 I/O 실패는 `appendErrorLogSafe`로 흡수, 항상 `continue: true` 반환.
