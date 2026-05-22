# Provider Dispatch — codex-cli / gemini-cli

`dispatcher/` 모듈은 검증된 `~/.claude/skills/codex-call/scripts/codex_call.mjs` 와 `gemini_call.mjs` 의 동작·envelope·exit code 처리를 TypeScript 로 재구현한다. 코드를 그대로 복사하지 않고 인터페이스만 보존한다.

## 공통 dispatcher 인터페이스

```typescript
interface ConversationOptions {
  multi_agent?: boolean;
  // 향후 확장 — search, sandbox, image, input_file 등.
}

interface DispatchOptions {
  prompt: string;
  model: 'high' | 'mid' | 'low' | 'auto';
  options: ConversationOptions;       // 기본 {}
  sessionId: string;                  // cogair UUID (메타 키)
  cwd: string;
}

interface Dispatcher {
  readonly supportedOptions: ReadonlySet<keyof ConversationOptions>;
  start(args: DispatchOptions): Promise<DispatchResult>;
  resume(args: DispatchOptions & { externalSessionRef: string }): Promise<DispatchResult>;
}

interface DispatchResult {
  status: 'success' | 'failure';
  response: string | null;
  error: ConversationResponse['error'];
  externalSessionRef: string;         // 신규 또는 기존 — 항상 명시
  ignoredOptions: string[];           // supportedOptions 에 없던 키들
}
```

`dispatcher/index.ts` 가 `{ codex: Dispatcher, gemini: Dispatcher }` 를 export. 도구 핸들러는 `dispatchers[provider].start(...)` / `.resume(...)` 호출 후 `dispatcher/envelope.ts` 의 `buildResponse` 로 `ConversationResponse` 직조.

### Options 화이트리스트 (v1)

```typescript
// dispatcher/codex/index.ts
const supportedOptions = new Set<keyof ConversationOptions>([]);   // 비어 있음

// dispatcher/gemini/index.ts
const supportedOptions = new Set<keyof ConversationOptions>([]);   // 비어 있음
```

v1 에서는 양쪽 모두 비어 있다. 사용자가 `multi_agent: true` 를 보내도 dispatcher 가 `ignoredOptions = ['multi_agent']` 로 보고 + 정상 처리 진행. 후속 이슈에서 각 provider 의 실제 multi-agent 기능을 조사해 화이트리스트에 추가.

## Codex dispatcher

### Spawn

- 실행: `codex exec --skip-git-repo-check --ask-for-approval never --sandbox read-only [-m <model>] <prompt>`.
- Sandbox 기본값: `read-only` 고정. v1 에서는 옵션으로 노출하지 않는다.
- `cwd` = 호출 시점 `process.cwd()`. codex 의 `.codex-tasks/` 자체 분리는 cogair 가 관리하지 않음 — cogair `session_id` 가 thread UUID 역할.

### JSONL 파싱

- codex-cli 가 stdout 으로 JSONL 이벤트 스트림 출력.
- 첫 `thread.started` 이벤트의 `thread_id` → `externalSessionRef`.
- 마지막 `agent.message` / `agent.complete` 의 텍스트 → `response`.
- 에러 이벤트는 `errorMap.ts` 에 따라 매핑.

### Resume

- `codex exec resume <externalSessionRef> <prompt>`.
- Resume 은 `--sandbox`, `--search`, `--cd` 를 받지 않는다 (codex 0.132). dispatcher 가 자동으로 플래그를 제거.

### Model alias 매핑 — `dispatcher/codex/modelAlias.ts`

```typescript
function resolveCodexModel(alias: ModelAlias): string | null {
  switch (alias) {
    case 'high': return process.env.COGAIR_CODEX_HIGH ?? null;
    case 'mid':  return process.env.COGAIR_CODEX_MID  ?? null;
    case 'low':  return process.env.COGAIR_CODEX_LOW  ?? null;
    case 'auto': return null;
  }
}
// null → -m 플래그 자체 생략 (codex-cli 기본값). env 미설정 시 모든 tier 가 default 로 fallback.
```

## Gemini dispatcher

### Spawn

