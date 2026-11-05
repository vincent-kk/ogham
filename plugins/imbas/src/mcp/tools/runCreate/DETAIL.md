# runCreate — Contract

## Requirements

- MCP 도구 `run_create` 의 핸들러다. 등록은 `mcp/server` 가 `wrapHandler` 로 감싸므로, 여기서 던진 예외는 MCP `isError: true` 응답이 된다.
- 한 번의 호출이 실행 디렉터리·소스 사본·초기 state 세 가지를 함께 만든다. 파이프라인의 다른 도구는 이 세 가지가 이미 있다고 전제한다.
- 실행 ID 생성은 `runIdGenerator`, 초기 상태 조립과 영속은 `stateManager` 가 소유한다. ID 규칙이나 phase 초기값을 여기서 다시 정하지 않는다.
- 소스 문서는 실행 디렉터리 안으로 복사한다 — 원본 경로에 의존하면 이후 단계가 워크스페이스 밖 파일의 수명에 묶인다. `source_file` 은 항상 실재하는 파일 경로다; 센티널 문자열을 실재 파일 대신 넘기지 않는다.

## API Contracts

- 실행 ID 발급은 디렉터리 스캔이므로 동시 호출에 원자적이지 않다. MCP stdio 단일 프로세스를 전제로 한다.
- 보조 문서는 basename으로 복사하므로 같은 이름은 뒤 항목이 앞 항목을 덮어쓴다.
- 소스·보조 문서 복사 실패는 이미 만든 실행 디렉터리를 남기며 state는 아직 없다. 전체 생성 과정을 트랜잭션으로 오인하지 않는다.
- 상태 파일 쓰기만 원자적 교체이며 초기 상태의 구체 값은 stateManager와 테스트가 정의한다.

## Acceptance Criteria

### AC-run-id-format — 실행 ID 형식

- `run_id` 는 `YYYYMMDD-NNN` 형식이다.
- 같은 날 두 번째 호출은 시퀀스가 증가한 ID 를 받는다 — 기존 실행 디렉터리를 덮어쓰지 않는다.

## Last Updated

실행 생성·소스 복사·부분 실패 계약의 내용과 근거가 바뀔 때 갱신한다.
