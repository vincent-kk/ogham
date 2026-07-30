# runCreate — Contract

## Requirements

- MCP 도구 `run_create` 의 핸들러다. 등록은 `mcp/server` 가 `wrapHandler` 로 감싸므로, 여기서 던진 예외는 MCP `isError: true` 응답이 된다.
- 한 번의 호출이 실행 디렉터리·소스 사본·초기 state 세 가지를 함께 만든다. 파이프라인의 다른 도구는 이 세 가지가 이미 있다고 전제한다.
- 실행 ID 생성은 `runIdGenerator`, 초기 상태 조립과 영속은 `stateManager` 가 소유한다. ID 규칙이나 phase 초기값을 여기서 다시 정하지 않는다.
- 소스 문서는 실행 디렉터리 안으로 복사한다 — 원본 경로에 의존하면 이후 단계가 워크스페이스 밖 파일의 수명에 묶인다.
- devplan 부터 시작하는 파이프라인은 소스 문서가 없다. 그 경우를 위한 센티널이 `source_file: 'devplan-pipeline'` 이며, 복사 대신 빈 `source.md` 를 만든다.

## API Contracts

```typescript
export function handleRunCreate(input: RunCreateInput): Promise<{
  run_id: string;
  run_dir: string;
  state: RunState;
}>;

interface RunCreateInput {
  project_ref: string;
  source_file: string; // 경로 또는 센티널 'devplan-pipeline'
  supplements?: string[];
  source_issue_ref?: string;
  project_root?: string;
}
```

- MCP `inputSchema` 에서 `project_ref`·`source_file` 은 필수, `supplements`(문자열 배열)·`source_issue_ref`·`project_root` 는 optional 이다.
- `run_id` 는 `YYYYMMDD-NNN` 이다. `runIdGenerator` 가 runs 디렉터리를 만든 뒤 오늘 날짜 접두를 가진 항목의 최대 시퀀스에 1을 더한다. 스캔 기반이라 동시 호출에 원자적이지 않다 — MCP stdio 단일 프로세스라는 전제 위에 선다.
- 생성물 배치 — `<run_dir>/source.md`(소스 사본 또는 빈 파일), `<run_dir>/supplements/<basename>`(보조 문서), `<run_dir>/state.json`.
- `supplements` 는 basename 으로만 복사된다. 서로 다른 디렉터리의 같은 파일명은 뒤에 오는 쪽이 앞을 덮어쓴다.
- 초기 `state` — `current_phase: 'validate'`, 세 phase(`validate`·`split`·`devplan`) 모두 `status: 'pending'`, `epic_ref: null`, `split`·`devplan` 은 `pending_review: true`. `created_at`·`updated_at` 은 같은 ISO 타임스탬프다.
- `state.json` 쓰기는 `writeJson` 의 temp → rename 이다. 디렉터리 생성과 파일 복사는 그 전에 동기로 끝난다.
- 실패 — 존재하지 않는 `source_file`(센티널 제외)이나 `supplements` 항목은 복사 단계에서 throw 한다. 이때 실행 디렉터리는 이미 만들어져 있고 `state.json` 은 없다.
- 배럴은 `handleRunCreate` 만 노출한다.

## Acceptance Criteria

### AC-run-id-format — 실행 ID 형식

- `run_id` 는 `YYYYMMDD-NNN` 형식이다.
- 같은 날 두 번째 호출은 시퀀스가 증가한 ID 를 받는다 — 기존 실행 디렉터리를 덮어쓰지 않는다.

### AC-sentinel-source — 센티널 소스

- `source_file: 'devplan-pipeline'` 은 파일 복사 없이 빈 `source.md` 를 만든다 — 존재하지 않는 경로로 실패하지 않는다.
- 그 외 값은 실제 파일로 취급해 복사한다.

### AC-supplements-copied — 보조 문서 복사

- `supplements` 를 넘기면 `<run_dir>/supplements/` 아래에 각 파일의 basename 으로 사본이 생긴다.

### AC-initial-state — 초기 상태

- 반환된 `state` 의 `current_phase` 는 `validate` 이고 세 phase 가 모두 `pending` 이며, 같은 내용이 `state.json` 에 남는다.

## Last Updated

2026-07-30 — 실행 생성 계약과 센티널 소스·ID 생성 규약을 문서화했다.
