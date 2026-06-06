# Roadmap — Implementation Order

filid 빌드 파이프라인을 기준으로 한다. 각 단계는 독립 PR 가능 단위. 단계 종료 시 `yarn cogair build` 가 통과해야 한다.

프로바이더: `codex`, `gemini`, `antigravity` (3개). `gemini` 와 `antigravity` 는 상호 배타 Google 슬롯 — Gemini CLI 서비스 종료일 2026-06-18 이후 `antigravity` 가 기본. MCP 도구는 4개(`start_conversation`, `continue_conversation`, `open_settings`, `list_antigravity_models`).

## Phase 0 — Skeleton

1. `packages/cogair/` 디렉토리 생성.
2. `package.json`: name `@ogham/cogair`, version `0.1.0`, type `module`, `exports`/`main`/`types` dist 기반.
   - `files`: `["dist", "bridge", "hooks", "libs", "skills", ".claude-plugin", ".mcp.json", "README.md"]`.
   - scripts: `build`, `build:plugin`, `clean`, `dev`, `format`, `test`, `test:run`, `test:coverage`, `typecheck`, `version:*`.
   - deps: `@modelcontextprotocol/sdk` ~1.22, `zod` ^3.23.
   - devDeps: `esbuild`, `typescript`, `vitest`, `@vitest/coverage-v8`, `@types/node`.
3. `tsconfig.json`, `tsconfig.build.json`, `vitest.config.ts`, `.prettierrc`, `.prettierignore`, `.gitignore` 를 filid 에서 복사 후 조정.
4. `.claude-plugin/plugin.json`: `{ name: "cogair", skills: "./skills/", mcpServers: "./.mcp.json" }`.
5. `.mcp.json`: `{ mcpServers: { tools: { command: "node", args: ["${CLAUDE_PLUGIN_ROOT}/bridge/mcp-server.cjs"] } } }`.
6. `libs/run.cjs` filid 복사.
7. `src/version.ts` 자동 생성 가능 상태.
8. `src/index.ts` 빈 barrel.
9. 루트 `yarn build:all` 이 cogair 까지 통과.

## Phase 1 — Types + constants + lib utilities

1. `src/types/`: `conversation.ts` (ConversationResponse, ConversationOptions), `config.ts`, `session.ts`, `counter.ts`, `settingsServer.ts`, `index.ts`. 모든 스키마는 Zod.
2. `src/constants/`: `paths.ts`, `defaults.ts`, `errorCodes.ts`.
3. `src/lib/atomicWrite.ts`, `src/lib/logger.ts`.
4. `src/utils/parentPid.ts`, `src/utils/isoNow.ts`.
5. 단위 테스트 (`__tests__/`). Vitest 통과.

## Phase 2 — Core storage

1. `src/core/configManager/`: `loadConfig`, `saveConfig` (atomic write + defaults 병합 + Zod 검증).
2. `src/core/counterManager/`: `loadCounter`, `incrementCounter` (parent-pid 리셋), `getCounter`.
3. `src/core/projectHash/`: `getProjectHash(cwd)`.
4. `src/core/sessionStore/`: `createSession`, `getSession` (project_hash 일치 검사 포함), `updateSession`, `pruneExpired` (cogair 매핑 + gemini-cwd / antigravity-cwd 삭제).
5. `src/core/authToken/`: `generateToken`, `verifyToken`.
6. `src/core/index.ts` barrel.
7. 단위 테스트. tmp dir 으로 디스크 격리.

## Phase 3 — Dispatcher

