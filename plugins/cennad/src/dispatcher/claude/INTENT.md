# claude — Claude Code CLI(`claude`) 어댑터

## Purpose

claude-code CLI(`claude -p`) 어댑터. `--session-id` 로 cennad sessionId 를 주입해 externalSessionRef 추적을 단순화하고, `--output-format stream-json` JSONL 의 마지막 `type:"result"` 이벤트를 파싱해 `DispatchResult` 로 정규화. 부모 Claude 세션 간섭을 막기 위해 항상 격리 플래그를 부착.

## Structure

| File / Path   | Role                                                                                              |
| ------------- | ------------------------------------------------------------------------------------------------- |
| `operations/` | `claudeDispatcher`(start/resume), `resolveTier`(model_map.claude 소비), `spawn`                   |
| `utils/`      | `buildStartArgs`·`buildResumeArgs`·`findResultEvent`·`parseResult`·`cliFailureMessage`·`dispatch` |
| `index.ts`    | `export { claudeDispatcher }` barrel                                                              |

## Conventions

- `start`: `claude -p <prompt> --output-format stream-json --verbose --session-id <id> --permission-mode <m> --model <model> [--effort <e>] [--fallback-model <chain>] --strict-mcp-config --safe-mode` (`--verbose` 없으면 `-p` + stream-json 이 거부됨; 스트리밍이 idle timeout 의 liveness 신호)
- `resume`: start 와 동일하되 `--session-id` 대신 `--resume <ref>`, `--fallback-model` 미부착
- tier→`{model, effort}` 는 `config.model_map.claude` 단독; env override `CENNAD_CLAUDE_<TIER>_MODEL`/`_EFFORT`
- effort 스케일 `low<medium<high<xhigh<max<ultracode` (최상단은 멀티에이전트 오케스트레이션 모드). claude-code 는 미지원 단계를 에러 없이 조용히 낮추므로 모델별 제한은 settings UI 의 `MODEL_EFFORT_SETS` 가 전담한다
- effort 미설정 모델(haiku 등)은 `--effort` 미부착; sandbox 개념 없음(권한 기반 격리)
- `externalSessionRef` = start 시 주입한 sessionId (출력 파싱 불필요)
- spawn 은 `signal`(호출자 취소) + `detached: true`(자식 claude 가 띄운 도구 프로세스까지 그룹킬); 중단으로 끝나면 `cancelled` → `error.code='cancelled'` 이며 timeout·retry storm 과 구분된다

## Boundaries

### Always do

- `--strict-mcp-config` + `--safe-mode` 항상 부착 (부모 MCP/훅/CLAUDE.md/스킬 상속 차단)
- 모든 에러는 `../errorMap` 로 정규화; 빈/비JSON 출력은 명시적 실패로 변환
- 0 이 아닌 exit 도 stdout 의 result 이벤트를 읽어 `cliFailureMessage` 를 `cliMessage` 로 넘긴다 — 사용량 한도는 stderr 를 비운 채 종료하므로 이게 없으면 `unknown` 이 나간다

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
