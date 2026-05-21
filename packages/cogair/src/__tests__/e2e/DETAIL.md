## Requirements

cogair 의 두 핵심 표면에 대한 e2e 회귀 보장:

- **MCP 서버 `tools`** — `start_conversation`, `continue_conversation`, `open_settings` 3 도구의 JSON-RPC 표면, envelope, 디스크 사이드이펙트, 에러 매핑.
- **라이프사이클 hooks** — `injectStatic`, `injectDynamic` 의 payload 내용, exit 0 보장, stdout JSON envelope.

## Layer 책임 매트릭스

| 차원                                   | Layer A (in-process)                                                                             | Layer B (번들 stdio)                                        |
| -------------------------------------- | ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------- |
| MCP                                    | `createServer()` + `InMemoryTransport` pair                                                      | `node bridge/mcp-server.cjs` spawn + `StdioClientTransport` |
| Hook                                   | `buildStaticPayload(loadConfig())`, `buildDynamicPayload(loadConfig(), loadCounter())` 직접 호출 | `spawnSync('node', [bridge/<name>.mjs])` → stdout JSON 파싱 |
| 외부 CLI                               | fake PATH 주입 (process.env.PATH 조작)                                                           | spawn env 에 fake PATH 주입                                 |
| cross-project (cwd 다름)               | 제외                                                                                             | `StdioClientTransport({ cwd })`                             |
| 번들 사이즈·금칙                       | —                                                                                                | `fs.stat` + grep                                            |
| MCP initialize handshake               | —                                                                                                | ✓                                                           |
| Hook entry try/catch fallback + exit 0 | —                                                                                                | ✓                                                           |

## API Contracts

### `helpers/fakeProviderScripts.ts`

- `GEMINI_FAKE_SCRIPT: string`, `CODEX_FAKE_SCRIPT: string` — 가짜 CLI 스크립트 원문 (dispatcher integration test 와 공유)
- `geminiEnv(mode, opts?)`, `codexEnv(mode, opts?)` — 시나리오별 환경 변수 빌더

### `helpers/installFakeProviders.ts`

- `installFakeProviders(): { restore: () => void }` — `installFakeBinary` + `prependToPath` 묶음

### `helpers/mcpClientLayerA.ts`, `mcpClientLayerB.ts`

- `makeLayerAClient(): Promise<{ client: Client; close: () => Promise<void> }>` — InMemoryTransport pair
- `makeLayerBClient(opts?: { cwd?: string; env?: Record<string,string> }): Promise<{ client: Client; close: () => Promise<void> }>` — StdioClientTransport spawn

### `helpers/hookRunnerLayerA.ts`, `hookRunnerLayerB.ts`

- `runHookLayerA(name): HookResult` — payload builder 직접 호출, envelope shape 만 합성
- `runHookLayerB(name, opts?): { exitCode, stdout, stderr, parsed }` — spawnSync bridge/<name>.mjs

### `helpers/httpClient.ts`

- `httpGet(url): Promise<{ status; headers; body }>`
- `httpPostJson(url, body, contentType?): Promise<{ status; headers; body }>`

### `helpers/diskAssert.ts`

- `readSessionFile(hash, sessionId): Promise<SessionMeta | null>`
- `readCounter(): Promise<Counter | null>`
- `readConfig(): Promise<Config | null>`
- `writeConfigFixture(name: 'custom' | 'disabled' | 'legacy' | 'corrupt'): Promise<void>`
- `writeCounter(c: { parent_pid; gemini; codex }): Promise<void>`

### `helpers/envelopeShape.ts`

- `assertEnvelopeSuccess(envelope, { provider, turn })`
- `assertEnvelopeFailure(envelope, { code })`
- `assertHookEnvelope(parsed, { event, contextIncludes? })`

## Env 변수

| 변수                     | 효과                                                                                    |
| ------------------------ | --------------------------------------------------------------------------------------- |
| `COGAIR_E2E_REAL_CLI`    | truthy → real CLI smoke spec 실행                                                       |
| `COGAIR_E2E_SKIP_BUILD`  | truthy → globalSetup 빌드 스킵 (watch 모드)                                             |
| `COGAIR_E2E_BRIDGE`      | globalSetup 이 export, `<packageRoot>/bridge` 경로                                      |
| `COGAIR_DISABLE_BROWSER` | e2e setup 이 자동 set — `open_settings` 의 `openBrowser` 호출 억제 (브라우저 spam 방지) |
| `COGAIR_FAKE_GEMINI_*`   | gemini fake 스크립트 모드/UUID/index/list-mode 제어                                     |
| `COGAIR_FAKE_CODEX_*`    | codex fake 스크립트 모드/thread-id 제어                                                 |

## 시나리오 매트릭스

### MCP

| #   | 시나리오                                                     | A   | B   |
| --- | ------------------------------------------------------------ | --- | --- |
| 1   | tools/list → 3 도구                                          | ✓   | ✓   |
| 2   | start_conversation(gemini) success — envelope·디스크·counter | ✓   | ✓   |
| 3   | start_conversation(codex) success — JSONL thread_id          | ✓   | ✓   |
| 4   | start_conversation 에러 매핑 6종                             | ✓   | ✓   |
| 5   | continue_conversation success — turn/last_used_at            | ✓   | ✓   |
| 6   | continue_conversation cross-project → unknown                | —   | ✓   |
| 7   | ignored_options 채워짐                                       | ✓   | ✓   |
| 8   | open_settings 라이프사이클 (reused·HTML·config·save·close)   | ✓   | ✓   |
| 9   | open_settings 인증 401 / 415 / 404                           | ✓   | ✓   |
| 10  | 번들 사이즈 ≤10KB + FORBIDDEN 부재                           | —   | ✓   |
| 11  | MCP 번들 initialize handshake                                | —   | ✓   |

### Hook

| #   | 시나리오                                 | A           | B   |
| --- | ---------------------------------------- | ----------- | --- |
| 1   | injectStatic default payload             | ✓           | ✓   |
| 2   | injectStatic custom config 반영          | ✓           | ✓   |
| 3   | injectStatic 비활성 provider             | ✓           | ✓   |
| 4   | injectStatic 손상 config → fallback      | loader-only | ✓   |
| 5   | injectDynamic no-counter                 | ✓           | ✓   |
| 6   | injectDynamic with counter               | ✓           | ✓   |
| 7   | injectDynamic stale counter              | ✓           | ✓   |
| 8   | injectDynamic 손상 counter → fallback    | loader-only | ✓   |
| 9   | legacy 정수 ratio 마이그레이션 (두 hook) | ✓           | ✓   |

### Real CLI

`COGAIR_E2E_REAL_CLI=1` 시:

- gemini-cli `model: 'low'` smoke — status·UUID·provider shape
- codex-cli `model: 'low'` smoke — 동일
