## Purpose

세션별 피드백을 `feedback.json` 에 영속·조회하는 모듈. 코멘트·overall 노트와 첨부 이미지 메타데이터를 저장한다.

## Structure

| File                         | Role                                                          |
| ---------------------------- | ------------------------------------------------------------- |
| `operations/saveFeedback.ts` | payload + `ImageRef[]` 를 `StoredFeedbackSchema` 검증 후 영속 |
| `operations/readFeedback.ts` | `feedback.json` 읽기 + 검증, 부재·손상 시 `null`              |
| `index.ts`                   | barrel — `saveFeedback`, `readFeedback` re-export             |

## Conventions

- 디스크 경로는 `constants/paths` 의 `sessionFeedbackPath(sessionId)`
- 쓰기는 `lib/atomicWrite`, `updated_at` 은 `isoNow()` 로 기록
- 읽기 실패·검증 실패는 throw 하지 않고 `null` 반환 (경고 로그)
- 이미지 바이트는 별도 파일 — 여기에는 메타(`ImageRef`)만 저장

## Boundaries

### Always do

- 영속 전 `StoredFeedbackSchema` 로 검증
- 부재·손상 시 `null` 반환

### Ask first

- 피드백 스키마(`types/feedback`) 변경

### Never do

- 이미지 바이너리를 `feedback.json` 에 인라인
- 비원자적 쓰기

## Dependencies

- `../../types/feedback` (`StoredFeedback`, `FeedbackPayload`, `ImageRef`), `../../constants`, `../../lib`, `../../utils`
- `node:fs/promises` (`readFile`)
