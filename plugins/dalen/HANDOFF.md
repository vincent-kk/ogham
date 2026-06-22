# dalen 개발 핸드오프 플랜

> Phase 0 스캐폴드 완료 시점의 인수인계 문서. **설계 정본은 [`.metadata/dalen/`](../../.metadata/dalen/)**, 구현은 이 플랜의 단계 순서를 따른다. 본 문서는 "무엇을 어디에 어떤 순서로" 만드는지를 정의한다.

## 0. 현재 상태 (Phase 0 완료)

- **생성**: `.claude-plugin/plugin.json`, `.mcp.json`, `package.json`, `tsconfig.json`/`tsconfig.build.json`, `vitest.config.ts`, `.gitignore`, `INTENT.md`, `CLAUDE.md`, `README.md`/`README-ko_kr.md`, `src/{version.ts,index.ts,INTENT.md,__tests__/smoke.test.ts}`, 본 `HANDOFF.md`.
- **등록**: `.claude-plugin/marketplace.json`, 루트 `README.md`.
- **미구현**: MCP 서버 본체·HTTP 서버·렌더·피드백·스킬·설정 UI. `bridge/` 는 아직 없음(빌드는 Phase 2부터).
- **검증 (착수 전 1회)**: 루트에서 `yarn install` → `yarn dalen typecheck` + `yarn dalen test:run` 통과 확인.

## 1. 설계 정본 (Source of Truth)

| 문서                   | 내용                                                              |
| ---------------------- | ----------------------------------------------------------------- |
| `README.md`            | Spec Index + 핵심 결정                                            |
| `spec.md`              | 책임·데이터 흐름·수거 메커니즘·비채택                             |
| `architecture.md`      | 패키지·src 트리 + DAG + 빌드 파이프라인(목표 최종형)              |
| `mcp-runtime.md`       | 생애주기·누수 방지·브라우저 자산 별도 번들                        |
| `mcp-tools.md`         | `render_report`/`collect_feedback`/`open_settings`/`close_report` |
| `rendering.md`         | markdown 파이프라인 + source-line + 클라이언트 lazy-load          |
| `feedback-protocol.md` | multipart 페이로드·클립보드·long-poll 수거                        |
| `web-ui.md`            | 뷰어/설정 페이지·라우트·보안                                      |
| `skills.md`            | `setup`/`present` + 토큰 효율 + plan 프레젠테이션                 |
| `storage.md`           | 디스크 레이아웃 + Config 스키마                                   |
| `roadmap.md`           | 단계 순서                                                         |

## 2. FCA 개발 워크플로우 (모듈 작업 전 필수)

1. 영향 fractal 식별 (`core`/`render`/`mcp`/`mcp/httpServer`).
2. 해당 모듈 **`DETAIL.md` 갱신**(요구·계약) — 코드 작성 전.
3. 경계 변경 시 **`INTENT.md` 갱신**.
4. 구현.
5. **`/filid:scan` 통과** 확인.

> 도메인 루트만 `INTENT.md` 보유(fractal). `types`/`constants`/`lib`/`utils`/`__generated__`/`pages` 와 하위 단일관심 디렉터리(`configManager`·`sessionStore`·각 도구·`handlers`·`renderers`)는 organ(INTENT.md 없음).

## 3. 단계 계획 (파일 타깃)

### Phase 1 — 렌더 코어

- `src/types/{config,session,feedback,renderOptions}.ts` (Zod) + `index.ts`
- `src/constants/{paths,defaults}.ts`
- `src/render/{markdownRenderer,sourceLineMap,sanitize}.ts` + `INTENT.md` + `index.ts`
- 테스트: 표/코드/mermaid/수식 표식 + `data-source-line` 주입.

### Phase 2 — HTTP 서버 + 뷰어(읽기)

- `src/core/{configManager,sessionStore,authToken,projectHash}/`, `src/lib/{atomicWrite,logger}.ts`, `src/utils/{isoNow,randomId}.ts`
- `src/mcp/{server/,serverEntry/serverEntry.ts,shared/toolResponse.ts}` + `INTENT.md`
- `src/mcp/httpServer/{httpServer,routes,routeContext}.ts` + `handlers/{handleGetReport,handleGetReportData,handleGetAsset,handlePing}.ts` + `utils/{verifyToken,sendJson,escapeJsonForHtml}.ts` + `INTENT.md`
- `src/mcp/pages/report/{index.html,styles/,scripts/{app,enhance,comments,images,submit,copy}.js,renderers/*.entry.ts}`
- `src/mcp/tools/renderReport/`
- `scripts/{buildReportHtml,buildRenderers,buildMcpServer}.mjs`
- **빌드 갱신**: `build` 에 `buildReportHtml → buildRenderers` (tsc 앞) + `buildMcpServer` (tsc 뒤) 추가. `build:plugin` 신설.
- 수동 확인: 브라우저에서 보고서 가독 표시 + lazy 렌더러 동작.

