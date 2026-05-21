# MCP Tools — `tools` server

MCP 서버 이름: `tools` (`.mcp.json` 에 동일하게). 도구는 3개. 모든 도구는 `wrapHandler` 로 감싸 표준 에러 응답을 보장한다.

## 1. `start_conversation`

새로운 외부 LLM 대화를 시작한다.

### 입력 스키마 (Zod)

```typescript
z.object({
  provider: z.enum(['gemini', 'codex']),
  prompt: z.string().min(1),
  model: z.enum(['high', 'mid', 'low', 'auto']).optional(),
  multi_agent: z.boolean().optional(),
})
```

| 인자 | 필수 | 기본값 |
|---|---|---|
| `provider` | O | — |
| `prompt` | O | — |
| `model` | X | `config.default_model` |
| `multi_agent` | X | `config.default_multi_agent` |

### 출력 (`ConversationResponse`)

`provider`, `model`, `multi_agent` 를 모두 dispatcher 입력으로 사용. 모델 alias 는 dispatcher 가 provider별 실제 모델 ID로 매핑.

### 사이드 이펙트

- 신규 `session_id` 발급 (UUIDv4).
- `~/.claude/plugins/cogair/sessions/<project_hash>/<session_id>.json` 생성.
- `~/.claude/plugins/cogair/runtime/counter.json` 의 provider 카운터 +1.
- 외부 CLI 실패 시에도 `session_id` 는 유지 (재시도 슬롯).

### Annotations

```
readOnlyHint: false, destructiveHint: false, idempotentHint: false
```

## 2. `continue_conversation`

기존 외부 세션을 이어 호출한다.

### 입력 스키마

```typescript
z.object({
  session_id: z.string().uuid(),
  prompt: z.string().min(1),
})
```

| 인자 | 필수 |
|---|---|
| `session_id` | O |
| `prompt` | O |

### 동작

1. `session-store.get(session_id)` 로 `SessionMeta` 조회. 없으면 `error.code = 'unknown'` 반환.
2. `provider`, `external_session_ref` 를 메타에서 추출.
3. provider별 dispatcher 의 `resume(external_session_ref, prompt)` 호출.
4. 성공 시 `last_used_at`, `turn_count` 갱신.
5. `counter` provider 카운터 +1 (시도 기준).

### 출력

`start_conversation` 과 동일한 `ConversationResponse`. `session_id` 는 입력과 동일.

## 3. `open_settings`

설정용 로컬 웹 UI 를 기동한다.

### 입력 스키마

```typescript
z.object({})  // 인자 없음
```

### 동작

1. `~/.claude/plugins/cogair/runtime/settings_server.json` 확인. 이미 동작 중이고 5분 이내면 기존 URL 재사용.
2. 아니면 `127.0.0.1:0` 으로 새 서버 기동, one-time token 발급.
3. 응답으로 접속 URL 반환. `?token=<...>` 쿼리 포함.
4. Headless 가 아니면 OS 브라우저 자동 오픈 시도. 실패해도 URL 은 반환.
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

```
readOnlyHint: false, destructiveHint: false, idempotentHint: false
```

## 공통 응답 스키마

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
    created_at: string;
    elapsed_ms: number;
  };
}
```

- MCP 응답 envelope 은 `toolResult({ ...ConversationResponse })` 로 감싸 텍스트 JSON 으로 직렬화.
- `toolError` 는 dispatcher 가 envelope 을 빌드하지 못한 비정상 상황에만 사용.

## 도구 설명 컨벤션

내부 도구는 사용자 메모리 `feedback_mcp_tool_descriptions.md` 에 따라 간결 + `[Internal]` 접두 없이 짧게. Skill 이 직접 호출하므로 description 은 LLM 라우팅용으로만 짧게 작성. 예:

- `start_conversation`: "Start a new external LLM session via gemini or codex CLI."
- `continue_conversation`: "Continue an existing external LLM session by session_id."
- `open_settings`: "Open the cogair settings UI in a local browser."
