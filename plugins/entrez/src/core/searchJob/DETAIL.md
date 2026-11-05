# searchJob — Contract

## Requirements

- MCP 동기 응답 시간을 넘는 검색은 job 으로 돌린다. job 레코드는 디스크에 영속하며 항상 0o600 으로 기록한다.
- 읽기와 쓰기 모두 `JobRecordSchema` 로 검증한다 — 손상된 레코드를 그대로 신뢰하지 않는다.
- 경로·시계·id 는 주입할 수 있다. 테스트가 결정적으로 재현할 수 있어야 한다.
- `updatedAt` 은 쓰기마다 갱신하고 `jobId` 는 기존 값을 유지한다.

## API Contracts

호출 형태와 구체적인 반환 값은 공개 진입점과 테스트에서 확인한다.

## Acceptance Criteria

### AC-job-persistence — 영속과 검증

- 기록된 job 파일 권한이 0o600 이다.
- 스키마를 통과하지 못하는 레코드는 읽기에서 거부된다.

### AC-job-update-invariants — 갱신 불변식

- 갱신마다 `updatedAt` 이 바뀐다.
- `jobId` 는 갱신으로 바뀌지 않는다.

## Last Updated

검색 job의 영속 형식·검증·페이지 조회 계약이 바뀔 때 갱신한다.
