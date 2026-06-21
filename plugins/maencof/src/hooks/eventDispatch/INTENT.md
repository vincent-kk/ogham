# eventDispatch

## Purpose

이벤트별 단일 훅 디스패처. 각 Claude Code 훅 이벤트(SessionStart / UserPromptSubmit / PreToolUse / PostToolUse / Stop / SessionEnd)를 하나의 bridge 프로세스로 받아, 그 이벤트의 관심사 핸들러들을 순차·격리 실행하고 단일 envelope 로 병합한다. 프로세스 수를 이벤트당 1개로 고정해 node cold-start 부담을 제거한다.

## Structure

| Path                       | Role                                                    |
| -------------------------- | ------------------------------------------------------- |
| `entries/`                 | 이벤트별 esbuild 진입점 (stdin → orchestrator → stdout) |
| `orchestrators/`           | 이벤트별 관심사 조합 + 실행 순서                        |
| `utils/mergeHookOutput.ts` | 관심사 결과들을 단일 envelope 로 병합                   |
| `utils/safeConcern.ts`     | 관심사 단위 에러 격리 래퍼 (sync / async)               |
| `utils/types.ts`           | DispatchInput / HookConcernResult / MergedHookOutput    |

## Conventions

- 관심사 핸들러는 기존 모듈 배럴(`../sessionStart`, `../layerGuard` 등)에서 import; 로직 인라인 금지.
- 실행 순서 = 기존 hooks.json 등록 순서를 보존한다.
- PreToolUse·PostToolUse 는 matcher 가 `*` 로 통합되므로 `tool_name` 으로 내부 라우팅한다.
- 병합 채널: `continue`(AND) / `reason` / `additionalContext` / `systemMessage` / `message`.

## Boundaries

### Always do

- 각 관심사를 `safeConcern` 으로 감싸 한 관심사의 throw 가 나머지를 중단시키지 않게 한다.
- Stop 차단(`continue:false`)은 entry 에서 stderr + `exit(2)` 로 신호한다.
- PostToolUse 의 activityRecorder 는 `MAENCOF_MCP_TOOLS` allowlist 로 게이트한다.

### Ask first

- 관심사 실행 순서 변경 (additionalContext concat 순서·commit-after-write 불변식에 영향).
- 새 이벤트/관심사 추가 (build-hooks.mjs 의 entryPath 등록 필요).

### Never do

- entry 파일에 조합·병합 로직 인라인 (orchestrator / utils 경유만).
- 관심사 핸들러의 출력 채널 변경 (behavior 보존이 목적).

## Dependencies

- 관심사 fractal 배럴: `../sessionStart`, `../sessionEnd`, `../contextInjector`, `../insightInjector`, `../activityRecorder`, `../vaultCommitter`, `../changelogGate`, `../vaultRedirector`, `../layerGuard`, `../lifecycleDispatcher`
- `../shared` (readStdin / writeResult / MAENCOF_MCP_TOOLS), `../../core/errorLog`, `../../types/lifecycle`
