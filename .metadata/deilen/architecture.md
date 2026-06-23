# Architecture — Module Tree & Dependencies

`plugins/cennad/`, `plugins/filid/` 의 패키지 레이아웃과 빌드 파이프라인을 그대로 따른다. 로컬 HTTP 서버·설정 UI 는 cennad 의 `openSettings/webServer/` 구조를 일반화해 **세션 내내 살아있는 단일 HTTP 서버**로 확장한다.

디렉토리·TypeScript 파일 이름은 **camelCase**. 디스크 JSON 키(`collect_timeout_seconds`, `session_id` 등 외부 인터페이스)와 organ 컨벤션(`__generated__`, `.claude-plugin`)은 예외.

## 패키지 루트 레이아웃

```
plugins/deilen/
├── .claude-plugin/plugin.json     # { name: "deilen", skills, mcpServers }
├── .mcp.json                      # { mcpServers: { tools: { command: node, args: bridge/mcp-server.cjs } } }
├── skills/
│   ├── setup/SKILL.md
│   └── display/SKILL.md
├── scripts/
│   ├── buildMcpServer.mjs         # esbuild → bridge/mcp-server.cjs (CJS)
│   ├── buildViewerHtml.mjs        # 뷰어 FE → bridge/viewer.html (런타임 fs 로드)
│   ├── buildSettingsHtml.mjs      # 설정 FE → bridge/settings.html (런타임 fs 로드)
│   └── buildRenderers.mjs         # 렌더러 *.entry.ts → bridge/assets/*.js (browser ESM)
├── bridge/                        # build artifact (committed — package.json:files)
├── src/
├── package.json
├── tsconfig.json / tsconfig.build.json
├── vitest.config.ts
└── README.md / README-ko_kr.md
```

`package.json` 의 `files`: `["bridge", "skills", ".claude-plugin", ".mcp.json", "README.md"]` (플러그인 런타임은 `bridge/` — `dist/` 미사용; hook 없음 → `libs/run.cjs` 미포함)

(hooks 없음 — cennad 와 달리 `hooks/` 미포함.)

## src/ 트리

```
src/
├── INTENT.md
├── index.ts                       # public API barrel
├── version.ts                     # inject-version.mjs 가 갱신, 수정 금지
├── types/                         # organ — Zod 스키마 (known organ; INTENT.md 없음)
│   ├── index.ts
│   ├── config.ts                  # Config
│   ├── session.ts                 # RenderSession
│   ├── feedback.ts                # FeedbackPayload, Comment, Anchor, ImageRef
│   └── renderOptions.ts           # RenderOptions
├── constants/                     # organ
│   ├── paths.ts
│   └── defaults.ts
├── core/                          # fractal
│   ├── INTENT.md
│   ├── index.ts
│   ├── configManager/
│   ├── sessionStore/              # 렌더 세션 + pendingResolver 레지스트리
│   ├── feedbackStore/             # feedback.json + 이미지 영속화
│   ├── authToken/
│   └── projectHash/
├── render/                        # fractal — markdown → source-line 매핑 HTML
│   ├── INTENT.md
│   ├── index.ts
│   ├── operations/                # renderMarkdown (오케스트레이터) + RenderMeta
│   ├── markdownIt/                # markdown-it 인스턴스 + math/task/source-line 규칙
│   ├── sanitize/                  # allowlist HTML 정제
│   └── utils/                     # lineAttrs, collectSourceLines
├── mcp/                           # fractal — MCP server + tools + HTTP server
│   ├── INTENT.md
│   ├── index.ts
│   ├── server/                    # createServer, startServer (stdio)
│   ├── serverEntry/serverEntry.ts # esbuild 진입점 → bridge/mcp-server.cjs
│   ├── shared/helpers/         # toolResult, toolError, wrapHandler
│   ├── tools/
│   │   ├── renderViewer/
│   │   ├── collectFeedback/
│   │   ├── openSettings/
│   │   └── closeViewer/
│   ├── httpServer/                # 127.0.0.1 단일 서버 (뷰어 + 피드백 + 설정)
│   │   ├── INTENT.md
│   │   ├── index.ts
│   │   ├── httpServer.ts          # startHttpServer (1회 기동, 세션 등록)
│   │   ├── routing/               # routes, routeContext, guardRequest, apiRoutes, assetRoute
│   │   ├── handlers/
│   │   │   ├── handleGetViewer.ts        # GET /r/<session>      뷰어 HTML
│   │   │   ├── handleGetViewerData.ts    # GET /api/viewer       렌더 HTML+메타
│   │   │   ├── handleGetAsset.ts         # GET /assets/<chunk>   lazy 렌더러 자산
│   │   │   ├── handlePostFeedback.ts     # POST /api/feedback    multipart
│   │   │   ├── handlePing.ts             # POST /api/ping        heartbeat
│   │   │   ├── handleGetSettings.ts      # GET /settings
│   │   │   ├── handleGetConfig.ts        # GET /api/config
│   │   │   ├── handleSaveConfig.ts       # POST /api/config
│   │   │   └── handleClose.ts            # POST /api/close
│   │   └── utils/
│   │       ├── parseMultipart.ts         # 자체 multipart 파서 (req→디스크)
│   │       ├── parseMultipartBody.ts     # 순수 버퍼 파서 (boundary 분해)
│   │       ├── sendJson.ts
│   │       ├── escapeJsonForHtml.ts
│   │       └── verifyToken.ts
│   └── pages/
│       ├── viewer/                # 뷰어 FE (index.html, styles/, scripts/, renderers/)
│       └── settings/              # 설정 FE (index.html, styles/, scripts/)
├── lib/                           # organ
│   ├── logger.ts
│   └── atomicWrite.ts
└── utils/                         # organ
    ├── isoNow.ts
    └── randomId.ts
```

