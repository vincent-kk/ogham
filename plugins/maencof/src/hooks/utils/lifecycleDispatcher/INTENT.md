# lifecycleDispatcher

## Purpose

라이프사이클 이벤트 디스패처. Pre/Post가 공유하는 host-neutral tool matcher로 등록된 action을 판정하고 이벤트별 context envelope를 만든다.

## Boundaries

### Always do

- LifecycleEvent 타입 준수
- 이벤트 순서 보장
- matcher와 관측 tool 이름을 같은 logical vocabulary로 정규화
- Claude `Edit`와 Codex `apply_patch`만 logical edit으로 통합하고 나머지 이름은 보존

### Ask first

- 이벤트 타입 추가

### Never do

- 동기 실행 보장 우회
- tool response 내용으로 matcher 판정
- 관측하지 않은 host tool alias 추측
