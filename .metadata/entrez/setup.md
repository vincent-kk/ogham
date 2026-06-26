# entrez — setup (web UI 설정)

**atlassian `setup` 도구 구조를 차용**한다(`plugins/atlassian/src/mcp/tools/setup/`). 로컬 HTTP 서버를 띄워 브라우저 폼으로 설정을 받고, 비밀은 채팅/LLM을 거치지 않고 브라우저→로컬서버→디스크 경로로만 흐른다. 도구 계약은 [mcp-tools.md](./mcp-tools.md), 경로·코드 골격은 [architecture.md](./architecture.md), enum은 [spec.md](./spec.md)가 SSoT. 설정 진입 스킬은 [skills.md](./skills.md) `setup`.

## 목적

- `tool`·`email`(NCBI 필수 식별자), `api_key`(선택), 검색 대상(`default_db`), 출력·rate·날짜 설정을 **web UI로** 입력받는다.
- **LLM은 `api_key`에 접근하지 않는다.** 채팅에서 키·식별자를 묻지 않고(atlassian과 동일 규칙), web UI가 입력·검증·저장을 전담한다. LLM은 도구를 트리거하고 `{success, url}`만 보고한다.
- 비밀(`api_key`)과 비밀 외 설정을 **파일 분리** 저장한다.

## 설정 항목

| 항목 | 저장 위치 | 필수 | 기본 | 설명 |
|------|-----------|:---:|------|------|
| `tool` | config.json | ✅ | — | NCBI E-utilities `tool` 식별자(모든 요청에 부착, NCBI 규약). |
| `email` | config.json | ✅ | — | 연락 이메일(모든 요청에 부착, NCBI 규약). |
| `api_key` | **credentials.json** | ❌ | — | NCBI API key. 있으면 rate 3/s→10/s. `RateLimit` 도출 근거. |
| `default_db` | config.json | ❌ | `Db.PUBMED` | `pubmed` \| `pmc` \| `mesh`. 검색 대상 기본값. |
| `base_url` | config.json | ❌ | eutils 기본 | `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/`. **미러용 override**(사내 프록시·미러). SSRF allowlist는 httpClient가 강제. |
| `output_path` | config.json | ❌ | 기본 다운로드 디렉토리 | download/`--auto` 산출물 경로. |
| `date_tag` | config.json | ❌ | `true` | 출력 파일명에 날짜 태그 부착 여부. |
| `rate_limit` | config.json | ❌ | `api_key`로 도출 | `RateLimit`(`NO_KEY`=3/s \| `WITH_KEY`=10/s). 표시·보수적 상한 용도. |
| `default_date_range` | config.json | ❌ | 미설정 | 검색 기본 날짜 범위(`{from?, to?}`). 미설정 시 무제한. |

## 저장 — config.json / credentials.json 분리

atlassian의 configManager(0o600)·authManager(0o600) 분리를 그대로 따른다. entrez에서는 `core/config/`가 양쪽을 다루되 파일을 분리한다.

```ts
// types/config.ts (zod) — 비밀 외 설정
const EntrezConfigSchema = z.object({
  tool: z.string().min(1),
  email: z.string().email(),
  default_db: DbSchema.default(Db.PUBMED),         // pubmed | pmc | mesh
  base_url: z.string().url().default(DEFAULT_EUTILS_BASE),
  output_path: z.string().default(DEFAULT_OUTPUT_DIR),
  date_tag: z.boolean().default(true),
  rate_limit: RateLimitSchema.optional(),          // NO_KEY | WITH_KEY
  default_date_range: z.object({ from: z.string().optional(), to: z.string().optional() }).optional(),
});

// types/config.ts (zod) — 비밀(별도 파일, 0o600)
const EntrezCredentialsSchema = z.object({
  api_key: z.string().min(1).optional(),           // LLM 미접근
});
```

- **`config.json`** — `tool`·`email`·`default_db`·`base_url`·`output_path`·`date_tag`·`rate_limit`·`default_date_range`. `saveConfig`가 zod 검증 후 `mode: 0o600`로 기록(`email`은 민감 식별자라 atlassian과 동일하게 0o600).
- **`credentials.json`** — `api_key`만. `saveCredentials`가 `mode: 0o600`로 기록. 사전 존재 파일이 느슨하면 load 시 0o600으로 chmod(방어적 강화, atlassian authManager 패턴).
- 경로 상수는 `constants/paths.ts`의 `CONFIG_PATH`·`CREDENTIALS_PATH`. httpClient는 요청 시 `core/config`를 통해서만 `api_key`를 읽어 헤더에 싣고 rate를 정한다 — **LLM 컨텍스트로 노출되지 않는다.**

