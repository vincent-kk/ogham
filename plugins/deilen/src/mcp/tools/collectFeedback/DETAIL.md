# collectFeedback — Contract

## Requirements

- 수집은 bounded long-poll 이다. `wait_seconds` 는 600 이하이며 기본값도 600 이다 — 리뷰 한 번을 한 호출로 덮기 위한 값이고, 상한 근거는 stdio idle window 30분이다.
- 대기 중 제출이 없으면 `{ status: "pending", draft_count }` 로 돌아온다. 대기가 곧 실패는 아니다.
- 알 수 없는 세션은 `unknown` 으로 throw 한다. 닫힌 세션은 먼저 buffer 와 디스크(`feedback.json` status=complete)에서 미전달 complete 를 회수하고, 둘 다 없을 때만 `closed` 로 throw 한다 — 닫혔다는 이유로 이미 받은 제출을 잃지 않는다.
- 대기 시간은 `wait_seconds ?? config.collect_timeout_seconds` 를 `[1, MAX_COLLECT_WAIT_SECONDS]` 로 clamp 한다.
- 읽을 수 없는 첨부 이미지는 전체 실패로 만들지 않고 건너뛴다.
- `extra.signal` 이 abort 되면 대기를 정리하고 빠져나온다 — 남은 타이머나 리스너를 두지 않는다.
- 수거가 끝나면 `feedback.json` 과 수집 이미지를 정리하되 `viewer.md`·`meta.json` 은 보존한다.

## API Contracts

- `handleCollectFeedback(...)` — 제출이 있으면 텍스트와 이미지를 담은 content 를, 없으면 `{ status: "pending", draft_count }` 를 돌려준다.
- 입력: `session_id`, `wait_seconds?`(≤600), `project_root?`.

## Acceptance Criteria

### AC-longpoll-bounded — 유계 대기

- `wait_seconds` 상한을 넘는 값은 상한으로 clamp 된다.
- 제출 없이 시간이 다하면 `pending` 과 초안 수를 돌려준다.

### AC-longpoll-abort — 중단 정리

- `extra.signal` abort 시 대기가 즉시 풀리고 타이머·리스너가 해제된다.

### AC-session-state-guard — 세션 상태 가드

- 알 수 없는 세션 요청은 `unknown` 으로 throw 한다.
- 닫힌 세션이라도 미전달 complete 가 buffer 나 디스크에 있으면 그것을 돌려준다.
- 회수할 것이 없는 닫힌 세션에서는 새 대기를 시작하지 않고 `closed` 로 throw 한다.

### AC-attachment-resilience — 첨부 내성

- 읽을 수 없는 이미지 한 장이 제출 전체를 실패시키지 않는다.

## Last Updated

2026-07-30 — long-poll 경계와 중단 정리 계약을 문서화했다.
