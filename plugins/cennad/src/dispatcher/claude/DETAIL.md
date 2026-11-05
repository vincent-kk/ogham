## Requirements

- `claudeDispatcher` 는 `claude -p ... --output-format stream-json --verbose` 를 실행하고 JSONL 의 마지막 result 이벤트를 `DispatchResult` 로 정규화한다. start 는 `--session-id` 로 cennad sessionId 를 주입하고, resume 은 `--resume <ref>` 로 이어간다.
- 스트리밍은 선택이 아니라 timeout 계약의 일부다: 진행 이벤트가 `spawnCli` 의 `idleTimeoutMs` 를 계속 리셋하므로 "오래 걸리는 작업"과 "멈춘 프로세스"가 구분된다. 단일 `json` 포맷은 완료까지 무출력이라 이 구분이 불가능하다.
- 격리 플래그 `--strict-mcp-config` + `--safe-mode` 를 start/resume 모두 항상 부착한다. cennad 는 Claude 세션 안에서 claude 를 호출하므로, 격리하지 않으면 자식이 부모의 MCP(특히 cennad `tools` 서버)·훅·CLAUDE.md·스킬을 상속한다.
- tier 는 `config.model_map.claude` 의 `{model, effort}` 로 해석한다. env override `CENNAD_CLAUDE_<TIER>_MODEL`/`_EFFORT` 가 우선한다. effort 가 없으면(haiku 등) `--effort` 를 부착하지 않는다.
- sandbox 개념이 없다(claude-code 에 `--sandbox` 없음). 격리는 권한 기반이며 `permission_mode` 단일 노브(6종)로 제어한다.
- 빈 stdout·비JSON·비정상 종료코드는 `../errorMap` 로 정규화하며, 손상된 출력을 성공으로 위장하지 않는다. CLI 가 구조화 출력으로 보고한 실패 사유도 종료 코드와 무관하게 이 경로로 정규화한다.

## API Contracts

- env override가 tier map보다 우선하며, effort를 결정하지 못하면 CLI에 맡긴다. 지원하지 않는 effort를 임의로 보충하지 않는다.
- 재개에도 설정된 fallback model을 유지하여 사용자의 모델 대체 정책이 새 호출과 이어지는 호출에 동일하게 적용되게 한다.
- JSONL의 마지막 result가 호출의 판정이며 깨진 출력은 성공으로 위장하지 않는다. 인자 배열과 파싱 결과의 세부 형태는 구현과 테스트를 읽는다.

## Acceptance Criteria

검증 코드가 수용 기준을 고정하므로 별도 acceptance group을 선언하지 않는다.

## Last Updated

Claude 부모 세션 격리·스트리밍·재개 계약의 내용이나 적용 범위가 바뀔 때 갱신한다.
