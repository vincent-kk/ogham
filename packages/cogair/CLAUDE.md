# CLAUDE.md — @ogham/cogair

`@ogham/cogair` 패키지 작업 가이드. 패키지 contract 는 [INTENT.md](./INTENT.md), src 내부 구조는 [src/INTENT.md](./src/INTENT.md) 참조.

## Commands

```bash
yarn build              # clean → version:sync → settingsHtml → tsc → mcpServer → hooks
yarn build:plugin       # MCP + hook 번들만 (tsc / version:sync 생략)
yarn typecheck          # 타입 체크 (emit 없음)
yarn test               # vitest watch
yarn test:run           # 단일 실행 (CI)
yarn test:coverage      # 커버리지
yarn test:e2e:run       # E2E (in-process + 번들 stdio)
yarn test:e2e:real      # COGAIR_E2E_REAL_CLI=1 real CLI 호출
yarn format && yarn lint
yarn version:sync       # package.json → src/version.ts
```

## Architecture (Layered Flow)

```
Skills (/setup, /codex, /gemini, /crosscheck)    Layer 3 (user) — thin tool-call mappers
        │
        ▼
MCP "tools" server                                Layer 2 (logic) — 3 MCP 도구
        │
        ▼
Dispatcher (codex / gemini)                       외부 CLI spawn, JSONL 파싱, envelope 빌드
        │
        ▼
Core storage                                      ~/.claude/plugins/cogair/{config, counter, sessions}
        │
        ▲
Hooks (SessionStart, UserPromptSubmit)            Layer 1 (auto) — read-only context injection
```

의존성 방향은 단방향. 훅은 thin script (Node builtins 만) 이며 `src/core/` / `src/types/` 를 import 하지 않음 — zod 또는 MCP SDK 가 들어오면 10 KB LIGHT cap 초과.

## Plugin Runtime

- 스킬 이름에 플러그인 prefix 없음 (`setup`, `codex`, `gemini`, `crosscheck`) — 디렉토리 이름 = 스킬 이름
- MCP 서버 이름은 `tools` — 스킬에서 `mcp_tools_<name>` 으로 참조
- **훅 번들 cap**: 10 KB LIGHT (enforced by `scripts/buildHooks.mjs`). injectStatic / injectDynamic 모두 ~3.3 KB minified
- **훅 번들 금지 import**: `zod`, `@modelcontextprotocol/sdk`, `fast-glob`, `lodash`, `moment`, `date-fns` — `FORBIDDEN_PATTERNS` in `scripts/buildHooks.mjs` 가 강제

## Development Notes

- **버전**: `yarn version:sync` 만 사용. `src/version.ts` / `.claude-plugin/plugin.json` 은 `package.json` 미러
- **테스트**: `src/**/__tests__/**/*.test.ts`. `~/.claude/plugins/cogair/` 를 건드리는 테스트는 `vitest.setup.ts` 의 temp dir 사용
- **Mock CLI**: dispatcher 통합 테스트는 fake `PATH` 의 scripted CLI 로 success / auth-fail / rate-limit / network-fail / cli-missing / ignored-options 커버
- **Sessions**: project-hash 스코프 (`sha256(cwd).slice(0, 12)`). `continue_conversation` 은 다른 cwd 세션이면 `error.code: 'unknown'` 반환 (자동 cross-project fallback 없음)
- **Gemini sandbox**: `GEMINI_CLI_TRUST_WORKSPACE=true` 가 gemini spawn 에 항상 주입됨 (non-interactive agent mode). `/setup` 으로 토글 불가
- **Model IDs**: 하드코딩 model 문자열은 **오직** `src/dispatcher/<provider>/modelAlias.ts` 에만. 다른 파일은 tier (`high` / `mid` / `low` / `auto`) 만 사용

## References

`../../.metadata/cogair/`:

- [spec.md](../../.metadata/cogair/spec.md)
- [architecture.md](../../.metadata/cogair/architecture.md)
- [mcp-tools.md](../../.metadata/cogair/mcp-tools.md)
- [skills.md](../../.metadata/cogair/skills.md)
- [hooks.md](../../.metadata/cogair/hooks.md)
- [storage.md](../../.metadata/cogair/storage.md)
- [web-ui.md](../../.metadata/cogair/web-ui.md)
- [provider-dispatch.md](../../.metadata/cogair/provider-dispatch.md)
- [roadmap.md](../../.metadata/cogair/roadmap.md)
