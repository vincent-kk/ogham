# sessionStore — Contract

## Requirements

- 세션은 `project_hash` 로 스코프된다 — 다른 cwd 에서 만든 세션 조회는 `null` 이다.
- 세션 디렉터리는 `viewer.md`(문서 원본)와 `meta.json`(상태)으로 이루어지며, 모든 쓰기는 `lib/atomicWrite` 를 거친다.
- `viewer.md` 는 세션 생성 후 불변이다 — 이 불변성이 이미지 멤버십 캐시의 근거다.
- long-poll resolver 는 세션당 프로세스 전역 단일 슬롯이며, 모든 해소 경로가 멱등 `settle()` 하나를 통과한다. 타이머와 abort 리스너는 짝을 이뤄 해제된다.
- resolver 를 `settle()` 우회로 직접 resolve 하지 않는다.

## API Contracts

- `createSession({ sessionId, projectHash, title, url, markdown, createdAt, options? }): Promise<SessionMeta>` — `viewer.md` 와 `meta.json` 을 만든다.
- `getSession(sessionId, projectHash): Promise<SessionMeta | null>` — 스코프 불일치·부재 시 `null`.
- `readViewerMarkdown(sessionId): Promise<string | null>`
- `closeSession(sessionId): Promise<boolean>` — `meta.status` 를 `closed` 로 전이.
- `clearCollectedFeedback(sessionId): Promise<void>` — `feedback.json` 과 수집 이미지를 정리하고 `viewer.md`·`meta.json` 은 보존(best-effort).
- `removeSession(sessionId): Promise<void>` — 세션 디렉터리 전체 삭제(TTL·관리용).
- `pruneExpired(ttlHours): Promise<number>` — 만료 디렉터리 제거 수.
- resolver: `awaitFeedback(sessionId, waitSeconds, signal?): Promise<SettleValue>`, `deliverComplete(sessionId, feedback)`, `closeResolver(sessionId)`, `settleAllResolvers()`. `SettleValue.kind ∈ {complete, pending, superseded, closing, aborted}`.

## Acceptance Criteria

### AC-session-scope — 프로젝트 스코프

- 다른 `project_hash` 로 조회하면 `null` 이다.
- 부재 세션 조회도 `null` 이며 throw 하지 않는다.

### AC-resolver-single-settle — 해소 단일화

- 완료·대기·교체·종료·중단 다섯 경로가 모두 `settle()` 을 한 번만 통과한다.
- 해소 시 타이머와 abort 리스너가 함께 해제된다.

### AC-session-ttl — 만료 정리

- `pruneExpired` 가 만료된 세션 디렉터리만 제거하고 제거 수를 돌려준다.

## Last Updated

2026-07-30 — 세션 영속과 resolver 계약을 문서화했다.
