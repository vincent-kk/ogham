# feedbackStore — Contract

## Requirements

- 피드백 본문과 첨부 이미지는 세션 디렉터리 안에만 저장한다.
- 쓰기는 `lib/atomicWrite` 를 거친다 — 부분 기록된 `feedback.json` 이 남지 않는다.
- 읽기는 부재를 정상 상태로 다룬다 — 아직 제출이 없는 세션 조회는 `null` 이다.

## API Contracts

- `saveFeedback(sessionId, payload, images): Promise<StoredFeedback>` — 본문과 이미지를 세션 디렉터리에 기록하고 저장된 형태를 돌려준다.
- `readFeedback(sessionId): Promise<StoredFeedback | null>` — 저장분이 없으면 `null`.

## Acceptance Criteria

### AC-feedback-persistence — 제출 영속

- 저장 후 즉시 읽으면 같은 내용을 돌려준다.
- 제출이 없는 세션 읽기는 `null` 이며 throw 하지 않는다.

## Last Updated

2026-07-30 — 피드백 영속 계약을 문서화했다.
