# paths — Contract

## Requirements

- 경로 조립은 `cwd` 를 접두로 쓴다 — 절대 경로 반환은 호출자가 절대 `cwd` 를 넘긴다는 계약에 의존한다.
- `project_ref` 와 `run_id` 는 단일 안전 세그먼트여야 한다. 빈 값·`.`·`..`·백슬래시·NUL 은 경로로 조립되기 전에 throw 로 거부한다 — 이 값들은 이슈 트래커와 훅 stdin 에서 오므로 신뢰 경계다.
- 파일시스템을 건드리지 않는다. 디렉터리 생성·삭제는 호출자 몫이다.

## API Contracts

GitHub 참조는 단일 디렉터리 세그먼트로 매핑한다. 호출자는 경로 조립과 디렉터리 생성을 구분해야 하며, 이 모듈은 파일시스템을 변경하지 않는다.

## Acceptance Criteria

### AC-segment-guard — 세그먼트 거부

- `project_ref` 가 빈 값·`.`·`..`·백슬래시·NUL 을 담으면 throw 한다.
- `run_id` 가 슬래시를 담으면 throw 한다 — 하위 경로 주입이 막힌다.

### AC-github-ref-mapping — GitHub ref 매핑

- `owner/repo` 형태의 `project_ref` 가 `owner--repo` 단일 세그먼트로 매핑된다.

## Last Updated

경로 세그먼트·프로젝트 매핑의 내용과 근거가 바뀔 때 갱신한다.
