## Purpose

`@ogham/cennad` 패키지 루트. Codex CLI / Antigravity CLI / Claude CLI 위임용 Claude Code 플러그인. Windows 호환성은 [`.metadata/cross-platform/`](../../.metadata/cross-platform/) 에서 추적.

## Conventions

- 빌드(도메인 스크립트 조합): `clean → version:sync → pages → compile → mcp → hooks → compile-plugin`
- 플러그인 prefix 없는 스킬 이름 (`setup`, `codex`, `antigravity`, `claude`, `crosscheck`)
- Agent 는 `courier` 1개 (`cennad:courier`) — provider 스킬 3종이 background spawn 한다. 관점(정교화 ≤3콜 · 실패 remedy · tier 의미론)은 courier, 스킬은 행동(파싱→spawn→릴레이)만. crosscheck 는 정교화가 없어 courier 를 거치지 않고 MCP 도구를 직접 병렬 호출한다
- E2E 는 이중 레이어 (Layer A in-process + Layer B 번들 stdio); `CENNAD_E2E_REAL_CLI=1` 일 때만 real CLI

## Boundaries

### Always do

- 런타임 상태는 선택된 호스트의 상태 루트 안에서 이 플러그인 전용 영역에 격리한다. 명시적 `CENNAD_CONFIG_PATH` override를 존중하고, 프로젝트 artifact는 opt-in일 때만 프로젝트 로컬 영역에 둔다.

### Ask first

- 새 빌드 스크립트 추가 (파이프라인 영향)
- 패키지의 배포 산출물 범위 변경

### Never do

- 일반 빌드 출력물을 커밋 (배포용 bridge와 settings page 산출물은 의도적으로 커밋한다)
- 생성기가 소유한 소스 version 또는 플러그인 manifest version을 손으로 수정
