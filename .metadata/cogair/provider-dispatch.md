# Provider Dispatch — codex-cli / gemini-cli

`dispatcher/` 모듈은 검증된 `~/.claude/skills/codex-call/scripts/codex_call.mjs` 와 `gemini_call.mjs` 의 동작·envelope·exit code 처리를 TypeScript 로 재구현한다. 코드를 그대로 복사하지 않고 인터페이스만 보존한다.

## 공통 dispatcher 인터페이스

```typescript
interface DispatchOptions {
  prompt: string;
  model: 'high' | 'mid' | 'low' | 'auto';
  multi_agent: boolean;
  session_id: string;             // cogair UUID (메타 키)
  cwd: string;
}

interface Dispatcher {
  start(options: DispatchOptions): Promise<ConversationResponse>;
  resume(options: DispatchOptions & { external_session_ref: string }): Promise<ConversationResponse>;
}
```

`dispatcher/index.ts` 가 `{ codex: Dispatcher, gemini: Dispatcher }` 를 export. 도구 핸들러는 `dispatchers[provider].start(...)` / `.resume(...)` 호출.

## Codex dispatcher

### Spawn

- 실행: `codex exec --skip-git-repo-check --ask-for-approval never --sandbox <mode> [-m <model>] [--search] <prompt>`.
- Sandbox 기본값: `read-only`. `multi_agent=true` 이면 `workspace-write` (codex 가 자식 에이전트 띄우려면 쓰기 필요).
- `--search` 는 본 플러그인 v1 에서 비노출 (cogair `--search` 인자 없음. 필요 시 후속 추가).
- `cwd` = 호출 시점 `process.cwd()`. codex 의 `.codex-tasks/` 분리는 **cogair 가 관리하지 않음** — cogair 의 `session_id` 가 thread UUID 역할을 한다.

### JSONL 파싱

- codex-cli 가 stdout 으로 JSONL 이벤트 스트림 출력.
- 첫 `thread.started` 이벤트의 `thread_id` 를 `external_session_ref` 로 저장.
- 마지막 `agent.message` 또는 `agent.complete` 의 텍스트를 `response` 로 사용.
- 에러 이벤트는 `error-map.ts` 에 따라 `ConversationResponse.error` 로 매핑.

### Resume

- `codex exec resume <external_session_ref> <prompt>`.
- 주의: resume 은 `--sandbox`, `--search`, `--cd` 를 받지 않는다 (codex 0.132 기준). dispatcher 가 이 플래그들을 제거한다.

### Model alias 매핑

`model-alias.ts`:

```typescript
const CODEX_MODEL_MAP: Record<string, string> = {
  high: process.env.COGAIR_CODEX_HIGH ?? 'gpt-5-codex',
  mid:  process.env.COGAIR_CODEX_MID  ?? 'gpt-5.1-codex',
  low:  process.env.COGAIR_CODEX_LOW  ?? 'o3',
};
// 'auto' → -m 플래그 자체 생략
```

## Gemini dispatcher

### Spawn

- 환경 변수: `GEMINI_CLI_TRUST_WORKSPACE=true` 강제 (gemini-call 동일).
- 실행: `gemini -p "<prompt>" [-m <model>]`.
- `multi_agent` 는 v1 에서 동작 미정 — gemini-cli 의 multi-agent 옵션이 정착하면 추가. 현재는 로그에 "ignored" 표기만 하고 통과.

### Session 매핑

- gemini-cli 는 `--resume <integer>` 만 지원 (UUID 아님).
- `start_conversation` 호출 시:
  1. dispatcher 가 `gemini -p ...` 를 새 디렉토리 (`~/.claude/plugins/cogair/runtime/gemini-cwd/<session_id>/`) 에서 실행.
  2. 직후 같은 디렉토리에서 `gemini --list-sessions` 실행, 가장 최근 session 의 integer index 를 `external_session_ref` 로 저장.
- `continue_conversation` 호출 시:
  1. `SessionMeta` 에서 보관된 `cwd` (gemini-cwd 디렉토리) 로 이동.
  2. `gemini --list-sessions` 다시 실행 (index 가 재정렬될 수 있음).
  3. UUID → 현재 index 해결 후 `gemini --resume <index> -p "<prompt>"`.
- `gemini-cwd/<session_id>/` 디렉토리는 세션 TTL 만료 시 dispatcher 가 함께 정리.

### Model alias 매핑

```typescript
const GEMINI_MODEL_MAP: Record<string, string> = {
  high: process.env.COGAIR_GEMINI_HIGH ?? 'gemini-2.5-pro',
  mid:  process.env.COGAIR_GEMINI_MID  ?? 'gemini-2.5-flash',
  low:  process.env.COGAIR_GEMINI_LOW  ?? 'gemini-2.5-flash-lite',
};
// 'auto' → -m 플래그 생략
```

## Envelope 빌더 — `dispatcher/envelope.ts`

```typescript
function buildResponse(args: {
  session_id: string;
  provider: 'gemini' | 'codex';
  status: 'success' | 'failure';
  response: string | null;
  error: ConversationResponse['error'];
  turn: number;
  created_at: string;
  started_at: number;       // performance.now()
}): ConversationResponse
```

- `elapsed_ms` = `performance.now() - started_at` (정수로 반올림).
- `created_at` 은 ISO 8601 UTC.

## Error mapping — `dispatcher/error-map.ts`

| 신호 | code |
|---|---|
| exit 127 / `ENOENT` | `cli_error` (CLI not on PATH) |
| exit 42 (codex bad args) | `cli_error` |
| exit 53 (gemini turn limit on resume) | `budget_exhausted`. 메타 삭제. |
| exit 55 (gemini untrusted workspace) | `auth` |
| exit 73 (lock busy) | `cli_error` |
| HTTP 401 / 403 in stderr | `auth` |
| HTTP 429 in stderr | `rate_limit` |
| `ECONNRESET`, `ETIMEDOUT`, `ENOTFOUND` | `network` |
| 그 외 | `unknown` |

## 동시성

- v1: 동일 `session_id` 에 대한 동시 호출은 MCP 단일 프로세스라 자연스럽게 직렬화. 별도 락 없음.
- 다중 cogair 클라이언트 시나리오는 v1 비범위.

## 미채택 기능 (codex-call/gemini-call 대비)

- `--task` 디렉토리 격리 — cogair `session_id` 가 그 역할 수행.
- `--ttl-days`, `--cleanup`, `--end`, `--list` 유지보수 CLI — cogair 가 TTL 자체 관리.
- 입력 파일(`--input-file`), 이미지(`--image`) 첨부 — v1 비범위. 후속 이슈로.
- 외부 wrapper `sessions.json` 매핑 스토어 — cogair `SessionMeta` 가 대체.
