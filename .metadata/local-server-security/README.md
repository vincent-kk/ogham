# Local Server Security Hardening — 수정 계획

> **상태**: 구현 완료(implemented) — 2026-07-06. 공유 `@ogham/http-guard` 패키지 추출 + 4개 서버 일괄 적용. 상세는 §7.
> **범위**: `ogham/plugins` 중 로컬 HTTP 서버로 page 를 서빙하고 submit 을 받는 4개 플러그인 (deilen, cennad, entrez, atlassian).
> **판정 모델**: **리스크 = 도달성(브라우저가 그 서버에 요청을 보낼 수 있는가) × 권한(도달 시 무엇을 할 수 있는가)**. 두 축 중 하나만 0이면 그 벡터는 닫힌다. stdio 는 도달성을 0으로, read-only 는 권한을 0으로 만든다.

이 디렉토리는 `cross-platform/` 과 같은 패턴 — 여러 플러그인에 걸친 횡단 관심사(로컬 서버 보안)를 한 곳에서 분석·계획·추적한다.

---

## 1. 진단 요약

| 플러그인      | 서버 라우터 파일                                         |      토큰      |  Host검증   | Origin(POST) |        CT         | 쓰기 권한               |    등급    |
| ------------- | -------------------------------------------------------- | :------------: | :---------: | :----------: | :---------------: | ----------------------- | :--------: |
| **deilen**    | `src/mcp/httpServer/routing/guardRequest.ts`             | ✅ timing-safe | ✅ loopback |      ✅      | ✅ json/multipart | 세션 dir(이미지·피드백) | **A 견고** |
| **cennad**    | `src/mcp/tools/openSettings/webServer/routing/routes.ts` | ✅ timing-safe |     ❌      |      ❌      |      ✅ json      | provider 설정           |   **B**    |
| **entrez**    | `src/mcp/tools/setup/webServer/routes.ts`                |       ❌       |     ❌      |      ❌      |      ✅ json      | NCBI API키·이메일       |   **C**    |
| **atlassian** | `src/mcp/tools/setup/webServer/routes.ts`                |       ❌       |     ❌      |      ❌      |      ✅ json      | Jira 자격증명           |   **C**    |

공통: 모두 `server.listen(*, "127.0.0.1")` 바인딩 + idle auto-shutdown.

---

## 2. 근본 원인

- **setup 계열(entrez·atlassian)**: CSRF 방어가 `Content-Type: application/json` **단일**. cross-origin 일반 CSRF 는 막지만(non-simple 요청 → preflight 유발 + CORS 헤더 부재), **DNS rebinding** 으로 공격 페이지가 `127.0.0.1:port` 와 same-origin 이 되면 preflight 도 same-origin 이라 통과 → **Host 검증 부재로 요청 처리 → 토큰도 없어 자격증명 조회/변조**. 권한 축이 API 키·Jira 자격증명이라 피해가 큼.
- **cennad**: 토큰이 1차 관문이라 rebinding 에도 토큰 모르면 막힘. 단 Host 심층방어가 없고 토큰이 `?token=` 쿼리스트링 → referer·서버로그·브라우저 히스토리 유출 표면. 토큰 유출 시 무방비.
- **deilen**: loopback Host + POST Origin 검증으로 "토큰이 유출돼도 rebinding 을 차단"(`guardRequest.ts` 주석에 명시). 유일하게 두 축 모두 낮음.

---

## 3. 처방 아키텍처 — 공통 guard 모듈 (핵심)

deilen `guardRequest` 를 **정본**으로 삼아 **공통 모듈로 추출**하고 4개 서버에 일괄 적용한다. 개별 재구현은 드리프트를 낳는다 — `@ogham/cross-platform` 어댑터와 같은 "한 곳에서 방어" 철학.

**제안 위치**: `shared/http-guard/` (또는 각 플러그인이 import 하는 공통 패키지).

**시그니처 스케치**:

```ts
interface GuardOptions {
  request: IncomingMessage;
  response: ServerResponse;
  url: URL;
  method: string;
  token?: string; // 제공 시 토큰 검증, 미제공 시 skip
}
/** 반환: true = 거부(응답 이미 전송), false = 통과 */
export function guardHttpRequest(opts: GuardOptions): boolean;
```

**검증 순서 (deilen 정본 그대로)**:

1. `LOOPBACK_HOST.test(req.headers.host)` 실패 → `403 Invalid host` — **rebinding 차단, 모든 서버 필수**
2. `token` 제공 시 `verifyToken(token, url.searchParams.get("token"))` (`timingSafeEqual`) 실패 → `401`
3. `POST` 이고 `origin` 존재 시 `LOOPBACK_ORIGIN` 아니면 → `403 Invalid origin`
4. `POST` 이면 `Content-Type` 이 json(또는 multipart) 아니면 → `415`

정규식은 deilen 정본:

```ts
const LOOPBACK_HOST = /^(127\.0\.0\.1|localhost)(:\d+)?$/i;
const LOOPBACK_ORIGIN = /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/i;
```

---

## 4. 작업 항목

### P1 — setup 계열에 Host 검증 추가 (최우선: 권한 = 자격증명)

