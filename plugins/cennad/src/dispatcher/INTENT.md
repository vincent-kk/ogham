## Purpose

codex-cli / agy / claude 호출 본체. MCP 도구 핸들러에서 받은 `DispatchOptions` 를 외부 CLI 실행으로 변환하고, 결과·에러를 `ConversationResponse` envelope 로 정규화.

## Conventions

- `supportedOptions` 는 모든 dispatcher 비어 있음 — 모든 키는 `ignoredOptions` 로 보고
- 권한 플래그(`yolo`/`sandbox`/`sandbox_backend`)는 `DispatchOptions.flags` 채널 — config 단독, MCP input 노출 금지
- 외부 CLI 호출은 `@ogham/cross-platform` 의 `spawnCli` 경유; 항상 `detached: true` (손자까지 그룹킬)
- 환경 변수: codex 상속만; claude 는 `--strict-mcp-config --safe-mode` 항상 부착 (부모 세션 MCP·훅·CLAUDE.md 격리)
- prompt prefix 합성은 MCP tool 진입에서 `composePrompt` 1회 — dispatcher 는 합성 후 문자열만 받음
- 저장소 상태는 호출자가 주입하며 dispatcher가 직접 core 모듈을 import하지 않는다. 실행 결과는 호출자에게 돌려주어 저장소 소유권을 지킨다.

## Boundaries

### Always do

- CLI 종료·진단·취소 신호는 종료 코드와 무관하게 오류 매핑 모듈로 정규화한다 — 같은 진단이 provider마다 다른 코드로 갈리는 것을 막는다. 직접 코드는 CLI 가 사유를 보고하지 않은 Codex 세션 참조 누락의 `unknown`과 복구 불가능한 Antigravity 빈 출력의 `cli_error`에 한정한다
- `ignoredOptions` 에 supportedOptions 미포함 키만 담기
- Claude 재개는 기존 세션 참조를 사용하고 설정된 fallback model을 유지한다 — 이어지는 호출에도 사용자가 정한 모델 대체 정책이 적용되어야 한다
- codex resume 시 sandbox/yolo/search/cd 플래그 자동 제거

### Ask first

- 새 옵션을 `supportedOptions` / `DispatchOptions.flags` 화이트리스트에 추가
- 새 exit code 매핑 (errorMap 테이블 변경)

### Never do

- 외부 CLI 의 자체 세션 파일(`$CODEX_HOME/sessions/`) 수정·삭제
- 외부 CLI 호출 결과를 `core/` 로 직접 우회 — 항상 `DispatchResult` 통해 반환
- 동기 spawn (`spawnSync`) 사용 — 항상 비동기
