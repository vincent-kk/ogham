# @ogham/cogair — Development Plan

Claude Code 플러그인. Gemini CLI / Codex CLI 를 Claude 가 자율 위임으로 호출하도록 하는 MCP·Skill·Hook 패키지.

설계 원본: [vincent-kk/ogham#48](https://github.com/vincent-kk/ogham/issues/48)
상세 스펙: [`../../.metadata/cogair/`](../../.metadata/cogair/)

## 스펙 인덱스

| 문서                                                             | 내용                                                           |
| ---------------------------------------------------------------- | -------------------------------------------------------------- |
| [README](../../.metadata/cogair/README.md)                       | 스펙 인덱스 + 핵심 결정                                        |
| [spec](../../.metadata/cogair/spec.md)                           | 책임 분리, 데이터 흐름, 비채택 사항                            |
| [architecture](../../.metadata/cogair/architecture.md)           | 모듈 트리 + 의존 방향 + 빌드 파이프라인                        |
| [mcp-tools](../../.metadata/cogair/mcp-tools.md)                 | `start_conversation`, `continue_conversation`, `open_settings` |
| [storage](../../.metadata/cogair/storage.md)                     | `~/.claude/plugins/cogair/` 디스크 레이아웃                    |
| [hooks](../../.metadata/cogair/hooks.md)                         | SessionStart / UserPromptSubmit 훅 (filid 패턴)                |
| [skills](../../.metadata/cogair/skills.md)                       | `setup`, `codex`, `gemini` 스킬                                |
| [web-ui](../../.metadata/cogair/web-ui.md)                       | 로컬 설정 웹 UI                                                |
| [provider-dispatch](../../.metadata/cogair/provider-dispatch.md) | codex-cli / gemini-cli 호출 매핑                               |
| [roadmap](../../.metadata/cogair/roadmap.md)                     | 단계별 구현 순서 (출처)                                        |

## Phase 0 — Skeleton

- [x] `packages/cogair/` 디렉토리 생성
- [x] `package.json` — `@ogham/cogair` v0.1.0, deps, scripts
- [x] `tsconfig.json`, `tsconfig.build.json` (filid 패턴)
- [x] `vitest.config.ts`
- [x] `.gitignore`, `.prettierrc`, `.prettierignore`
- [x] `.claude-plugin/plugin.json` (`name: cogair`)
- [x] `.mcp.json` (server `tools`)
- [x] `libs/run.cjs` (filid 복사)
- [x] `src/version.ts` placeholder
- [x] `src/index.ts` 빈 barrel
- [x] `src/INTENT.md`, 루트 `INTENT.md`
- [x] `yarn cogair version:sync` 통과
- [x] `yarn cogair typecheck` 통과

## Phase 1 — Types + constants + lib utilities

상세: [architecture.md §src/types, §src/constants, §src/lib, §src/utils](../../.metadata/cogair/architecture.md)

- [x] `src/types/conversation.ts` — `ConversationResponse`, `ConversationOptions`, `Provider`, `ModelAlias`, `ErrorCode`
- [x] `src/types/config.ts` — `Config` + Zod 스키마
- [x] `src/types/session.ts` — `SessionMeta`, `ProjectMeta`
- [x] `src/types/counter.ts` — `Counter`
- [x] `src/types/settingsServer.ts` — `SettingsServer`, `SettingsServerHandle`
- [x] `src/types/index.ts` barrel
- [x] `src/constants/paths.ts` — `COGAIR_HOME`, 하위 경로 헬퍼
- [x] `src/constants/defaults.ts` — `Config` 기본값
- [x] `src/constants/errorCodes.ts`
- [x] `src/lib/atomicWrite.ts`
- [x] `src/lib/logger.ts`
- [x] `src/utils/parentPid.ts`
- [x] `src/utils/isoNow.ts`
- [x] 각 모듈 단위 테스트 (10 files / 40 tests)
- [x] `yarn cogair test:run`, `yarn cogair typecheck` 통과

## Phase 2 — Core storage

상세: [storage.md](../../.metadata/cogair/storage.md), [architecture.md §src/core](../../.metadata/cogair/architecture.md)

- [ ] `src/core/configManager/` — `loadConfig`, `saveConfig`
- [ ] `src/core/counterManager/` — `loadCounter`, `incrementCounter`, `getCounter` (parent-pid 리셋)
- [ ] `src/core/projectHash/` — `getProjectHash(cwd)`
- [ ] `src/core/sessionStore/` — `createSession`, `getSession` (project_hash 일치 검사), `updateSession`, `pruneExpired`
- [ ] `src/core/authToken/` — `generateToken`, `verifyToken`
- [ ] `src/core/index.ts` barrel
- [ ] 단위 테스트 (tmp dir 격리)
- [ ] `yarn cogair test:run`, `yarn cogair typecheck` 통과

## Phase 3 — Dispatcher

상세: [provider-dispatch.md](../../.metadata/cogair/provider-dispatch.md)

- [ ] `src/dispatcher/envelope.ts` — `buildResponse`
- [ ] `src/dispatcher/errorMap.ts`
- [ ] `src/dispatcher/codex/spawn.ts`, `jsonlParser.ts`, `modelAlias.ts`, `index.ts` (`supportedOptions = new Set()`)
- [ ] `src/dispatcher/gemini/spawn.ts`, `sessionResolver.ts`, `modelAlias.ts`, `index.ts`
- [ ] `src/dispatcher/index.ts` barrel
- [ ] 통합 테스트: 가짜 PATH 의 mock CLI 스크립트로 시나리오 커버 (success / auth-fail / rate-limit / network-fail / cli-missing / ignored-options)

## Phase 4 — MCP server + 3 tools

상세: [mcp-tools.md](../../.metadata/cogair/mcp-tools.md), [architecture.md §src/mcp](../../.metadata/cogair/architecture.md)

- [ ] `src/mcp/shared/toolResponse.ts`
- [ ] `src/mcp/tools/startConversation/handler.ts`
- [ ] `src/mcp/tools/continueConversation/handler.ts` (project_hash 검증 → error.code='unknown')
- [ ] `src/mcp/server/server.ts` — 3 tool 등록
- [ ] `src/mcp/serverEntry/serverEntry.ts`
- [ ] `scripts/buildMcpServer.mjs` (filid 패턴)
- [ ] `yarn cogair build:plugin` → `bridge/mcp-server.cjs` 산출
- [ ] Claude Code 등록 후 수동 호출 검증

## Phase 5 — Settings web UI (`open_settings`)

상세: [web-ui.md](../../.metadata/cogair/web-ui.md)

- [ ] `src/mcp/pages/settings/index.html`, `styles/styles.css`, `scripts/app.js`
- [ ] `scripts/buildSettingsHtml.mjs`
- [ ] `src/mcp/tools/openSettings/webServer/` (handlers, utils, routes, routeContext, webServer)
- [ ] `src/mcp/tools/openSettings/handler.ts`
- [ ] token 검증 + 5분 idle 단위 테스트
- [ ] `server.ts` placeholder → 실제 handler 교체

## Phase 6 — Skills

상세: [skills.md](../../.metadata/cogair/skills.md)

- [ ] `skills/setup/SKILL.md`
- [ ] `skills/codex/SKILL.md`
- [ ] `skills/gemini/SKILL.md`

## Phase 7 — Hooks

상세: [hooks.md](../../.metadata/cogair/hooks.md)

- [ ] `src/hooks/shared/` — `paths.ts`, `safeReadJson.ts`, `nowIso.ts` (node 빌트인만)
- [ ] `src/hooks/injectStatic/` — `.ts`, `.entry.ts`, `utils/{loadConfig, tonePhrase, joinKeywords}.ts`
- [ ] `src/hooks/injectDynamic/` — `.ts`, `.entry.ts`, `utils/{loadCounter, formatRatio}.ts`
- [ ] `scripts/buildHooks.mjs` (filid 복제 + cogair `hookEntries`)
- [ ] `hooks/INTENT.md`, `hooks/hooks.json`
- [ ] `yarn cogair build` 가 `bridge/injectStatic.mjs`, `bridge/injectDynamic.mjs` 생성 + 10 KB cap + FORBIDDEN_PATTERNS 가드 통과
- [ ] Claude Code 플러그인 재로딩 후 SessionStart + UserPromptSubmit 주입 확인

## Phase 8 — Polish + release

- [ ] `README.md`, `README-ko_kr.md`
- [ ] `CLAUDE.md` (filid 패턴, 1-layer 구조 명세)
- [ ] 루트 `CLAUDE.md` 의 패키지 목록에 cogair 추가
- [ ] Changeset 생성, version `0.1.0` 릴리즈 후보

## v1 비범위 (의도적)

- `options` 화이트리스트 채우기 (v1 은 모두 ignored)
- `--search`, `--input-file`, `--image` 부가 인자
- 다중 인스턴스 동시성 (lockfile)
- Hook 에서 활성 세션 목록 주입
- 자동 provider 폴백
- 외부 LLM 의 Claude 재귀 차단
- TTL 만료 시 외부 CLI 세션 파일 정리
- 다른 cwd 의 세션 자동 fallback 검색
- 텔레메트리 / 사용 통계
