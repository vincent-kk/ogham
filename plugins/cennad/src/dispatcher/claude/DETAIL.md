## Requirements

- `claudeDispatcher` 는 `claude -p ... --output-format json` 을 실행하고 단일 JSON
  결과를 `DispatchResult` 로 정규화한다. start 는 `--session-id` 로 cennad
  sessionId 를 주입하고, resume 은 `--resume <ref>` 로 이어간다.
- 격리 플래그 `--strict-mcp-config` + `--safe-mode` 를 start/resume 모두 항상
  부착한다. cennad 는 Claude 세션 안에서 claude 를 호출하므로, 격리하지 않으면
  자식이 부모의 MCP(특히 cennad `tools` 서버)·훅·CLAUDE.md·스킬을 상속한다.
- tier 는 `config.model_map.claude` 의 `{model, effort}` 로 해석한다. env override
  `CENNAD_CLAUDE_<TIER>_MODEL`/`_EFFORT` 가 우선한다. effort 가 없으면(haiku 등)
  `--effort` 를 부착하지 않는다.
- sandbox 개념이 없다(claude-code 에 `--sandbox` 없음). 격리는 권한 기반이며
  `permission_mode` 단일 노브(6종)로 제어한다.
- 빈 stdout·비JSON·비정상 종료코드는 `../errorMap` 로 정규화하며, 손상된 출력을
  성공으로 위장하지 않는다.

## API Contracts

### `resolveClaudeTier(tier, map): { model, effort? }`

- `map` = `config.model_map.claude` (없으면 env, 둘 다 없으면 `opus`).
- env override 가 map 보다 우선. effort 미해결 시 `effort` 키를 생략한다.

### `buildStartArgs(args, resolved) / buildResumeArgs(args, resolved)`

- start argv: `-p <prompt> --output-format json --session-id <id> --permission-mode
  <m> --model <model> [--effort <e>] [--fallback-model <chain>] --strict-mcp-config
  --safe-mode`.
- resume argv: `--session-id` 대신 `--resume <ref>`, `--fallback-model` 미부착.

### `parseResult(stdout): { response, error }`

- `--output-format json` 단일 객체의 `result` 를 응답 텍스트로 추출한다.
- `is_error === true` 또는 `subtype !== 'success'` 면 실패. 빈 출력/비JSON 도 실패.

### Acceptance

- start 는 `-p`/`--output-format json`/`--session-id`/`--model`/`--effort`/
  `--permission-mode` + `--strict-mcp-config`/`--safe-mode` 를 보내고 `--resume` 는
  보내지 않는다. `externalSessionRef` = 주입한 sessionId.
- effort 미지원 tier(haiku)는 `--effort` 를 보내지 않는다.
- resume 은 `--resume <ref>` 를 보내고 `externalSessionRef` 를 보존한다.
