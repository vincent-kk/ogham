# runGet — Contract

## Requirements

- MCP 도구 `run_get` 의 핸들러다. 등록은 `mcp/server` 가 `wrapHandler` 로 감싸므로, 여기서 던진 예외는 MCP `isError: true` 응답이 된다.
- 두 인자 모두 생략 가능한 것이 이 도구의 요점이다 — 스킬이 "지금 이 프로젝트의 최신 실행"을 인자 없이 집을 수 있어야 한다. `project_ref` 는 설정의 `defaults.project_ref` 를, `run_id` 는 runs 디렉터리의 마지막 항목을 승계한다.
- 실행이 하나도 없으면 빈 결과가 아니라 오류다 — 이 도구는 특정 실행의 상태를 읽는 도구이며, 목록 조회는 `run_list` 의 일이다.
- 상태 로드는 `stateManager` 의 `loadRunState` 가 소유한다. `state.json` 파싱을 여기서 다시 구현하지 않는다.
- 읽기 전용이다(`readOnlyHint: true`). 조회가 실행 디렉터리를 만들거나 고치지 않는다.

## API Contracts

```typescript
export function handleRunGet(input: RunGetInput): Promise<{
  state: RunState;
  run_dir: string;
  manifests_available: string[];
}>;

interface RunGetInput {
  project_ref?: string; // 생략 시 defaults.project_ref
  run_id?: string; // 생략 시 runs 디렉터리의 사전순 마지막
  project_root?: string;
}
```

- MCP `inputSchema` 의 세 필드가 모두 optional 이다 — 인자 없는 호출이 정상 경로다.
- 최신 실행 선택은 `readdirSync(runsDir).sort()` 의 마지막 항목이다. `run_id` 가 `YYYYMMDD-NNN` 고정폭이라 사전순이 곧 생성순이며, 이 등가는 ID 형식에 의존한다.
- `manifests_available` — `MANIFEST_FILE_MAP` 의 키(`stories`·`devplan`·`implement-plan`) 중 해당 파일이 실행 디렉터리에 실재하는 것들이다. 파일 내용은 읽지 않으므로 존재 여부만 말한다.
- 실패 — `project_ref` 를 인자로도 설정으로도 얻지 못하면 `project_ref is required (or set defaults.project_ref in config)`; runs 디렉터리가 없으면 `No runs directory found for project: <ref>`; 비어 있으면 `No runs found for project: <ref>`; `state.json` 부재·스키마 불일치는 `loadRunState` 오류로 올라온다.
- 배럴은 `handleRunGet` 만 노출한다.

## Acceptance Criteria

### AC-latest-run-default — 최신 실행 승계

- `run_id` 없이 호출하면 runs 디렉터리의 사전순 마지막 실행 상태를 반환한다.
- runs 디렉터리가 없거나 비면 각각을 구분하는 문장으로 오류 응답이 된다.

### AC-project-ref-fallback — project_ref 승계

- `project_ref` 없이 호출하면 설정의 `defaults.project_ref` 로 조회하고, 설정에도 없으면 설정 키를 지목하는 문장으로 거부한다.

### AC-manifest-presence — 매니페스트 존재 보고

- 매니페스트가 하나도 없는 실행은 `manifests_available: []` 를 준다 — 오류가 아니다.
- 파일이 생기면 해당 키가 목록에 나타난다.

## Last Updated

2026-07-30 — 실행 상태 조회 계약과 기본값 승계·실패 문장을 문서화했다.
