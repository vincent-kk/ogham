# Roadmap — Implementation Order

filid 빌드 파이프라인을 기준으로 한다. 각 단계는 독립 PR 가능 단위. 단계 종료 시 `yarn cogair build` 가 통과해야 한다.

## Phase 0 — Skeleton

1. `packages/cogair/` 디렉토리 생성 (루트 yarn workspaces 가 자동 인식).
2. `package.json`: name `@ogham/cogair`, version `0.1.0`, type `module`, `exports`/`main`/`types` 는 dist 기반 (filid 동일 형식).
   - `files`: `["dist", "bridge", "hooks", "libs", "skills", ".claude-plugin", ".mcp.json", "README.md"]`.
   - scripts: `build`, `build:plugin`, `clean`, `dev`, `format`, `test`, `test:run`, `test:coverage`, `typecheck`, `version:*`.
   - deps: `@modelcontextprotocol/sdk` ~1.22, `zod` ^3.23. devDeps: `esbuild`, `typescript`, `vitest`, `@vitest/coverage-v8`, `@types/node`.
3. `tsconfig.json`, `tsconfig.build.json`, `vitest.config.ts`, `.prettierrc`, `.prettierignore`, `.gitignore` 를 filid 에서 복사 후 경로만 조정.
4. `.claude-plugin/plugin.json` 작성: `{ name: "cogair", skills: "./skills/", mcpServers: "./.mcp.json" }`.
5. `.mcp.json` 작성: `{ mcpServers: { tools: { command: "node", args: ["${CLAUDE_PLUGIN_ROOT}/bridge/mcp-server.cjs"] } } }`.
6. `libs/run.cjs` 를 filid 에서 복사 (변경 금지).
7. `src/version.ts` 자동 생성 가능 상태로 설정.
8. `src/index.ts` 빈 barrel.
9. 루트 `yarn build:all` 이 cogair 까지 안전하게 통과하는지 확인 (빈 dist + bridge 미존재 허용).

## Phase 1 — Types + constants + lib utilities

1. `src/types/`: `conversation.ts`, `config.ts`, `session.ts`, `counter.ts`, `settings-server.ts`, `index.ts` (모두 Zod 스키마 포함).
2. `src/constants/`: `paths.ts` (`COGAIR_HOME`, 하위 경로 헬퍼), `defaults.ts`, `error-codes.ts`.
3. `src/lib/atomic-write.ts`, `src/lib/logger.ts`.
4. `src/utils/parent-pid.ts`, `src/utils/iso-now.ts`.
5. 각 모듈 단위 테스트 (`__tests__/`). Vitest 통과.

## Phase 2 — Core storage

1. `src/core/config-manager/`: `loadConfig`, `saveConfig` (atomic write + defaults 병합 + Zod 검증).
2. `src/core/counter-manager/`: `loadCounter`, `incrementCounter` (parent-pid 리셋), `getCounter`.
3. `src/core/project-hash/`: `getProjectHash(cwd)`.
4. `src/core/session-store/`: `createSession`, `getSession`, `updateSession`, `pruneExpired`.
5. `src/core/auth-token/`: `generateToken`, `verifyToken` (one-time token).
6. `src/core/index.ts` barrel.
7. 단위 테스트. tmp dir 으로 디스크 격리.

## Phase 3 — Dispatcher

1. `src/dispatcher/envelope.ts`, `src/dispatcher/error-map.ts`.
2. `src/dispatcher/codex/`: spawn, jsonl-parser, model-alias. `start`, `resume`.
3. `src/dispatcher/gemini/`: spawn, session-resolver, model-alias. `start`, `resume`.
4. `src/dispatcher/index.ts` barrel — `{ codex, gemini }` Dispatcher 노출.
5. 통합 테스트: 가짜 PATH 의 mock CLI 스크립트로 시나리오 커버 (success / auth-fail / rate-limit / network-fail / cli-missing).

## Phase 4 — MCP server + 3 tools

1. `src/mcp/shared/tool-response.ts` (atlassian 동일).
2. `src/mcp/tools/start-conversation/handler.ts`.
3. `src/mcp/tools/continue-conversation/handler.ts`.
4. `src/mcp/server/server.ts`: 3 tool 등록.
5. `src/mcp/server-entry/server-entry.ts`.
6. `scripts/build-mcp-server.mjs` (filid 동일 패턴, native-deps 처리 단순화).
7. `yarn cogair build:plugin` 으로 `bridge/mcp-server.cjs` 생성 확인.
8. Claude Code 에 등록 후 수동 호출 검증.

## Phase 5 — Settings web UI (`open_settings`)

1. `src/mcp/pages/settings/` FE 작성 (index.html, app.js, styles.css).
2. `scripts/build-settings-html.mjs` 작성 (atlassian `build-setup-html.mjs` 패턴).
3. `src/mcp/tools/open-settings/web-server/` 작성 (atlassian setup web-server 차용, 도메인 필드만 cogair Config 로 교체).
4. `src/mcp/tools/open-settings/handler.ts`: 기존 서버 reuse 또는 신규 기동.
5. token 검증 + 5분 idle 동작 단위 테스트.
6. `server.ts` 의 placeholder 를 실제 handler 로 교체.

## Phase 6 — Skills

1. `skills/setup/SKILL.md`.
2. `skills/codex/SKILL.md`.
3. `skills/gemini/SKILL.md`.
4. `plugin.json` 의 `skills` 경로 확인.

## Phase 7 — Hooks (filid 패턴)

1. `src/hooks/shared/` 작성: `paths.ts`, `safe-read-json.ts`, `now-iso.ts`. `node:*` 빌트인만 사용.
2. `src/hooks/inject-static/`: `inject-static.ts`, `inject-static.entry.ts`, `utils/{load-config, tone-phrase, join-keywords}.ts`.
3. `src/hooks/inject-dynamic/`: `inject-dynamic.ts`, `inject-dynamic.entry.ts`, `utils/{load-counter, format-ratio}.ts`.
4. `scripts/build-hooks.mjs` (filid `build-hooks.mjs` 복제 + `hookEntries` 교체 + cogair 용 LIGHT cap 10 KB).
5. `hooks/INTENT.md`, `hooks/hooks.json` 작성.
6. `yarn cogair build` 가 `bridge/inject-static.mjs`, `bridge/inject-dynamic.mjs` 를 만들고 가드를 통과하는지 확인.
7. `node bridge/inject-static.mjs` 수동 실행으로 페이로드 출력 검증.
8. Claude Code 에 플러그인 재로딩 후 SessionStart + UserPromptSubmit 주입 확인.

## Phase 8 — Polish + release

1. `README.md`, `README-ko_kr.md` 작성.
2. `CLAUDE.md` 작성 (filid CLAUDE.md 패턴 — 4-layer 가 아닌 1-layer 구조 명세).
3. 루트 `CLAUDE.md` 의 패키지 목록에 cogair 추가.
4. Changeset 생성 (`yarn changeset`), version `0.1.0` 릴리즈 후보.

## 의도적 v1 비범위

- `--search`, `--input-file`, `--image` 등 codex-call/gemini-call 의 부가 인자.
- 다중 인스턴스 동시성 (lockfile).
- Hook 에서 활성 세션 목록 주입.
- 자동 provider 폴백.
- 외부 LLM 의 Claude 재귀 차단.
- 텔레메트리 / 사용 통계.
- 라이브러리 export 소비자 (현재 `dist/` 는 모노레포 일관성용만).
