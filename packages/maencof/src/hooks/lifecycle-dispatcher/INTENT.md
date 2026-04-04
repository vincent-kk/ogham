# lifecycle-dispatcher

## Purpose

라이프사이클 이벤트 디스패처. 등록된 핸들러에 이벤트 전달.

## Boundaries

### Always do

- LifecycleEvent 타입 준수
- 이벤트 순서 보장

### Ask first

- 이벤트 타입 추가

### Never do

- 동기 실행 보장 우회