1. `src/dispatcher/envelope.ts`, `src/dispatcher/errorMap.ts`.
2. `src/dispatcher/codex/`: `spawn.ts`, `jsonlParser.ts`, `modelAlias.ts`, `index.ts` (`supportedOptions = new Set()`).
3. `src/dispatcher/gemini/`: `spawn.ts`, `sessionResolver.ts`, `modelAlias.ts`, `index.ts` (`supportedOptions = new Set()`).
4. `src/dispatcher/antigravity/`: `spawn.ts`, `modelAlias.ts` (config `model_map.antigravity` 읽기), `antigravityDispatcher.ts`, utils(`ensureCwd`, `buildStartArgs`, `buildResumeArgs`, `callAgy`, `parseJsonOutput`, `resolveTranscript`), `index.ts`.
   - CLI 호출 패턴: `agy -p "<prompt>" --output-format json [--sandbox] [--dangerously-skip-permissions] [-m "<model>"]`; resume 시 `--continue` 선두 추가.
   - 세션 격리: `runtime/antigravity-cwd/<sessionId>/` (`0o700`). `externalSessionRef` = cwd 경로. agy 는 headless conversation-id 미발급(Issue #7)이라 cwd 가 세션 핸들.
   - 응답: json stdout 1차; 빈 stdout(Issue #76) 시 `resolveTranscript` 폴백 → 실패 시 `cli_error`.
   - resume 타임아웃 시 cwd 삭제 금지 (대화 이력 보존).
5. `src/dispatcher/utils/computeIgnoredOptions.ts`, `src/dispatcher/utils/composePrompt.ts`.
6. `src/dispatcher/index.ts` barrel.
7. 통합 테스트: 가짜 PATH 의 mock CLI 스크립트로 시나리오 커버 (success / auth-fail / rate-limit / network-fail / cli-missing / ignored-options).

## Phase 4 — MCP server + 4 tools

1. `src/mcp/shared/toolResponse.ts`.
2. `src/mcp/tools/startConversation/handler.ts`.
3. `src/mcp/tools/continueConversation/handler.ts` (project_hash 검증 → error.code='unknown').
4. `src/mcp/tools/listModels/listModels.ts`: `list_antigravity_models` — 입력 없음, `{ models: string[] }` 반환. `core/agyModels.getAvailableModels` 에 위임; agy 미설치·미인증 시 빈 배열.
5. `src/core/agyModels/`: `getAvailableModels` (TTL 1h 캐시), `refreshModels` (`agy models` spawn → 파싱 → write), `utils/parseModels` (JSON 또는 텍스트 테이블 → `string[]`). 캐시 파일 `runtime/agy-models.json`.
6. `src/mcp/server/lifecycle/createServer.ts`: 4 tool 등록.
7. `src/mcp/serverEntry/serverEntry.ts`.
8. `scripts/buildMcpServer.mjs` (filid 동일 패턴, native-deps 단순화).
9. `yarn cogair build:plugin` 으로 `bridge/mcp-server.cjs` 생성 확인.
10. Claude Code 등록 후 수동 호출 검증.

## Phase 5 — Settings web UI (`open_settings`)

1. `src/mcp/pages/settings/` FE 작성.
2. `scripts/buildSettingsHtml.mjs` 작성.
3. `src/mcp/tools/openSettings/webServer/` 작성.
4. `src/mcp/tools/openSettings/handler.ts`: 기존 서버 reuse 또는 신규 기동.
5. token 검증 + 5분 idle 단위 테스트.
6. `lifecycle/createServer.ts` 의 placeholder 를 실제 handler 로 교체.

UI 주요 동작:

- **Google 슬롯**: `gemini` / `antigravity` 라디오 토글 — 상호 배타. 저장 시 활성 엔진 `ratio.enabled = true`, 비활성 엔진 `ratio.enabled = false`. `configManager.normalizeMutualExclusion` 이 양쪽 모두 enabled 인 레거시 파일을 antigravity 우선으로 자동 보정.
- **antigravity 활성 시**: `/provider-status` 응답의 `agyModels` 배열로 per-tier 드롭다운 (high / mid / low) 동적 바인딩 → `config.model_map.antigravity` 저장.
- **config 키**: `ratio`, `keywords`, `option_flags`, `preamble`, `recency_factor` 모두 `antigravity` 필드 포함 (3-key 구조).

## Phase 6 — Skills

1. `skills/setup/SKILL.md`.
2. `skills/codex/SKILL.md`.
3. `skills/gemini/SKILL.md`.
4. `skills/antigravity/SKILL.md`.

## Phase 7 — Hooks (filid 패턴)

1. `src/hooks/shared/`: `paths.ts`, `safeReadJson.ts`, `nowIso.ts` (node 빌트인만).
2. `src/hooks/injectStatic/`: `injectStatic.ts`, `injectStatic.entry.ts`, `utils/{loadConfig, tonePhrase, joinKeywords}.ts`.
3. `src/hooks/injectDynamic/`: `injectDynamic.ts`, `injectDynamic.entry.ts`, `utils/{loadCounter, formatRatio}.ts`.
4. `scripts/buildHooks.mjs` (filid 복제 + cogair `hookEntries`).
5. `hooks/INTENT.md`, `hooks/hooks.json`.
6. `yarn cogair build` 가 `bridge/injectStatic.mjs`, `bridge/injectDynamic.mjs` 생성 + 가드 통과.
7. `node bridge/injectStatic.mjs` 수동 실행 검증.
8. Claude Code 플러그인 재로딩 후 SessionStart + UserPromptSubmit 주입 확인.

## Phase 8 — Polish + release

1. `README.md`, `README-ko_kr.md`.
2. `CLAUDE.md` (filid CLAUDE.md 패턴 — 1-layer 구조 명세).
3. 루트 `CLAUDE.md` 의 패키지 목록에 cogair 추가.
4. Changeset, version `0.1.0` 릴리즈 후보.

## 의도적 v1 비범위

- `options` 화이트리스트 채우기 (v1 은 모두 ignored).
- `--search`, `--input-file`, `--image` 부가 인자.
- 다중 인스턴스 동시성 (lockfile).
- Hook 에서 활성 세션 목록 주입.
- 자동 provider 폴백.
- 외부 LLM 의 Claude 재귀 차단.
- TTL 만료 시 외부 CLI 세션 파일 정리.
- 텔레메트리 / 사용 통계.
- 다른 cwd 의 세션 자동 fallback 검색.
