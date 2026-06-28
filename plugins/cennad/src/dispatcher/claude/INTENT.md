# claude — Claude Code CLI(`claude`) 어댑터

## Purpose

claude-code CLI(`claude -p`) 어댑터. `--session-id` 로 cennad sessionId 를 주입해 externalSessionRef 추적을 단순화하고, `--output-format json` 단일 객체를 파싱해 `DispatchResult` 로 정규화. 부모 Claude 세션 간섭을 막기 위해 항상 격리 플래그를 부착.

## Structure

| File / Path          | Role                                                                  |
| -------------------- | -------------------------------------------------------------------- |
| `operations/`        | `claudeDispatcher`(start/resume), `resolveTier`(model_map.claude 소비), `spawn` |
| `utils/`             | `buildStartArgs`·`buildResumeArgs`·`parseResult`(단일 JSON)·`dispatch` |
| `index.ts`           | `export { claudeDispatcher }` barrel                                 |

## Conventions

- `start`: `claude -p <prompt> --output-format json --session-id <id> --permission-mode <m> --model <model> [--effort <e>] [--fallback-model <chain>] --strict-mcp-config --safe-mode`
- `resume`: start 와 동일하되 `--session-id` 대신 `--resume <ref>`, `--fallback-model` 미부착
- tier→`{model, effort}` 는 `config.model_map.claude` 단독; env override `CENNAD_CLAUDE_<TIER>_MODEL`/`_EFFORT`
- effort 미설정 모델(haiku 등)은 `--effort` 미부착; sandbox 개념 없음(권한 기반 격리)
- `externalSessionRef` = start 시 주입한 sessionId (출력 파싱 불필요)

## Boundaries

### Always do

- `--strict-mcp-config` + `--safe-mode` 항상 부착 (부모 MCP/훅/CLAUDE.md/스킬 상속 차단)
- 모든 에러는 `../errorMap` 로 정규화; 빈/비JSON 출력은 명시적 실패로 변환

### Ask first

- `ClaudeFlags`/`supportedOptions` 화이트리스트 변경
- 격리 플래그 약화(`--bare` 도입 등) 또는 `--mcp-config` 주입 추가

### Never do

- 하드코딩 모델 문자열(ultimate fallback `opus` 외); stdin 으로 prompt 전달
- claude-code 자체 세션 파일 조작; 동기 spawn 사용

## Dependencies

- `@ogham/cross-platform`(`spawnCli`)
- `../errorMap`, `../utils/computeIgnoredOptions`
- `../../types`, `../../constants`(model/effort 상수는 UI/검증용; 디스패처는 config 값 소비)
