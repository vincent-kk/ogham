# runList — Contract

## Requirements

- MCP 도구 `run_list` 의 핸들러다. 등록은 `mcp/server` 가 `wrapHandler` 로 감싸므로, 여기서 던진 예외는 MCP `isError: true` 응답이 된다.
- 목록 조회는 "아직 아무것도 없음"을 정상 답으로 다룬다 — runs 디렉터리가 없으면 빈 목록이다. 특정 실행을 읽는 `run_get` 이 같은 상황을 오류로 다루는 것과 의도적으로 갈린다.
- 한 실행의 손상이 목록 전체를 무너뜨리지 않는다. `state.json` 을 읽지 못한 항목은 오류 표시를 달고 자리를 지키며, 나머지 항목은 그대로 보고된다.
- `project_ref` 생략은 정상 호출이다 — 설정의 `defaults.project_ref` 를 승계하고, 설정에도 없을 때만 거부한다.
- 읽기 전용이다(`readOnlyHint: true`). 목록 조회가 디렉터리를 만들지 않는다.

## API Contracts

```typescript
export function handleRunList(input: RunListInput): Promise<{
  runs: Array<
    | {
        run_id: string;
        run_dir: string;
        current_phase: PhaseName;
        status: PhaseStatus;
        created_at: string;
        updated_at: string;
      }
    | { run_id: string; run_dir: string; error: 'failed to load state' }
  >;
}>;

interface RunListInput {
  project_ref?: string; // 생략 시 defaults.project_ref
  project_root?: string;
}
```

- MCP `inputSchema` 는 `{ project_ref?: string, project_root?: string }` 다.
- `status` 는 실행의 `current_phase` 가 가리키는 phase 의 `status` 다 — 실행 전체의 상태가 아니라 지금 서 있는 단계의 상태다.
- 항목 순서는 `readdirSync(runsDir).sort()` 의 사전순이다. `run_id` 가 `YYYYMMDD-NNN` 고정폭이라 사전순이 곧 생성순이다.
- 손상 항목은 `{ run_id, run_dir, error: 'failed to load state' }` 형태이며 정상 항목의 필드를 갖지 않는다. 소비자는 두 형태를 구분해 읽어야 한다.
- 실패 — 이 도구가 throw 하는 경로는 `project_ref` 부재(`project_ref is required (or set defaults.project_ref in config)`)와 경로 세그먼트 거부뿐이다.
- 배럴은 `handleRunList` 만 노출한다.

## Acceptance Criteria

### AC-empty-when-absent — 부재는 빈 목록

- runs 디렉터리가 없으면 `{ runs: [] }` 를 반환한다 — throw 하지 않는다.

### AC-per-run-degradation — 항목 단위 degrade

- `state.json` 이 없거나 스키마를 벗어난 실행은 `error: 'failed to load state'` 항목으로 나타나고, 같은 응답의 정상 실행 항목은 온전히 유지된다.

### AC-current-phase-status — 현재 단계 상태

- 정상 항목의 `status` 는 그 실행의 `current_phase` 에 해당하는 phase 상태와 일치한다.

### AC-project-ref-fallback — project_ref 승계

- `project_ref` 없이 호출하면 설정의 `defaults.project_ref` 로 조회하고, 설정에도 없으면 설정 키를 지목하는 문장으로 거부한다.

## Last Updated

2026-07-30 — 실행 목록 계약과 항목 단위 degrade 규약을 문서화했다.
