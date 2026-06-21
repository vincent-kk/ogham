# eventDispatch — DETAIL

## Requirements

- 이벤트당 정확히 하나의 bridge 프로세스로 동작한다. 한 이벤트의 모든 maencof 관심사는 이 프로세스 안에서 순차 실행된다.
- 한 관심사의 예외가 다른 관심사나 전체 결과를 중단시키지 않는다 (`safeConcern` 격리; 실패는 `appendErrorLogSafe` 후 `{ continue: true }` 로 강등).
- 관심사 실행 순서와 각 핸들러의 출력 채널은 통합 이전(개별 hooks.json 등록)과 동일하게 보존한다.
- 차단(`continue:false`)은 PreToolUse 에서 stdout JSON 으로, Stop 에서 stderr + `exit(2)` 로 신호한다.

## API Contracts

### Input / Output types (`utils/types.ts`)

- `DispatchInput` — 모든 관심사 핸들러 입력의 상위집합(전 필드 optional): `session_id` / `cwd` / `tool_name` / `tool_input` / `tool_response` / `prompt` / `skills_used` / `files_modified`.
- `HookConcernResult` — 모든 관심사 반환의 상위집합: `continue` + optional `reason` / `message` / `systemMessage` / `hookSpecificOutput`.
- `MergedHookOutput` — 병합 결과 envelope: `continue` + optional `reason` / `message` / `systemMessage` / `hookSpecificOutput{ hookEventName, additionalContext }`.

### Merge rules (`mergeHookOutput(event, results)`)

- `continue`: 하나라도 `false` 면 `false` (AND). `false` 인 결과의 `reason` 들을 `\n\n` 로 concat.
- `additionalContext`: 비어 있지 않은 값을 `\n\n` 로 concat, `hookSpecificOutput.hookEventName = event` 로 감싼다.
- `systemMessage` / `message`: 각각 비어 있지 않은 값을 `\n\n` 로 concat (Stop / SessionEnd 채널).

### Per-event composition (`orchestrators/`, 실행 순서대로)

- **SessionStart** — `runSessionStart` → `runLifecycleDispatcher('SessionStart')`. entry 가 `selfProbe` 진단을 additionalContext 끝에 덧붙인다.
- **UserPromptSubmit** — `injectContext` → `runLifecycleDispatcher('UserPromptSubmit')` → `runInsightInjector` → `runVaultCommitter(…, 'UserPromptSubmit')`(side-effect, 마지막).
- **PreToolUse** — `Write|Edit`→`runLayerGuard`(차단 가능), `Read|Grep|Glob`→`runVaultRedirector` → `runLifecycleDispatcher('PreToolUse')`.
- **PostToolUse** — `tool_name ∈ MAENCOF_MCP_TOOLS` 일 때만 `runActivityRecorder` → `runLifecycleDispatcher('PostToolUse')`.
- **Stop** — `runChangelogGate`(차단 가능, migration.lock 정리 부수효과) → `runLifecycleDispatcher('Stop')`. 차단 시 entry 가 `reason`(+`systemMessage`)을 stderr 로 쓰고 `exit(2)`.
- **SessionEnd** — `runSessionEnd`(파일 기록) → `runLifecycleDispatcher('SessionEnd')` → `runVaultCommitter(…, 'SessionEnd')`(commit, 마지막 — 앞 기록을 포함).

### Build

- entry 는 `bridge/<event>.mjs` 로 번들된다: `session-start` / `user-prompt-submit` / `pre-tool-use` / `post-tool-use` / `stop` / `session-end`. `scripts/build-hooks.mjs` 의 `entryPath` 로 등록.
- 번들 격리 가드(byte cap + FORBIDDEN_PATTERNS)는 유지된다 — 관심사를 결합해도 zod / fast-glob / MCP SDK 를 끌어오지 않는다.
