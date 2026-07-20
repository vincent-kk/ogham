# MCP Runtime — Lifecycle, Resource Safety & Browser Bundling

MCP 서버(stdio)가 **장수 HTTP 서버 + long-poll resolver + 세션/이미지**를 보유하므로, "MCP 기본 동작 확장"의 위험(메모리 릭·핸들러 누수)을 구조적으로 차단하는 규칙을 못박는다. stdio transport 와 HTTP listener 는 독립이므로 공존 자체는 안전하며, 관건은 **모든 자원의 해제 페어링**이다.

## 1. 브라우저 패키지 별도 번들 (mcp-server.cjs 비대화 회피)

두 개의 독립 esbuild 타깃을 둔다. node_modules 의 무거운 렌더러는 **브라우저 타깃 산출물에만** 들어간다.

| 빌드        | platform  | 입력                                        | 출력                       | 무거운 렌더러 |
| ----------- | --------- | ------------------------------------------- | -------------------------- | ------------- |
| MCP 서버    | `node`    | `src/mcp/serverEntry/serverEntry.ts`        | `bridge/mcp-server.cjs`    | 미포함(가드)  |
| 렌더러 자산 | `browser` | `src/mcp/pages/viewer/renderers/*.entry.ts` | `bridge/assets/*.js`(+css) | 각 chunk      |

- `buildRenderers.mjs`: 렌더러마다 **독립 엔트리**(예: `mermaid.entry.ts` → `import mermaid from 'mermaid'; export function renderAll(){…}`)를 `format:'esm'`·`platform:'browser'`·`bundle:true`·`minify:true` 로 빌드 → `bridge/assets/mermaid.js`. CSS 는 별도 `*.css` 산출(또는 JS 가 `<link>` 주입).
- **code-splitting 대신 렌더러당 1 엔트리** — 결정적 파일명·독립 캐시·서버 라우팅 단순.
- MCP 서버 코드는 이 산출물을 **절대 `import` 하지 않는다**. `handleGetAsset` 가 `bridge/assets/` 에서 `fs` 로 바이트만 서빙(`text/javascript`/`text/css`).
- 브라우저는 `import('/assets/mermaid.js')`(ESM 동적 import)로 필요 시 로드 → Node 는 파싱·실행 안 함.
- **가드**: `buildMcpServer.mjs` 가 `mcp-server.cjs` 번들에 `mermaid|katex|highlight` 포함 시 빌드 실패(cennad `FORBIDDEN_PATTERNS` 선례). "런타임/브라우저/디스크" 3분리는 [rendering.md](./rendering.md).

## 2. HTTP 서버 생애주기 (단일 인스턴스)

cennad/atlassian `webServer` 의 idle 패턴(`setTimeout` shutdown + `server.listen(0,'127.0.0.1')`)을 일반화한다.

- **싱글톤**: 모듈 레벨 1 인스턴스. `render_viewer`/`open_settings` 가 기동 요청 시 이미 있으면 재사용 — **중복 `listen` 금지**.
- **liveness = heartbeat**: 각 뷰어 탭이 `POST /api/ping`(주기 ~30s)으로 세션 생존을 갱신. 서버는 max(마지막 도구 호출, 마지막 ping) 기준으로 idle 판정 — 둘 다 `idle_shutdown_minutes` 초과 시 `server.close()` + 싱글톤 null(세션 active 여부 무관 → Claude 크래시·read-only 탭 닫기에도 종료). 활동 발생 시 타이머 재설정.
- **인증 경계**: `/r`·API 는 one-time token; 정적 `/assets`(렌더러 chunk/css/폰트)는 **토큰 면제**(비민감 공개 라이브러리, 동적 import·폰트 하위요청 호환).
- **타이머 `unref()`**: idle 타이머는 `unref()` 해 프로세스 종료를 막지 않음.
- **graceful shutdown**: stdio transport `close`/`end`, `SIGINT`/`SIGTERM`, `process.on('exit')` → 모든 타이머 clear + pending resolver 를 `server_closing` 으로 settle + `server.close()` + fd 해제.

## 3. long-poll resolver 레지스트리 (핸들러 누수 차단)

최대 위험 지점. 규칙으로 못박는다.

- 구조: `Map<sessionId, { resolve, timer, signalHandler }>` — **세션당 단일 슬롯**.
- **`extra` 전달형 wrapHandler 필요**: cennad 의 현 `wrapHandler` 는 `(args) => …` 로 `extra` 를 버린다. deilen 은 `collect_feedback` 가 `extra.signal` 에 접근해야 하므로 `(args, extra) => …` 를 전달하는 변형이 필요.
- `collect_feedback`:
  1. complete 버퍼 존재 → 즉시 반환(등록 안 함).
  2. 없음 → 슬롯 등록 + `wait_seconds` 타이머. **기존 슬롯이 있으면 먼저 `settle(superseded)` 후 교체**.
  3. `extra.signal`(MCP SDK 1.22.0 `RequestHandlerExtra.signal: AbortSignal` — 확인됨) `abort` 리스너 등록 → 호출 취소 시 슬롯 정리.
- **`settle(sessionId, value)` 멱등 헬퍼**: `clearTimeout` + signal 리스너 `removeEventListener` + 슬롯 `delete` + `resolve(value)` 1회. **모든 해소 경로(제출/타임아웃/abort/close/supersede)가 이 헬퍼만 통과** → set↔clear 페어링 보장.
- `handlePostFeedback`(complete) 는 `settle(sessionId, feedback)` 만 호출(직접 resolve 금지).
- 비차단: long-poll 은 `await new Promise` (busy-wait 아님) — stdio 처리·이벤트 루프 영향 없음.

## 4. 세션·이미지 자원

- 세션 영속: 디스크 세션 디렉토리(`meta.json`/`viewer.md`); `session_ttl_hours` TTL prune(render·기동 시)으로 무한 증식 차단. `close_viewer`/idle/TTL 정리; `complete` 수거 시 `feedback.json`/`images/` 는 정리하되 닫힌 `viewer.md` 는 새로고침용으로 보존.
- 이미지: 요청 본문을 `max_payload` 한도로 버퍼링 후 파싱 → 디스크 기록(`runtime/sessions/<sid>/images/`). 검증 통과분만 기록(부분 파일 미생성); mime/크기 위반 시 거부.
- 자산 서빙: 소형 `readFile`, 대형 chunk `createReadStream` + `error`/`close` 정리.
- `collect_feedback` 반환 이미지 base64 는 **그때 디스크에서 읽어** 직렬화(상주 캐시 없음).

## 5. 구현 점검 체크리스트

- [ ] 모든 `setTimeout` 에 대응 `clearTimeout` 경로 존재
- [ ] resolver 는 항상 `settle()` 통해서만 해소(직접 `resolve` 금지)
- [ ] `extra.signal` abort 리스너 등록·해제 페어링
- [ ] 중복 `listen` 방지(싱글톤 가드)
- [ ] graceful shutdown 에서 pending resolver 전부 settle
- [ ] 이미지·자산 스트림 fd 정리
- [ ] 세션 TTL prune 동작 확인
- [ ] `wait_seconds` ≤ stdio idle window(기본 30분, 무응답 호출 abort) — `MCP_TIMEOUT` 은 서버 기동 전용이라 무관, `MCP_TOOL_TIMEOUT` 기본 ~28h, 60초 per-request 타이머는 HTTP/SSE 전용. 토큰 효율은 [skills.md](./skills.md)
