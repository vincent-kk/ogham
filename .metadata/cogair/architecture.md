# Architecture — Module Tree & Dependencies

`packages/filid/` 의 패키지 레이아웃과 빌드 파이프라인을 그대로 따른다. atlassian 의 `setup/web-server` 구조는 `openSettings` 도구 한 곳에서만 차용한다.

디렉토리와 TypeScript 파일 이름은 **camelCase** 로 통일한다 (filid fca-policy 의 기본값). 단, organ 컨벤션(`__tests__`, `__generated__`, `.claude-plugin` 등)과 디스크 JSON 키(`session_ttl_hours`, `multi_agent` 등 외부 인터페이스)는 영향받지 않는다.

## 패키지 루트 레이아웃

```
packages/cogair/
├── .claude-plugin/
│   └── plugin.json              # { name: "cogair", skills, mcpServers }
├── .mcp.json                    # { mcpServers: { tools: { command: node, args: bridge/mcp-server.cjs } } }
├── hooks/
│   ├── INTENT.md                # 설정 전용 노드 — 구현 코드 배치 금지
│   └── hooks.json               # 2개 lifecycle 이벤트 매핑
├── libs/
│   └── run.cjs                  # cross-platform Node runner (filid 와 동일 파일)
├── skills/
│   ├── setup/SKILL.md
│   ├── codex/SKILL.md
│   ├── gemini/SKILL.md
│   └── crosscheck/SKILL.md
├── scripts/
│   ├── buildMcpServer.mjs       # esbuild → bridge/mcp-server.cjs (CJS)
│   ├── buildHooks.mjs           # esbuild → bridge/<name>.mjs (ESM, thin-script 가드)
│   └── buildSettingsHtml.mjs    # FE → src/mcp/tools/openSettings/__generated__/settingsHtml.ts
├── bridge/                      # build artifact (committed — package.json:files)
├── src/                         # fractal root
├── package.json
├── tsconfig.json / tsconfig.build.json
├── vitest.config.ts
├── README.md / README-ko_kr.md
└── CLAUDE.md (Phase 8)
```

`package.json` 의 `files`:

```
["dist", "bridge", "hooks", "libs", "skills", ".claude-plugin", ".mcp.json", "README.md"]
```

`scripts/` 파일은 camelCase + `.mjs` 확장자. filid 의 kebab-case 스크립트 이름과 다르지만 cogair 컨벤션 우선.

## src/ 트리

```
src/
├── INTENT.md
├── index.ts                     # public API barrel
├── version.ts                   # scripts/inject-version.mjs 가 갱신, 수정 금지
├── types/                       # fractal — Zod 스키마 + 타입
│   ├── INTENT.md
│   ├── index.ts
│   ├── conversation.ts          # ConversationResponse, ConversationOptions, Provider, ModelAlias, ErrorCode
│   ├── config.ts
│   ├── session.ts
│   ├── counter.ts
│   └── settingsServer.ts
├── constants/                   # organ
│   ├── paths.ts
│   ├── defaults.ts
│   └── errorCodes.ts
├── core/                        # fractal
│   ├── INTENT.md
│   ├── index.ts
│   ├── configManager/
│   ├── counterManager/
│   ├── sessionStore/
│   ├── projectHash/
│   └── authToken/
├── dispatcher/                  # fractal
│   ├── INTENT.md
│   ├── index.ts
│   ├── codex/
│   │   ├── INTENT.md
│   │   ├── index.ts
│   │   ├── spawn.ts
│   │   ├── jsonlParser.ts
│   │   └── modelAlias.ts
│   ├── gemini/
│   │   ├── INTENT.md
│   │   ├── index.ts
│   │   ├── spawn.ts
│   │   ├── sessionResolver.ts
│   │   └── modelAlias.ts
│   ├── envelope.ts
│   └── errorMap.ts
├── mcp/                         # fractal — MCP server + 3 tools
│   ├── INTENT.md
│   ├── index.ts
│   ├── server/
│   │   ├── INTENT.md
│   │   ├── index.ts
│   │   └── lifecycle/
│   │       ├── createServer.ts
│   │       └── startServer.ts
│   ├── serverEntry/
│   │   └── serverEntry.ts       # esbuild 진입점 → bridge/mcp-server.cjs
│   ├── shared/
│   │   ├── toolResponse.ts      # toolResult, toolError, wrapHandler, mapReplacer
│   │   └── index.ts
│   ├── tools/
│   │   ├── startConversation/
│   │   │   ├── INTENT.md
│   │   │   ├── index.ts
│   │   │   └── handler.ts
│   │   ├── continueConversation/
│   │   │   ├── INTENT.md
│   │   │   ├── index.ts
│   │   │   └── handler.ts
│   │   └── openSettings/
│   │       ├── INTENT.md
│   │       ├── index.ts
│   │       ├── handler.ts
│   │       ├── __generated__/
│   │       │   └── settingsHtml.ts
│   │       ├── webServer/
│   │       │   ├── INTENT.md
│   │       │   ├── index.ts
│   │       │   ├── webServer.ts
│   │       │   ├── routes.ts
│   │       │   ├── routeContext.ts
│   │       │   ├── handlers/
│   │       │   │   ├── handleGetRoot.ts
│   │       │   │   ├── handleGetConfig.ts
│   │       │   │   ├── handleSave.ts
│   │       │   │   └── handleClose.ts
│   │       │   └── utils/
│   │       │       ├── sendJson.ts
│   │       │       ├── parseBody.ts
│   │       │       ├── escapeJsonForHtml.ts
│   │       │       ├── verifyToken.ts
│   │       │       └── buildState.ts
│   │       └── utils/
│   │           └── openBrowser.ts
│   └── pages/
│       └── settings/            # FE 소스 (index.html, styles/, scripts/)
├── hooks/                       # fractal — hook 구현체 (esbuild 입력)
│   ├── INTENT.md
│   ├── index.ts
│   ├── injectStatic/
│   │   ├── INTENT.md
│   │   ├── injectStatic.ts
│   │   ├── build/
│   │   │   └── injectStatic.entry.ts
│   │   └── utils/
│   │       ├── loadConfig.ts
│   │       ├── tonePhrase.ts
│   │       └── joinKeywords.ts
│   ├── injectDynamic/
│   │   ├── INTENT.md
│   │   ├── injectDynamic.ts
│   │   ├── build/
│   │   │   └── injectDynamic.entry.ts
│   │   └── utils/
│   │       ├── loadCounter.ts
│   │       └── formatRatio.ts
│   └── shared/
│       ├── paths.ts
│       ├── safeReadJson.ts
│       └── nowIso.ts
├── lib/                         # organ
│   ├── logger.ts
│   └── atomicWrite.ts
└── utils/                       # organ
    ├── parentPid.ts
    └── isoNow.ts
```

