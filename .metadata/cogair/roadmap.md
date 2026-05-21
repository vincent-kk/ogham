# Roadmap — Implementation Order

filid 빌드 파이프라인을 기준으로 한다. 각 단계는 독립 PR 가능 단위. 단계 종료 시 `yarn cogair build` 가 통과해야 한다.

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
4. `src/core/sessionStore/`: `createSession`, `getSession` (project_hash 일치 검사 포함), `updateSession`, `pruneExpired` (cogair 매핑 + gemini-cwd 만 삭제).
5. `src/core/authToken/`: `generateToken`, `verifyToken`.
6. `src/core/index.ts` barrel.
7. 단위 테스트. tmp dir 으로 디스크 격리.

## Phase 3 — Dispatcher

1. `src/dispatcher/envelope.ts`, `src/dispatcher/errorMap.ts`.
2. `src/dispatcher/codex/`: `spawn.ts`, `jsonlParser.ts`, `modelAlias.ts`, `index.ts` (`supportedOptions = new Set()`).
3. `src/dispatcher/gemini/`: `spawn.ts`, `sessionResolver.ts`, `modelAlias.ts`, `index.ts` (`supportedOptions = new Set()`).
4. `src/dispatcher/index.ts` barrel.
5. 통합 테스트: 가짜 PATH 의 mock CLI 스크립트로 시나리오 커버 (success / auth-fail / rate-limit / network-fail / cli-missing / ignored-options).

## Phase 4 — MCP server + 3 tools

1. `src/mcp/shared/toolResponse.ts`.
2. `src/mcp/tools/startConversation/handler.ts`.
3. `src/mcp/tools/continueConversation/handler.ts` (project_hash 검증 → error.code='unknown').
4. `src/mcp/server/server.ts`: 3 tool 등록.
5. `src/mcp/serverEntry/serverEntry.ts`.
6. `scripts/buildMcpServer.mjs` (filid 동일 패턴, native-deps 단순화).
7. `yarn cogair build:plugin` 으로 `bridge/mcp-server.cjs` 생성 확인.
8. Claude Code 등록 후 수동 호출 검증.

## Phase 5 — Settings web UI (`open_settings`)

1. `src/mcp/pages/settings/` FE 작성.
2. `scripts/buildSettingsHtml.mjs` 작성.
3. `src/mcp/tools/openSettings/webServer/` 작성.
4. `src/mcp/tools/openSettings/handler.ts`: 기존 서버 reuse 또는 신규 기동.
5. token 검증 + 5분 idle 단위 테스트.
6. `server.ts` 의 placeholder 를 실제 handler 로 교체.

## Phase 6 — Skills

1. `skills/setup/SKILL.md`.
2. `skills/codex/SKILL.md`.
3. `skills/gemini/SKILL.md`.

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
