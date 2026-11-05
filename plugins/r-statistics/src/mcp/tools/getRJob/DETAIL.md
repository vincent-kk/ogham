# getRJob — Contract

## Requirements

- 잡 상태를 바꾸지 않고 jobStore만 조회한다. 워크스페이스 재독해나 R 실행은 폴링의 책임이 아니다.
- 모든 폴링 결과는 실행과 같은 관리형 library 경로를 유지한다. setup이 폴링 시점에 다른 설치 경로를 선택하지 않게 한다.

## API Contracts

- 스트림 생략은 텍스트 전송량만 줄이며 인코딩 정보와 관리형 library 경로를 보존한다. 미등록 잡은 오류로 알려 잘못된 jobId가 정상 상태처럼 보이지 않게 한다.

## Acceptance Criteria

### AC-getjob-readonly — 읽기 전용 폴링

- 같은 잡을 반복 조회해도 잡 상태가 바뀌지 않으며 새 실행이 트리거되지 않는다.
- `includeStdout=false` 응답에 스트림 본문이 남지 않는다.
- 미존재 잡 조회는 `JOB_NOT_FOUND` 로 실패한다.
- 실행 결과가 아직 없거나 stream을 숨겨도 `managedLibraryPath` 는 유지된다.

## Last Updated

읽기 전용 폴링·스트림 생략·관리형 library 계약의 내용이나 적용 범위가 바뀔 때 갱신한다.
