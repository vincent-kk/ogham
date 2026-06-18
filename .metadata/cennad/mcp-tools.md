# MCP Tools — `tools` server

MCP 서버 이름: `tools`. 도구는 3개. 모든 도구는 `wrapHandler` 로 감싸 표준 에러 응답을 보장한다.

도구 인자 이름은 `snake_case` 를 유지한다 (외부 LLM 이 호출하는 인터페이스 — atlassian 의 `base_url`, `query_params` 등과 동일 컨벤션). 내부 TypeScript 타입과 변수는 `camelCase`.

## 1. `start_conversation`

새로운 외부 LLM 대화를 시작한다.

### 입력 스키마 (Zod)

```typescript
z.object({
  provider: z.enum(["gemini", "codex", "antigravity"]),
  prompt: z.string().min(1),
  tier: z.enum(["high", "mid", "low"]).optional(),
});
```

| 인자       | 필수 | 기본값                          |
| ---------- | ---- | ------------------------------- |
| `provider` | O    | —                               |
| `prompt`   | O    | —                               |
| `tier`     | X    | `config.default_tier[provider]` |

`tier` 는 생략 시 provider 별 `config.default_tier` 가 적용된다 (`/setup` UI 에서 codex/gemini/antigravity 각각 설정, 기본 `mid`). 명시하면 그 tier 로 override 한다. tier 가 높을수록 상위 모델·effort 라 비용·rate-limit 이 가파르게 오른다 (`rate_limit` / `budget_exhausted` 의 주원인).

`gemini` 와 `antigravity` 는 상호 배타적인 Google 엔진이다. Gemini CLI 서비스는 2026-06-18 에 종료되며, cennad 는 Antigravity CLI 로 전환한다. `config.ratio` 에서 두 제공자를 동시에 활성화할 수 없다 (`ConfigSchema` superRefine 이 강제). 비활성화된 provider 로 호출하면 `error.code: 'disabled'` 응답을 즉시 반환한다.

### 권한·옵션 (MCP 입력 미노출)

MCP 입력에는 provider별 옵션 필드가 없다. 권한 플래그는 `config.option_flags[provider]` 에서만 결정되며 `/setup` UI 로 조정한다. dispatcher 에는 `options: {}` 가 항상 전달된다 (MCP-facing layer 분리). 따라서 `meta.ignored_options` 는 정상 동작 시 빈 배열이다.

provider별 플래그 스키마:

| provider      | 플래그                               |
| ------------- | ------------------------------------ |
| `gemini`      | `yolo`, `sandbox`, `sandbox_backend` |
| `codex`       | `yolo`, `sandbox`                    |
| `antigravity` | `sandbox`, `skip_permissions`        |