- 환경 변수: `GEMINI_CLI_TRUST_WORKSPACE=true` 강제.
- 실행: `gemini -p "<prompt>" [-m <model>]`.
- cwd 는 `~/.claude/plugins/cogair/runtime/gemini-cwd/<sessionId>/`. 세션마다 격리 (한 디렉토리에 여러 세션 인덱스가 섞이지 않도록).

### Session 매핑

- gemini-cli 는 `--resume <integer>` 만 지원 (UUID 아님).
- `start` 호출:
  1. `gemini -p ...` 를 `gemini-cwd/<sessionId>/` 에서 실행.
  2. 직후 같은 cwd 에서 `gemini --list-sessions` 실행, 가장 최근 session 의 integer index → `externalSessionRef`.
- `resume` 호출:
  1. `SessionMeta` 의 `cwd` 가 아니라, 보관된 sessionId 로 `gemini-cwd/<sessionId>/` 진입.
  2. `gemini --list-sessions` 다시 실행 (index 가 재정렬될 수 있음).
  3. `externalSessionRef` 기반 현재 index 해결 후 `gemini --resume <index> -p "<prompt>"`.
- 세션 TTL 만료 시 `gemini-cwd/<sessionId>/` 디렉토리도 함께 삭제 (cogair 가 만든 디렉토리이므로 안전).

### Model alias 매핑

```typescript
function resolveGeminiModel(alias: ModelAlias): string | null {
  switch (alias) {
    case 'high': return process.env.COGAIR_GEMINI_HIGH ?? 'pro';
    case 'mid':  return process.env.COGAIR_GEMINI_MID  ?? 'flash';
    case 'low':  return process.env.COGAIR_GEMINI_LOW  ?? 'flash-lite';
    case 'auto': return null;
  }
}
// gemini-cli 가 인식하는 short alias (pro / flash / flash-lite) 를 그대로 전달. 'auto' → -m 생략.
```

## Envelope 빌더 — `dispatcher/envelope.ts`

```typescript
function buildResponse(args: {
  sessionId: string;
  provider: 'gemini' | 'codex';
  result: DispatchResult;
  turn: number;
  createdAt: string;
  startedAt: number;       // performance.now()
}): ConversationResponse
```

- `elapsed_ms` = `Math.round(performance.now() - startedAt)`.
- `created_at` 은 ISO 8601 UTC.
- `meta.ignored_options` 는 `result.ignoredOptions` 그대로 전달.

## Error mapping — `dispatcher/errorMap.ts`

| 신호 | code |
|---|---|
| exit 127 / `ENOENT` | `cli_error` (CLI not on PATH) |
| exit 42 (codex bad args) | `cli_error` |
| exit 53 (gemini turn limit on resume) | `budget_exhausted`. cogair 매핑 삭제. 외부 CLI 자체 세션 파일은 손대지 않음. |
| exit 55 (gemini untrusted workspace) | `auth` |
| exit 73 (lock busy) | `cli_error` |
| HTTP 401 / 403 in stderr | `auth` |
| HTTP 429 in stderr | `rate_limit` |
| `ECONNRESET`, `ETIMEDOUT`, `ENOTFOUND` | `network` |
| 그 외 | `unknown` |

## 동시성

- v1: 동일 `sessionId` 에 대한 동시 호출은 MCP 단일 프로세스라 자연스럽게 직렬화. 별도 락 없음.
- 다중 cogair 클라이언트 시나리오는 v1 비범위.

## 미채택 기능 (codex-call/gemini-call 대비)

- `--task` 디렉토리 격리 — cogair `sessionId` 가 그 역할 수행.
- `--ttl-days`, `--cleanup`, `--end`, `--list` 유지보수 CLI — cogair 가 TTL 자체 관리.
- 입력 파일(`--input-file`), 이미지(`--image`) 첨부 — v1 비범위. `options` 객체에 추가 자리 마련.
- 외부 wrapper `sessions.json` 매핑 스토어 — cogair `SessionMeta` 가 대체.
- 외부 CLI 자체 세션 파일 정리 — 외부 CLI 의 자체 관리에 위임.
