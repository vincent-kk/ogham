# closeViewer — Contract

## Requirements

- `close_viewer` 는 세션 상태를 `closed` 로 전이하고 대기 중인 resolver 를 정리한다.
- 페이지 자체는 남는다 — 닫힌 뒤에도 사용자는 읽던 문서를 계속 볼 수 있고, 새로고침하면 제출만 비활성화된다.
- 프로젝트 스코프는 `ensureHttpServer` 보다 먼저 해석한다.

## API Contracts

입출력 이름과 형태는 진입점과 검증 코드를 읽는다. 이 문서의 요구사항은 그 표면을 바꿀 때 보존할 정책을 정한다.

## Acceptance Criteria

### AC-close-resolver-cleanup — 대기 정리

- 닫을 때 해당 세션의 long-poll resolver 가 `closing` 으로 settle 된다.

### AC-close-page-persistence — 페이지 보존

- 닫은 뒤에도 뷰어 페이지는 접근 가능하고, 새로고침 시 제출이 비활성화된다.

## Last Updated

세션 종료·대기 resolver 정리·페이지 보존 계약의 내용이나 적용 범위가 바뀔 때 갱신한다.