### Phase 3 — 피드백 수집·수거

- `src/mcp/httpServer/handlers/handlePostFeedback.ts` + `utils/parseMultipart.ts` (busboy)
- `src/core/feedbackStore/`
- `sessionStore` resolver(멱등 `settle`) + `src/mcp/tools/{collectFeedback,closeReport}/`
- **`extra` 전달형 `wrapHandler`** (cennad 의 현 것은 extra 를 버림)
- 테스트: multipart 파싱·한도·mime, resolver 랑데부, pending 타임아웃, settle 멱등, abort 정리.

### Phase 4 — 스킬

- `skills/present/SKILL.md`, `skills/setup/SKILL.md` (영어)
- `.claude-plugin/plugin.json` 에 `"skills": "./skills/"` 추가.

### Phase 5 — 설정 UI

- `src/mcp/pages/settings/`, `scripts/buildSettingsHtml.mjs`, `src/mcp/tools/openSettings/`, config 라우트(`handleGetConfig`/`handleSaveConfig`/`handleClose`)
- **빌드 갱신**: `build` 에 `buildSettingsHtml` 추가.

### Phase 6 — 마감

- `close_report`·세션 TTL·idle/heartbeat 폴백 종료 검증
- 각 fractal `DETAIL.md`, README 갱신, `/filid:scan`, changeset.

## 4. 빌드 파이프라인 진화

| 단계           | `build`                                                                           |
| -------------- | --------------------------------------------------------------------------------- |
| Phase 0 (현재) | `clean → version:sync → tsc`                                                      |
| Phase 2        | `… → version:sync → buildReportHtml → buildRenderers → tsc → buildMcpServer`      |
| Phase 5        | `… → buildReportHtml → buildSettingsHtml → buildRenderers → tsc → buildMcpServer` |

목표 최종형은 `architecture.md` 의 빌드 표 참조.

## 5. 확정 설계 결정 (구현 시 준수)

- **자산 인증**: `/assets` 는 토큰 면제(비민감 라이브러리·폰트); `/r`·API 만 token.
- **서버 생애주기**: heartbeat(`POST /api/ping`) + 폴백 idle — 도구 호출·ping 이 모두 `idle_shutdown_minutes` 단절 시 종료(Claude 크래시 누수 방지). 싱글톤·중복 listen 금지.
- **collect_feedback**: bounded long-poll, `wait_seconds ≤ 55`(< 클라이언트 `MCP_TIMEOUT`). `settle()` 멱등 단일 경로. `extra.signal` abort 시 정리.
- **path**: 신뢰 임의경로 + `max_report_mb` 캡(canonicalize·utf8·일반파일 검증).
- **이미지**: `complete` 제출 시 일괄(auto-save 는 텍스트만; 미제출 시 이미지 미보존).
- **이미지 ID**: bare id `x` → part `img_x`.
- **렌더러 보안**: Mermaid `securityLevel:'strict'`, KaTeX `trust:false`, 생성 SVG 클라이언트 정제.
- **traversal 차단**: `/assets` allowlist, `session_id` `^[A-Za-z0-9_-]+$` + 등록분만.

## 6. 함정 (Gotchas)

- `mcp-server.cjs` 번들에 `mermaid|katex|highlight` 포함 금지 — `buildMcpServer.mjs` 가드로 강제(런타임 비대화 차단).
- `bridge/` 는 **사용자가 빌드·커밋**. AI 는 `src/`·`scripts/`·`skills/`·docs 만.
- `version.ts`/`plugin.json` version 은 `yarn version:sync` 로만.
- README 에 버전 숫자 금지. `CLAUDE.md`/`SKILL.md` 는 영어.
- dalen 은 **hook 없음** → `libs/run.cjs` 불필요.

## 7. 명령

```bash
yarn install                 # 루트 (신규 워크스페이스 인식)
yarn dalen typecheck
yarn dalen test:run
yarn dalen build             # bridge/ 산출 (Phase 2+); 사용자가 커밋
yarn dalen version:sync
```
