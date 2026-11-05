# feedbackStore — Contract

## Requirements

- 피드백 본문과 첨부 이미지는 세션 디렉터리 안에만 저장한다.
- 쓰기는 `lib/atomicWrite` 를 거친다 — 부분 기록된 `feedback.json` 이 남지 않는다.
- 읽기는 부재를 정상 상태로 다룬다 — 아직 제출이 없는 세션 조회는 `null` 이다.

## API Contracts

- 이미지 바이트는 별도 파일이고 이 저장소에는 이미지 메타만 넣는다. 피드백 JSON에 바이너리를 인라인하지 않는다.

## Acceptance Criteria

### AC-feedback-persistence — 제출 영속

- 저장 후 즉시 읽으면 같은 내용을 돌려준다.
- 제출이 없는 세션 읽기는 `null` 이며 throw 하지 않는다.

## Last Updated

피드백 저장 범위·원자성·이미지 분리 계약의 내용이나 적용 범위가 바뀔 때 갱신한다.
