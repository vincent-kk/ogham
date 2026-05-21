# Architecture — Module Tree & Dependencies

`packages/filid/` 의 패키지 레이아웃과 빌드 파이프라인을 그대로 따른다. atlassian 의 `setup/web-server` 구조는 `open_settings` 도구 한 곳에서만 차용한다.

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
│   └── gemini/SKILL.md
├── scripts/
│   ├── build-mcp-server.mjs     # esbuild → bridge/mcp-server.cjs (CJS)
│   ├── build-hooks.mjs          # esbuild → bridge/<name>.mjs (ESM, thin-script 가드)
│   └── build-settings-html.mjs  # FE → src/mcp/tools/open-settings/__generated__/settings-html.ts
├── bridge/                      # build artifact (gitignored)
├── src/                         # fractal root
├── package.json
├── tsconfig.json / tsconfig.build.json
├── vitest.config.ts
├── README.md / README-ko_kr.md
└── CLAUDE.md (Phase 8 에서 추가)
```

`package.json` 의 `files`:

```
["dist", "bridge", "hooks", "libs", "skills", ".claude-plugin", ".mcp.json", "README.md"]
```

(`agents` 미포함 — 본 플러그인은 agent 없음. `templates`/`libs` 등 도메인 무관 자산은 필요해질 때 추가.)

## src/ 트리

```
src/
├── INTENT.md
├── index.ts                     # public API barrel (라이브러리 소비자는 없지만 dist export 일관성 유지)
├── version.ts                   # scripts/inject-version.mjs 가 갱신, 수정 금지
├── types/                       # fractal — Zod 스키마 + 타입
│   ├── INTENT.md
│   ├── index.ts
│   ├── conversation.ts
│   ├── config.ts
│   ├── session.ts
│   ├── counter.ts
│   └── settings-server.ts
├── constants/                   # organ
│   ├── paths.ts
│   ├── defaults.ts
│   └── error-codes.ts
├── core/                        # fractal — 비즈니스 코어
│   ├── INTENT.md
│   ├── index.ts
│   ├── config-manager/
│   ├── counter-manager/
│   ├── session-store/
│   ├── project-hash/
│   └── auth-token/
├── dispatcher/                  # fractal — provider 호출 본체
│   ├── INTENT.md
│   ├── index.ts
│   ├── codex/                   # codex-cli spawn + JSONL parser + model alias
│   ├── gemini/                  # gemini-cli spawn + session resolver + model alias
│   ├── envelope.ts
│   └── error-map.ts
├── mcp/                         # fractal — MCP server + 3 tools
│   ├── INTENT.md
│   ├── index.ts
│   ├── server/
│   │   └── server.ts            # createServer, startServer
│   ├── server-entry/
│   │   └── server-entry.ts      # esbuild 진입점 → bridge/mcp-server.cjs
│   ├── shared/
│   │   ├── tool-response.ts     # toolResult, toolError, wrapHandler, mapReplacer
│   │   └── index.ts
│   ├── tools/
│   │   ├── start-conversation/
│   │   ├── continue-conversation/
│   │   └── open-settings/
│   │       ├── handler.ts
│   │       ├── __generated__/   # build-settings-html 산출물
│   │       ├── web-server/      # atlassian setup 패턴 차용
│   │       └── utils/open-browser.ts
│   └── pages/
│       └── settings/            # FE 소스 (index.html, styles/, scripts/)
├── hooks/                       # fractal — hook 구현체 (esbuild 입력)
│   ├── INTENT.md
│   ├── index.ts
│   ├── inject-static/
│   │   ├── INTENT.md
│   │   ├── inject-static.ts       # main logic
│   │   ├── inject-static.entry.ts # build-hooks.mjs 가 참조하는 진입점
│   │   └── utils/
│   ├── inject-dynamic/
│   │   ├── INTENT.md
│   │   ├── inject-dynamic.ts
│   │   ├── inject-dynamic.entry.ts
│   │   └── utils/
│   └── shared/                  # 공통 헬퍼 (config-read, counter-read, tone-phrase)
│       └── ...
├── lib/                         # organ — atomic write, logger
└── utils/                       # organ — parent-pid, iso-now
```

## 의존 방향 (DAG)

```
mcp/server  →  mcp/tools/*  →  dispatcher/*  →  core/*  →  lib, utils, constants
mcp/server-entry  →  mcp/server
hooks/inject-*    →  hooks/shared (only)        ← core/ import 금지
```

- `src/hooks/*` 는 `src/core/*` 를 import 하지 않는다. 빌드 가드(`FORBIDDEN_PATTERNS`, byte cap) 위반.
- 디스크 I/O 는 `src/hooks/shared/` 안에 `node:fs` 만 사용해 직접 구현.
- `dispatcher/` 는 `core/session-store`, `core/counter-manager` 를 단방향 import.

## 빌드 파이프라인 (filid 동일 패턴)

`package.json` scripts:

```json
{
  "build": "yarn clean && yarn version:sync && node scripts/build-settings-html.mjs && tsc -p tsconfig.build.json && node scripts/build-mcp-server.mjs && node scripts/build-hooks.mjs",
  "build:plugin": "node scripts/build-mcp-server.mjs && node scripts/build-hooks.mjs",
  "clean": "rm -rf bridge",
  "version:sync": "node ../../scripts/inject-version.mjs"
}
```

| 단계 | 명령 | 산출물 |
|---|---|---|
| 1 | `yarn version:sync` | `src/version.ts` |
| 2 | `node scripts/build-settings-html.mjs` | `src/mcp/tools/open-settings/__generated__/settings-html.ts` |
| 3 | `tsc -p tsconfig.build.json` | `dist/` (라이브러리 export — 사용처는 없지만 형식 유지) |
| 4 | `node scripts/build-mcp-server.mjs` | `bridge/mcp-server.cjs` (esbuild CJS 번들) |
| 5 | `node scripts/build-hooks.mjs` | `bridge/inject-static.mjs`, `bridge/inject-dynamic.mjs` (esbuild ESM, 각각 LIGHT cap 10 KB) |

### `scripts/build-hooks.mjs` — filid 가드 복제

filid 의 `build-hooks.mjs` 와 동일한 규칙:

- 각 hook 을 `esbuild.build` 로 `format: 'esm'`, `target: 'node20'`, `bundle: true`, `minify: true` 출력.
- 두 hook 모두 LIGHT cap (`10 * 1024` bytes).
- `FORBIDDEN_PATTERNS` 검사: `zod`, `@ast-grep/napi`, `@modelcontextprotocol/sdk`, `lodash`, `moment`, glob 패밀리 등을 번들에 포함하면 빌드 실패.
- 위반 시 `process.exit(1)`.

`hookEntries` 목록 (cogair):

```javascript
const hookEntries = [
  { name: 'inject-static',  maxBytes: LIGHT_HOOK_BYTES },
  { name: 'inject-dynamic', maxBytes: LIGHT_HOOK_BYTES },
];
```

### `scripts/build-mcp-server.mjs`

filid 의 동일 스크립트 단순화 버전 (cogair 는 `@ast-grep/napi` 사용 안 함):

- `entryPoints: src/mcp/server-entry/server-entry.ts`
- `format: 'cjs'`, `target: 'node20'`, `platform: 'node'`, `bundle: true`, `minify: true`.
- `external: []` (네이티브 의존 없음). zod 경로 alias 도 단순 — `node_modules/zod` 직접 사용.
- 글로벌 모듈 탐색 banner 불필요 (네이티브 모듈 없음).

### `scripts/build-settings-html.mjs`

atlassian `build-setup-html.mjs` 패턴:

- `src/mcp/pages/settings/index.html` + `styles/styles.css` + `scripts/app.js` 를 esbuild `transform` 으로 minify + inline.
- 결과 HTML 을 `__generated__/settings-html.ts` 의 `export const SETTINGS_HTML = "..."` 로 직렬화.

## tsconfig

filid 의 `tsconfig.json`, `tsconfig.build.json` 형태와 동일:

- `module: NodeNext`, `moduleResolution: NodeNext`, `target: ES2022`, `strict: true`.
- `tsconfig.build.json` 은 `outDir: dist`, `declaration: true`, `noEmitOnError: true`.
- ESM `.js` 확장자 import 강제.

## 외부 의존성

- runtime: `@modelcontextprotocol/sdk` ~1.22.0, `zod` ^3.23.
- dev: `esbuild`, `typescript`, `vitest`, `@vitest/coverage-v8`, `@types/node`.
- 추가 런타임 의존 없음. CLI 호출은 `node:child_process.spawn` 직접 사용.

## 메인 진입점 export

`package.json` 의 `exports`/`main`/`types` 도 filid 와 동일하게 dist 기반:

```json
{
  "exports": {
    ".": { "types": "./dist/index.d.ts", "import": "./dist/index.js" }
  },
  "main": "dist/index.js",
  "types": "dist/index.d.ts"
}
```

(실제 소비자는 없지만 모노레포 일관성 유지 + 향후 cross-package import 여지 보존.)
