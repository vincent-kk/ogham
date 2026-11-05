# continueConversation — Contract

## Requirements

- cennad `session_id` 로 `SessionMeta` 를 찾아 dispatcher 의 resume 을 호출하고, `turn_count` 와 `last_used_at` 을 갱신한다.
- **`project_hash` 불일치는 fallback 검색 없이 `error.code='unknown'` 이다.** 다른 프로젝트의 세션을 찾아 이어주지 않는다.
- 세션이 기록한 tier 를 복원해 모델을 유지한다.

## API Contracts

입출력 이름과 형태는 진입점과 검증 코드를 읽는다. 이 문서의 요구사항은 그 표면을 바꿀 때 보존할 정책을 정한다.

## Acceptance Criteria

### AC-project-scope-strict — 스코프 엄격성

- 다른 `project_hash` 의 세션 요청이 오류로 끝나고 교차 검색이 일어나지 않는다.

### AC-turn-accounting — 턴 회계

- dispatcher를 호출한 모든 시도에서(실패 포함) `turn_count`가 증가하고 `last_used_at`이 갱신된다.

### AC-tier-restoration — tier 복원

- 세션이 시작된 tier 가 복원되어 모델이 턴 사이에 바뀌지 않는다.

## Last Updated

프로젝트 격리·tier 복원·재개 시도 회계 계약의 내용이나 적용 범위가 바뀔 때 갱신한다.
