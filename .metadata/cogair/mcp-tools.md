# MCP Tools — `tools` server

MCP 서버 이름: `tools`. 도구는 3개. 모든 도구는 `wrapHandler` 로 감싸 표준 에러 응답을 보장한다.

도구 인자 이름은 `snake_case` 를 유지한다 (외부 LLM 이 호출하는 인터페이스 — atlassian 의 `base_url`, `query_params` 등과 동일 컨벤션). 내부 TypeScript 타입과 변수는 `camelCase`.

## 1. `start_conversation`

새로운 외부 LLM 대화를 시작한다.

### 입력 스키마 (Zod)

```typescript
z.object({
  provider: z.enum(['gemini', 'codex']),
  prompt: z.string().min(1),
  model: z.enum(['high', 'mid', 'low', 'auto']).optional(),
  options: z.object({
    multi_agent: z.boolean().optional(),
    // 확장 자리: 추후 search, sandbox, image, input_file 등.
  }).optional(),
})
```

| 인자 | 필수 | 기본값 |
|---|---|---|
| `provider` | O | — |
| `prompt` | O | — |
| `model` | X | `config.default_model` |
| `options` | X | `config.default_options` (없으면 `{}`) |

### `options` 객체 — provider별 지원 매트릭스

| 옵션 | codex | gemini | v1 동작 |
|---|---|---|---|
| `multi_agent` | unsupported* | unsupported* | dispatcher 가 화이트리스트에 없는 옵션을 발견하면 무시하고 `meta.ignored_options[]` 로 보고 |

\* codex-cli, gemini-cli 모두 v1 시점 네이티브 multi-agent 옵션이 명확히 정의돼 있지 않다. 인터페이스만 미리 열어두고 dispatcher 는 지원 옵션 화이트리스트에 따라 사용/무시한다 (사용자 결정).

각 dispatcher 의 `supportedOptions` 집합은 `dispatcher/<provider>/index.ts` 에 선언. 새 옵션을 켜려면:

1. `types/conversation.ts` 의 `ConversationOptions` 에 필드 추가.
2. 해당 dispatcher 의 `supportedOptions` 에 키 추가.
3. dispatcher 가 spawn 인자 또는 환경 변수로 매핑.

### 출력

`ConversationResponse` (아래 공통 스키마). `meta.ignored_options` 에 dispatcher 가 인식하지 못한 키들이 배열로 표시.

### 사이드 이펙트

- 신규 `session_id` 발급 (UUIDv4).
- `~/.claude/plugins/cogair/sessions/<project_hash>/<session_id>.json` 생성. `cwd`, `project_hash` 모두 메타에 기록.
- `~/.claude/plugins/cogair/runtime/counter.json` 의 provider 카운터 +1 (시도 기준).
- 외부 CLI 실패 시에도 `session_id` 는 유지.

### Annotations

`readOnlyHint: false, destructiveHint: false, idempotentHint: false`

## 2. `continue_conversation`

기존 외부 세션을 이어 호출한다.

### 입력 스키마

```typescript
z.object({
  session_id: z.string().uuid(),
  prompt: z.string().min(1),
})
```

### 동작

1. 현재 `process.cwd()` 의 `project_hash` 를 계산.
2. `sessionStore.get(project_hash, session_id)` 로 `SessionMeta` 조회.
3. **세션이 현재 `project_hash` 에 없으면 `error.code = 'unknown'` 반환** — 다른 cwd 의 세션은 자동으로 찾지 않는다 (사용자 결정: session/project 경계를 엄격히 유지).
4. `provider`, `external_session_ref` 추출.
5. provider별 dispatcher 의 `resume({ externalSessionRef, prompt })` 호출.
6. 성공 시 `last_used_at`, `turn_count` 갱신.
7. 카운터 +1 (시도 기준).

### 응답

`ConversationResponse`. `session_id` 는 입력과 동일.

`error.code` 값:
- `unknown`: 세션이 현재 프로젝트에 없음 (cwd 불일치 포함).
- `budget_exhausted` / `rate_limit` / `auth` / `network` / `cli_error`: 외부 CLI 실패.

## 3. `open_settings`

설정용 로컬 웹 UI 를 기동한다.

### 입력 스키마

```typescript
z.object({})
```

### 동작

1. `~/.claude/plugins/cogair/runtime/settings_server.json` 확인. 이미 동작 중이고 5분 이내면 기존 URL 재사용 (`reused: true`).
2. 아니면 `127.0.0.1:0` 으로 새 서버 기동, one-time token 발급.
3. 응답으로 접속 URL 반환. `?token=<...>` 쿼리 포함.
4. Headless 가 아니면 OS 브라우저 자동 오픈 시도. 실패해도 URL 반환.
5. 5분 idle / 사용자 "저장 후 닫기" / MCP 종료 시 서버 종료.

### 출력

```typescript
{
  url: string,           // http://127.0.0.1:<port>/?token=<...>
  message: string,
  reused: boolean,
}
```

### Annotations

`readOnlyHint: false, destructiveHint: false, idempotentHint: false`

## 공통 응답 스키마 — `ConversationResponse`

```typescript
interface ConversationResponse {
  status: 'success' | 'failure';
  session_id: string;
  provider: 'gemini' | 'codex';
  response: string | null;
  error: {
    code: 'budget_exhausted' | 'rate_limit' | 'auth' | 'network' | 'cli_error' | 'unknown';
    message: string;
  } | null;
  meta: {
    turn: number;
    created_at: string;       // ISO 8601
    elapsed_ms: number;
    ignored_options: string[]; // dispatcher 가 인식 못 한 옵션 키들 (정상 동작)
  };
}
```

- MCP envelope: `toolResult({ ...ConversationResponse })` 로 텍스트 JSON 직렬화.
- `toolError` 는 dispatcher 가 envelope 빌드도 못 한 비정상 상황에만 사용.

## 도구 설명 컨벤션

내부 도구로 LLM 라우팅용 짧은 description:

- `start_conversation`: "Start a new external LLM session via gemini or codex CLI."
- `continue_conversation`: "Continue an existing external LLM session by session_id."
- `open_settings`: "Open the cogair settings UI in a local browser."
