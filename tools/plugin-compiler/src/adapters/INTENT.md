## Purpose

facts 를 호스트 어댑터 파일 내용(순수 객체)으로 변환한다. 산출물은 매니페스트(플러그인 루트 + `.codex-plugin/` 두 곳에 같은 내용)·agy MCP 설정·agy 훅(named-group)·Codex 마켓플레이스이며, 디스크 접촉이 없다.

## Structure

| Path                                   | Role                                                         |
| -------------------------------------- | ------------------------------------------------------------ |
| `builders/buildCodexPluginManifest.ts` | PluginFacts → `.codex-plugin/plugin.json` 객체               |
| `builders/buildCodexMcpServers.ts`     | PluginFacts → Codex 인라인 mcpServers (서버명=플러그인명)    |
| `builders/buildAgyMcpConfig.ts`        | PluginFacts → `mcp_config.json` 객체 (서버명 원본 유지)      |
| `builders/buildAgyHooks.ts`            | PluginFacts → 루트 `hooks.json` (PreToolUse→agy named-group) |
| `builders/buildCodexMarketplace.ts`    | MarketplaceFacts → `.agents/plugins/marketplace.json` 객체   |
| `utils/buildPortableMcpServer.ts`      | 공용 서버 변환 — args 상대화 · `OGHAM_HOST` env 주입         |
| `utils/relativizePluginRootPath.ts`    | `${CLAUDE_PLUGIN_ROOT}/X` → `X` (접두 외 사용은 throw)       |

## Conventions

- 빌더 함수는 전부 동기·순수 — `(facts) => Record<string, unknown>`, 조건부 산출물(`mcpServers` 미설정 등)만 `| null` 을 반환한다.
- 서버명 규칙은 호스트마다 다르다 — `buildCodexMcpServers` 는 서버가 여럿일 때만 `{plugin}-{server}` 로 재명명하고, `buildAgyMcpConfig` 는 원본 서버명을 그대로 쓴다.
- `${CLAUDE_PLUGIN_ROOT}` 는 `command`·`env` 값에 남아있으면 throw, `args` 접두사일 때만 상대화한다(`buildPortableMcpServer` → `relativizePluginRootPath`).

## Boundaries

### Always do

- 키 순서를 코드에서 고정 — 동일 facts 는 바이트 동일 출력(stableJson 전제).
- 생성 MCP 선언마다 `OGHAM_HOST` 마커를 env 에 병합 (codex/agy).

### Ask first

- 서버명 오버라이드·복사 필드 목록 변경 — Codex 도구명 표면과 매니페스트 계약에 영향.

### Never do

- 디스크 I/O — 쓰기는 `pipeline/applyFiles` 단일 경로.
- Claude 산출물 형식 변형 재출력 (Claude 파일은 이 모듈의 출력 대상이 아니다).

## Dependencies

- `types/` (PluginFacts · MarketplaceFacts · McpServerSource), `constants/hosts.ts` (HOST_MARKERS · HOST_MARKER_ENV_NAME), `constants/claudeArtifacts.ts` (CLAUDE_PLUGIN_ROOT_VARIABLE · CLAUDE_HOOKS_PATH · SKILLS_DIRECTORY), `constants/adapterPaths.ts` (AGY_RUNNER_BRIDGE) 만 — 외부 패키지·Node 내장 모듈 없음.