## web server + 브라우저 흐름 (atlassian setup tool 패턴)

`setup` MCP 도구(`mcp/tools/setup/`)가 로컬 HTTP 서버를 띄우고 브라우저를 연다. `mode`: `new`(덮어쓰기) \| `edit`(기존값 마스킹 prefill).

1. **서버 기동** — `startSetupServer`가 `127.0.0.1:0`(임의 포트)에 bind, `@ogham/cross-platform`의 `openBrowser(url)`로 브라우저 자동 오픈, `{ success, message, url }` 반환. 모듈 레벨 상태 없음.
2. **라우트**(`webServer/routes.ts` 패턴):
   - `GET /` — 설정 폼 HTML(`tool`·`email`·`api_key`[기존 시 마스킹]·`default_db` select·`base_url`·`output_path`·`date_tag`·`default_date_range`, 현재 rate 표시).
   - `GET /status` — 현재 설정 반환(`api_key` 마스킹), 유효 rate.
   - `POST /test` — **EInfo reachability probe + rate 표시**(저장 안 함). atlassian `testConnection`의 entrez 대응.
   - `POST /submit` — zod 검증 → 마스킹된 `api_key` 복원(미변경 시 기존값 유지, `restoreMaskedValues` 패턴) → EInfo probe → **통과 시에만** config/credentials 분리 저장(`saveConfig`·`saveCredentials`, 둘 다 0o600) → `closeServer`. 실패 시 400, **미저장**.
3. **CSRF·격리** — POST는 `Content-Type: application/json` 강제(simple CORS POST 차단), `127.0.0.1` 전용·CORS 헤더 없음(동일 출처).
4. **수명** — 유휴 5분 자동 종료(`AUTO_SHUTDOWN_MS`), 요청마다 `resetTimer`.
5. **LLM 무접근 보장** — 키는 브라우저 폼→로컬서버→`credentials.json`(0o600)로만 흐른다. 채팅 메시지·도구 인자·반환값 어디에도 `api_key` 평문이 실리지 않는다.

## auth_check 연계

`auth_check` 도구(`mcp/tools/authCheck/`)가 설정 상태를 보고하고 reachability를 점검한다(atlassian `auth_check` 대응).

- `loadConfig` → `{ configured: tool/email 존재?, api_key_present(불리언·값 마스킹), default_db, base_url }`.
- `connection_test: true` → **EInfo(`einfo.fcgi`) reachability** + latency + **유효 rate**(`NO_KEY`=3/s, `WITH_KEY`=10/s) 표시. EInfo 200 = base_url 도달·식별자 수용.
- **setup 스킬 pre-flight**(atlassian 흐름 차용): 인자 없을 때 먼저 `auth_check` → 미설정이면 `setup{mode:"new"}`, 설정돼 있으면 사용자 확인 후 `setup{mode:"edit"}`. `--test`는 wizard 생략하고 `auth_check{connection_test:true}`만. `--reset`은 `setup{mode:"new"}`. rate 초과·식별자 누락 등 실패 시 auth_check가 복구 진입점.

## 차용 매핑 (atlassian → entrez)

| atlassian | entrez |
|-----------|--------|
| `handleSetup` + `startSetupServer`(127.0.0.1:0) | 동일 |
| `openBrowser(url)` | 동일 |
| 라우트 `/` · `/status` · `/test` · `/submit` | 동일(필드만 entrez) |
| `testConnection`(Jira/Confluence 200) | **EInfo reachability probe** |
| `SetupFormDataSchema`(zod) + `restoreMaskedValues` | `EntrezConfigSchema`(zod) + `api_key` 마스킹 복원 |
| configManager `config.json`(0o600) | `core/config` `config.json`(0o600) |
| authManager `credentials.json`(0o600) | `api_key` → `credentials.json`(0o600) |
| `auth_check`(authenticated + services) | `auth_check`(configured + EInfo + rate) |
| CSRF: POST = application/json, 127.0.0.1 전용 | 동일 |
