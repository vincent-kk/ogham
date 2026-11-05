# sessionStore — Contract

## Requirements

- 세션은 `sessions/<projectHash>/<sessionId>.json` 에 저장된다. project-hash 격리가 있어야 다른 프로젝트의 세션을 참조·오염하지 않는다.
- TTL 이 지난 세션은 prune 대상이다.
- 읽기는 부재를 정상 상태로 다룬다 — 없는 세션 조회가 예외가 되지 않는다.

## API Contracts

입출력 이름과 형태는 진입점과 검증 코드를 읽는다. 세션 제거는 TTL prune만 수행한다.

## Acceptance Criteria

검증 코드가 수용 기준을 고정하므로 별도 acceptance group을 선언하지 않는다.

## Last Updated

프로젝트 격리·세션 보존·만료 정책의 내용이나 적용 범위가 바뀔 때 갱신한다.
