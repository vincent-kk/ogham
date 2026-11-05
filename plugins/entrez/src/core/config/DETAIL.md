# config — Contract

## Requirements

- 비밀과 비밀 아닌 설정은 파일을 나눈다. `config.json` 은 tool·email 등 공개 설정, `credentials.json` 은 `api_key` 이며 항상 0o600 으로 기록한다.
- config 는 user·project 두 레이어이고 project 가 user 를 재정의한다 — 저장소 하나가 자기 tool 이름을 선언할 수 있어야 하기 때문이다.
- **credentials 는 레이어링하지 않는다.** project 레이어는 워킹트리 안에 있어 `api_key` 가 `git add .` 한 번 거리에 놓인다.
- config 검증은 병합 결과에만 건다. project 레이어는 재정의한 키만 담아 단독으로는 스키마를 통과할 수 없다. credentials 는 읽기·쓰기 모두 검증한다.
- project 디렉터리를 만들 때 `.gitignore` 를 함께 둔다.

## API Contracts

호출 형태와 구체적인 반환 값은 공개 진입점과 테스트에서 확인한다.

## Acceptance Criteria

### AC-secret-separation — 비밀 분리

- `api_key` 는 `config.json` 에 기록되지 않는다.
- credentials 파일은 project 레이어를 갖지 않는다.
- credentials 파일 권한이 0o600 이다.

## Last Updated

설정 레이어 병합·검증과 비밀 분리 정책이 바뀔 때 갱신한다.
