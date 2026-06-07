# CLAUDE.md — @ogham/atlassian

`@ogham/atlassian` 패키지 작업 가이드. 패키지 contract 는 [INTENT.md](./INTENT.md), src 내부 구조는 [src/INTENT.md](./src/INTENT.md) 참조.

## Commands

```bash
yarn build              # clean → version:sync → settings-html → tsc → mcp-server
yarn build:plugin       # mcp-server 번들만
yarn typecheck          # 타입 체크 (emit 없음)
yarn test:run           # 단일 실행 (CI)
yarn test               # watch
yarn format && yarn lint
yarn version:sync       # package.json → src/version.ts
```

## Architecture (Dispatch Direction)

```
Dispatcher (Claude Code main agent)
    ├── Agent: jira / confluence / media
    ├── Skill: setup / jira / confluence / download / media-analysis
    └── MCP "tools" server
            └── fetch / convert / auth-check / setup
```

의존성 방향은 단방향: **Dispatcher → Agent → Skill → MCP → Atlassian REST API**. 하위 레이어는 상위 레이어를 인지하지 않는다.

## Build System

- `scripts/build-mcp-server.mjs`: MCP 서버 → `bridge/mcp-server.cjs`
- `scripts/build-settings-html.mjs`: settings page HTML 번들 (esbuild + 정적 HTML)

## Development Notes

- **테스트**: `src/**/__tests__/**/*.test.ts`
- **SSRF guard**: `src/core/httpClient/ssrfGuard.ts` — 모든 outbound 요청 통과 필수
- **Credentials**: `~/.claude/plugins/atlassian/credentials.json` 평문 JSON; stdout / log 출력 금지
- **Converter**: `src/converter/` — Python `mcp-atlassian` 에서 포팅. ADF ↔ Markdown / Storage ↔ Markdown
- **버전**: `src/version.ts` 직접 수정 금지 — `yarn version:sync` 사용