## 의존 방향 (DAG)

```
mcp/server  →  mcp/tools/*  →  dispatcher/*  →  core/*  →  lib, utils, constants
mcp/serverEntry  →  mcp/server
hooks/inject*    →  hooks/shared (only)        ← core/ import 금지
```

- `src/hooks/*` 는 `src/core/*` 또는 `src/types/*` 를 import 하지 않는다. 빌드 가드(`FORBIDDEN_PATTERNS`, byte cap) 위반.
- 디스크 I/O 는 `src/hooks/shared/` 안에 `node:fs` 만 사용해 직접 구현.
- `dispatcher/` 는 `core/sessionStore`, `core/counterManager` 를 단방향 import.

## 빌드 파이프라인 (filid 동일 패턴)

`package.json` scripts:

```json
{
  "build": "yarn clean && yarn version:sync && node scripts/buildSettingsHtml.mjs && tsc -p tsconfig.build.json && node scripts/buildMcpServer.mjs && node scripts/buildHooks.mjs",
  "build:plugin": "node scripts/buildMcpServer.mjs && node scripts/buildHooks.mjs",
  "clean": "rm -rf bridge",
  "version:sync": "node ../../scripts/inject-version.mjs"
}
```

| 단계 | 명령                                 | 산출물                                                     |
| ---- | ------------------------------------ | ---------------------------------------------------------- |
| 1    | `yarn version:sync`                  | `src/version.ts`                                           |
| 2    | `node scripts/buildSettingsHtml.mjs` | `src/mcp/tools/openSettings/__generated__/settingsHtml.ts` |
| 3    | `tsc -p tsconfig.build.json`         | `dist/`                                                    |
| 4    | `node scripts/buildMcpServer.mjs`    | `bridge/mcp-server.cjs` (esbuild CJS 번들)                 |
| 5    | `node scripts/buildHooks.mjs`        | `bridge/injectStatic.mjs`, `bridge/injectDynamic.mjs`      |

`bridge/mcp-server.cjs` 파일명은 filid · atlassian 의 컨벤션을 유지 (외부 `.mcp.json` 에 박혀 있어 변경 비용이 크고, 빌드 산출물 명명은 별도 컨벤션).

### `scripts/buildHooks.mjs` — filid 가드 복제

filid 의 `build-hooks.mjs` 와 동일한 규칙:

- 각 hook 을 `esbuild.build` 로 `format: 'esm'`, `target: 'node20'`, `bundle: true`, `minify: true` 출력.
- 두 hook 모두 LIGHT cap (`10 * 1024` bytes).
- `FORBIDDEN_PATTERNS` 검사: `zod`, `@ast-grep/napi`, `@modelcontextprotocol/sdk`, `lodash`, `moment`, glob 패밀리 등을 번들에 포함하면 빌드 실패.

`hookEntries` 목록:

```javascript
const hookEntries = [
  { name: "injectStatic", maxBytes: LIGHT_HOOK_BYTES },
  { name: "injectDynamic", maxBytes: LIGHT_HOOK_BYTES },
];
```

### `scripts/buildMcpServer.mjs`

filid 의 동일 스크립트 단순화 버전 (cogair 는 `@ast-grep/napi` 사용 안 함):

- `entryPoints: src/mcp/serverEntry/serverEntry.ts`
- `format: 'cjs'`, `target: 'node20'`, `platform: 'node'`, `bundle: true`, `minify: true`.
- `external: []`. zod 는 node_modules 그대로 번들.
- 글로벌 모듈 탐색 banner 불필요.

### `scripts/buildSettingsHtml.mjs`

atlassian `build-setup-html.mjs` 패턴:

- `src/mcp/pages/settings/index.html` + `styles/styles.css` + `scripts/app.js` 를 esbuild `transform` 으로 minify + inline.
- 결과 HTML 을 `__generated__/settingsHtml.ts` 의 `export const SETTINGS_HTML = "..."` 로 직렬화.

## tsconfig

filid 의 `tsconfig.json`, `tsconfig.build.json` 형태 동일. ESM `.js` 확장자 import 강제.

## 외부 의존성

- runtime: `@modelcontextprotocol/sdk` ~1.22.0, `zod` ^3.23.
- dev: `esbuild`, `typescript`, `vitest`, `@vitest/coverage-v8`, `@types/node`.
- 추가 런타임 의존 없음. CLI 호출은 `node:child_process.spawn` 직접 사용.

## 메인 진입점 export

filid 와 동일 dist 기반:

```json
{
  "exports": {
    ".": { "types": "./dist/index.d.ts", "import": "./dist/index.js" }
  },
  "main": "dist/index.js",
  "types": "dist/index.d.ts"
}
```