antigravity 의 `sandbox` 는 하위호환용으로 항상 false 취급 — `--sandbox` 를 부착하지 않는다 (#76 종결까지, [agy-upstream-watch.md](./agy-upstream-watch.md)). `skip_permissions` 는 `--dangerously-skip-permissions` 로 매핑된다. sandbox-backend 개념 없음.

### 출력

`ConversationResponse` (아래 공통 스키마).

### 사이드 이펙트

- 신규 `session_id` 발급 (UUIDv4).
- `~/.claude/plugins/cennad/sessions/<project_hash>/<session_id>.json` 생성. `cwd`, `project_hash` 모두 메타에 기록.
- antigravity 는 추가로 `~/.claude/plugins/cennad/antigravity/<session_id>/` (per-session cwd) 를 생성한다. 이 디렉터리가 `externalSessionRef` 이자 agy 대화 컨텍스트의 물리적 경계다.
- `~/.claude/plugins/cennad/runtime/counter.json` 의 provider 카운터 +1 (시도 기준).
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
  tier: z.enum(["high", "mid", "low"]).optional(), // 생략 시 config.default_tier[provider]
});
```

| 인자         | 필수 | 기본값                          |
| ------------ | ---- | ------------------------------- |
| `session_id` | O    | —                               |
| `prompt`     | O    | —                               |
| `tier`       | X    | `config.default_tier[provider]` |

`tier` 는 생략 시 해당 provider 의 `config.default_tier` 가 적용되며, 매 turn 재적용된다 (원 세션 tier 는 복원하지 않는다 — `SessionMeta` 는 구체 모델명을 저장하지 않으므로). start·continue 모두 `tier` 는 optional 이며, 생략 시 동일하게 provider 별 default 로 수렴한다.

### 동작

1. 현재 `process.cwd()` 의 `project_hash` 를 계산.
2. `sessionStore.get(project_hash, session_id)` 로 `SessionMeta` 조회.
3. **세션이 현재 `project_hash` 에 없으면 `error.code = 'unknown'` 반환** — 다른 cwd 의 세션은 자동으로 찾지 않는다 (사용자 결정: session/project 경계를 엄격히 유지).
4. `provider`, `external_session_ref` 추출.
5. provider별 dispatcher 의 `resume({ externalSessionRef, prompt })` 호출.
6. antigravity 는 `external_session_ref` (= per-session cwd) 를 그대로 사용해 `--continue` 로 재개한다. cwd 가 세션 ID 역할을 한다.
7. 성공 시 `last_used_at`, `turn_count` 갱신.
8. 카운터 +1 (시도 기준).

### 응답

`ConversationResponse`. `session_id` 는 입력과 동일.

`error.code` 값:

- `unknown`: 세션이 현재 프로젝트에 없음 (cwd 불일치 포함).
- `disabled`: provider 가 config 에서 비활성화됨.
- `budget_exhausted` / `rate_limit` / `auth` / `network` / `cli_error`: 외부 CLI 실패.

## 3. `open_settings`

설정용 로컬 웹 UI 를 기동한다.

### 입력 스키마

```typescript
z.object({});
```

### 동작

1. `~/.claude/plugins/cennad/runtime/settings_server.json` 확인. 이미 동작 중이고 5분 이내면 기존 URL 재사용 (`reused: true`).
2. 아니면 `127.0.0.1:0` 으로 새 서버 기동, one-time token 발급.
3. 응답으로 접속 URL 반환. `?token=<...>` 쿼리 포함.
4. Headless 가 아니면 OS 브라우저 자동 오픈 시도. 실패해도 URL 반환.
5. 5분 idle / 사용자 "저장 후 닫기" / MCP 종료 시 서버 종료.

설정 UI 는 Google 엔진 토글(gemini ↔ antigravity 상호 배타), provider 별 default tier, antigravity 의 per-tier 모델 드롭다운, 각 provider 의 ratio·keywords·option_flags·preamble·recency_factor·counter 를 제공한다.

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
  status: "success" | "failure";
  session_id: string;
  provider: "gemini" | "codex" | "antigravity";
  response: string | null;
  error: {
    code:
      | "budget_exhausted"
      | "rate_limit"
      | "auth"
      | "network"
      | "cli_error"
      | "disabled"
      | "unknown";
    message: string;
  } | null;
  meta: {
    turn: number;
    created_at: string; // ISO 8601
    elapsed_ms: number;
    ignored_options: string[]; // dispatcher 가 인식 못 한 옵션 키들 (정상 동작)
  };
}
```

- MCP envelope: `toolResult({ ...ConversationResponse })` 로 텍스트 JSON 직렬화.
- `toolError` 는 dispatcher 가 envelope 빌드도 못 한 비정상 상황에만 사용.

## antigravity CLI 동작 세부

`agy` CLI 어댑터(`src/dispatcher/antigravity`)의 핵심 동작:

**호출 형태**: `agy -p <prompt> [--sandbox] [--dangerously-skip-permissions] [--model=<model>]`

**재개**: `agy --continue -p <prompt> ...` — `--print` 모드가 conversation id 를 노출하지 않으므로(Issue #7, open) per-session cwd 격리로 세션 동일성을 보장한다. `externalSessionRef = cwd`.

**출력 파싱**: agy 는 plain text 를 방출한다(`--output-format` 플래그 없음). `parseJsonOutput` 가 JSON 이면 `response`/`output`/`text`/`message`/`result` 키를 순서대로 탐색하고, plain text 면 그대로 반환한다. stdout 이 비어 있으면(Issue #76 — non-TTY subprocess 출력 누락 가능) transcript 폴백을 시도하고, 복구 불가면 `cli_error` 반환.

**cwd 생명주기**: start 성공 → cwd 유지. start timeout → cwd 삭제. resume timeout → cwd 유지(대화 히스토리 보호).

**모델 해석**: `config.model_map.antigravity` 의 `{ high, mid, low }` 매핑으로 tier 를 구체적 모델명으로 변환한다.

## 도구 설명 컨벤션

스킬 비경유 LLM 직접 호출을 지원하도록, 도구 description 은 슬림하게 라우팅 핵심만 담고 입력 스키마는 `.describe()` + enum 으로 자기설명적이게 한다.

- `start_conversation`: provider 선택 기준(codex=code/shell, gemini=web·large-context [종료 예정], antigravity=Claude agent) + self-contained prompt + session_id 반환. tier 는 optional (생략 시 provider 별 default).
- `continue_conversation`: session_id 로 재개, 동일 cwd(project-scoped) 세션만. optional tier 로 해당 turn 모델 지정 (생략 시 provider 별 default).
- `open_settings`: 설정 UI 기동, 인자 없음.

입력 필드는 `.describe()` 로 값의 의미(provider 선택, prompt 자족성, session_id 출처)를 노출한다. 권한 플래그는 description 이 아니라 `config.option_flags` + `/setup` 에서 관리한다.