- [x] `entrez/src/mcp/tools/setup/webServer/routes.ts`: 핸들러 진입부에 loopback Host 체크 추가, 실패 시 403.
- [x] `atlassian/src/mcp/tools/setup/webServer/routes.ts`: 동일.
- [x] (권장) 두 setup 서버에 **토큰 도입** — `startSetupServer` 가 토큰 생성 → setup URL 에 `?token=` 부착 → routes 에서 `verifyToken`. deilen `core/authToken` 모듈 재사용.
- **AC**: `Host: evil.com` 위조 요청이 403. 정상 loopback 은 통과. 토큰 도입 시 토큰 부재/오류가 401.

### P2 — 공통 guard 모듈 추출 (구조 개선)

- [x] deilen `httpServer/routing/guardRequest.ts` + `core/authToken` 을 `shared/http-guard/` 로 이관(또는 공통 패키지로 승격).
- [x] deilen·cennad·entrez·atlassian 이 공통 `guardHttpRequest` 를 import.
- [x] deilen 동작 회귀 없음 확인 — 현행이 정본이므로 결과 동일해야 함.
- **AC**: 4개 서버가 동일 guard 경유. 스냅샷/통합 테스트로 4중 방어 확인.

### P3 — cennad 보강

- [x] `cennad/src/mcp/tools/openSettings/webServer/routing/routes.ts`: loopback Host 체크 추가.
- [x] 토큰 전달을 `?token=` 쿼리 → 헤더(예: `X-Auth-Token`)로 이동 검토 — referer/로그 유출 표면 축소. (뷰어 URL 공유 UX 와 트레이드오프 확인)
- **AC**: Host 검증 추가. 토큰 전달 방식 결정 및 근거 문서화.

---

## 5. 검증 관점 (회귀 테스트)

- **rebinding**: `Host` 헤더가 non-loopback 인 요청 → 403.
- **토큰**: 부재/오류 → 401 (토큰 있는 서버).
- **Origin**: POST 의 `Origin` 이 non-loopback → 403.
- **CT**: POST 의 Content-Type 이 json/multipart 아님 → 415.
- **deilen 불변**: 현행 정본이 위 4개를 모두 통과(회귀 없음).

---

## 6. 근거

- **점검 리포트** (maencof vault): `tirnanog/04_Action/findings/ogham-local-server-security-audit-2026-07-06.md`
- **판정 모델** (maencof vault): `tirnanog/02_Derived/insights/security/local-server-browser-attack-risk-model.md`
- **정본 구현**: `deilen/src/mcp/httpServer/routing/guardRequest.ts`
- **배경 패턴**: CVE-2026-10789(Autodesk Fusion, 로컬 MCP 를 브라우저가 RCE) — 도달성 × 권한 두 축이 모두 열린 사례.

---

## 7. 구현 결과 (2026-07-06)

**공유 패키지** — `shared/http-guard` = `@ogham/http-guard` (private workspace, `@ogham/cross-platform` 패턴). 핵심은 `inspectRequest(opts): GuardVerdict` — **응답을 보내지 않고 verdict(discriminated union)만 반환**하고 각 서버가 자기 envelope(`{ ok }` / `{ success }`)로 매핑한다(envelope 상이 → 드리프트 없이 로직만 공유). `generateToken`/`verifyToken` 도 이관. 소비처는 **deep import** (`@ogham/http-guard/guard`, `@ogham/http-guard/token`).

**적용** — 4개 서버(deilen viewer, cennad settings, entrez setup, atlassian setup) 모두 `inspectRequest` 경유.

- **deilen**: 정본 동작 보존(동일 status/message/envelope/검증순서 + multipart 허용). 로컬 `core/authToken` 삭제 → 공유로 단일화. 기존 116 테스트 무회귀.
- **cennad**: loopback Host + POST Origin 검증 신규 추가(토큰은 기존 유지). 로컬 `core/authToken` 삭제.
- **entrez·atlassian**: **토큰 신규 도입** — 서버가 발급 → URL `?token=` 부착 → 페이지 JS가 `location.search` 에서 읽어 모든 요청에 전파. `SetupServerHandle`·`RouteContext` 에 `token` 추가.

**결정 — 토큰 전송은 쿼리스트링 유지**: §3/P3 의 "헤더 이동" 안은 **초기 브라우저 GET 네비게이션이 커스텀 헤더를 실을 수 없어** root 페이지 로드에 적용 불가. deilen/cennad 와 동일하게 `?token=` 로 통일(뷰어/설정 URL 은 원래 LLM 에 노출되는 값이라 표면 증가 없음).

**배선** — `scripts/build-all.mjs` · `scripts/typecheck-all.mjs` PROVIDERS + 루트 `vitest.config.ts` projects 에 `@ogham/http-guard` 추가. 4개 플러그인 `package.json` devDependencies 에 `workspace:^`.

**검증** — 테스트 전 통과: http-guard 19 · deilen 116 · cennad 558 · entrez(setup) 17 · atlassian 370. 신규 가드 테스트가 4중 방어 회귀 확인(rebinding→403 · token→401 · origin→403 · CT→415). 4개 `bridge/mcp-server.cjs` 가 가드를 인라인(`require("@ogham/http-guard")` 누출 0). `public/settings.html`(entrez·atlassian) 은 토큰 전파 반영해 재생성 — 빌드 산출물 커밋은 컨벤션대로 사용자.