## 의존 방향 (DAG)

```
mcp/server      →  mcp/tools/*        →  core/*, render/*, mcp/httpServer
mcp/serverEntry →  mcp/server
mcp/httpServer/handlers  →  core/feedbackStore, core/sessionStore, render/*
render/*        →  lib, utils
core/*          →  lib, utils, constants
```

- `mcp/tools/renderViewer` 가 `httpServer` 를 1회 기동(이미 떠 있으면 재사용)하고 `sessionStore` 에 세션 등록.
- `mcp/tools/collectFeedback` 는 `sessionStore` 의 pendingResolver 에 의존(직접 HTTP I/O 없음).
- `httpServer/handlePostFeedback` 가 `feedbackStore` 저장 후 `sessionStore` resolver 호출.
- FCA: 도메인 루트(`core`/`render`/`mcp`/`mcp/httpServer`)만 `INTENT.md` 보유(fractal). 하위 단일관심 디렉터리(`configManager`·`sessionStore`·각 도구·`handlers`·`renderers` 등)와 `types`/`constants`/`lib`/`utils`/`__generated__`/`pages` 는 organ(INTENT.md 없음) — cennad 동일 관례.

## 빌드 파이프라인 (cennad 동일 패턴)

`package.json` scripts:

```json
{
  "build": "yarn clean && yarn version:sync && node scripts/buildViewerHtml.mjs && node scripts/buildSettingsHtml.mjs && node scripts/buildRenderers.mjs && tsc -p tsconfig.build.json && node scripts/buildMcpServer.mjs",
  "build:plugin": "node scripts/buildMcpServer.mjs",
  "clean": "rm -rf bridge",
  "version:sync": "node ../../scripts/inject-version.mjs"
}
```

| 단계 | 명령                                 | 산출물                             |
| ---- | ------------------------------------ | ---------------------------------- |
| 1    | `yarn version:sync`                  | `src/version.ts`                   |
| 2    | `node scripts/buildViewerHtml.mjs`   | `__generated__/viewerHtml.ts`      |
| 3    | `node scripts/buildSettingsHtml.mjs` | `__generated__/settingsHtml.ts`    |
| 4    | `node scripts/buildRenderers.mjs`    | `bridge/assets/*.js` (browser ESM) |
| 5    | `tsc -p tsconfig.build.json`         | `dist/`                            |
| 6    | `node scripts/buildMcpServer.mjs`    | `bridge/mcp-server.cjs` (esbuild)  |

뷰어 FE 의 무거운 렌더러(Mermaid/highlight/KaTeX)는 전용 `buildRenderers.mjs` 가 **렌더러당 독립 브라우저 엔트리**(`pages/viewer/renderers/*.entry.ts`)로 빌드해 `bridge/assets/*.js` 산출물을 만들고, base HTML 과 분리해 `handleGetAsset` 가 동적 서빙한다(lazy-load 자산). base `viewerHtml.ts` 에는 인라인되지 않는다. 빌드·서빙·누수 방지 상세는 [mcp-runtime.md](./mcp-runtime.md).

### 렌더러 자산 적재 정책 (전부 동봉)

- chunk 출력은 `bridge/assets/{highlight,mermaid,katex}.js`(+css, KaTeX woff2 폰트 포함). `bridge` 가 이미 `files` 에 포함돼 패키지에 동봉된다(files 변경 불필요). esbuild `entryNames` 로 파일명 고정 + enhance.js import 명과 일치 보장(빌드 assertion).
- `handleGetAsset` 는 `bridge/assets/` 에서 `fs` 로 스트리밍만 한다 — 서버 JS 는 이 라이브러리들을 import 하지 않는다.
- `buildMcpServer.mjs` 가드: `mcp-server.cjs` 에 `mermaid|katex|highlight` 가 번들되면 빌드 실패(런타임 비대화 차단, cennad 선례). 세 "용량" 분리는 [rendering.md](./rendering.md) 참조.

## 외부 의존성

- runtime: `@modelcontextprotocol/sdk` ~1.22, `zod` ^3.23, `markdown-it` ^14 (멀티파트는 자체 파서 — 외부 의존성 없음).
- client(번들 자산, 로컬 서빙): `highlight.js`(또는 shiki), `mermaid`, `katex` — Node 런타임 의존 아님, 동적 import chunk.
- dev: `esbuild`, `typescript`, `vitest`, `@vitest/coverage-v8`, `@types/node`, `@types/markdown-it`.

## 핵심 타입 형태 (요약)

- `RenderOptions`: `{ theme?: 'light'|'dark'|'auto', content_width_px?: number, renderers?: { mermaid?: boolean; highlight?: boolean; math?: boolean } }` — 호출별 override(미지정 시 config).
- `ImageRef`(서버 내부 메타): `{ id, mimeType, filename?, source: 'clipboard'|'file', bytes, path }` — `feedback.json` 의 이미지 메타.
- `RenderMeta`: `{ html, lineCount, title, sourceLineIndex: Array<{ line, selector }> }` — render 파이프라인 반환.
- 도구 등록명은 snake_case(`render_viewer`), 파일·심볼은 camelCase(`renderViewer.ts`); `mcp/server` 가 둘을 매핑.

## 메인 진입점 export (cennad 동일)

```json
{
  "exports": {
    ".": { "types": "./dist/index.d.ts", "import": "./dist/index.js" }
  },
  "main": "dist/index.js",
  "types": "dist/index.d.ts"
}
```
