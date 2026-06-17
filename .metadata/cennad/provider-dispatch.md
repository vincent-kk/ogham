# Provider Dispatch — codex-cli / gemini-cli / agy (Antigravity CLI)

`dispatcher/` 모듈은 검증된 `~/.claude/skills/codex-call/scripts/codex_call.mjs` 와 `gemini_call.mjs` 의 동작·envelope·exit code 처리를 TypeScript 로 재구현한다. 코드를 그대로 복사하지 않고 인터페이스만 보존한다.

gemini 와 antigravity 는 상호 배타적인 Google 엔진이다. Gemini CLI 서비스가 2026-06-18 에 종료되므로 cennad 는 Antigravity CLI(`agy`) 로 전환한다. 두 엔진이 동시에 활성화될 수 없으며 config validation 및 settings UI 가 이를 강제한다.

## 공통 dispatcher 인터페이스

```typescript
interface ConversationOptions {
  multi_agent?: boolean;
  // 향후 확장 — search, sandbox, image, input_file 등.
}

interface DispatchOptions<F> {
  prompt: string;
  model: "high" | "mid" | "low";
  options: ConversationOptions; // 기본 {}
  sessionId: string; // cennad UUID (메타 키)
  cwd: string;
  flags: F;
  modelMap?: TierModelMap;
  spawnTimeoutMs?: number;
}

interface Dispatcher<F> {
  readonly supportedOptions: ReadonlySet<keyof ConversationOptions>;
  start(args: DispatchOptions<F>): Promise<DispatchResult>;
  resume(
    args: DispatchOptions<F> & { externalSessionRef: string },
  ): Promise<DispatchResult>;
}

interface DispatchResult {
  status: "success" | "failure";
  response: string | null;
  error: ConversationError | null;
  externalSessionRef: string; // 신규 또는 기존 — 항상 명시
  ignoredOptions: string[]; // supportedOptions 에 없던 키들
  resolvedModel: string | null;
}
```

`dispatcher/index.ts` 가 `{ codex, gemini, antigravity }` 세 dispatcher 를 export. `dispatcher/operations/dispatchers.ts` 의 `dispatchers` 맵이 provider 키로 인덱싱. 도구 핸들러는 `dispatchers[provider].start(...)` / `.resume(...)` 호출 후 `dispatcher/entities/envelope.ts` 의 `buildResponse` 로 `ConversationResponse` 직조.

### Options 화이트리스트 (v1)

v1 에서 세 provider 모두 `supportedOptions` 가 비어 있다. 사용자가 `multi_agent: true` 를 보내도 dispatcher 가 `ignoredOptions = ['multi_agent']` 로 보고 + 정상 처리 진행. 후속 이슈에서 각 provider 의 실제 multi-agent 기능을 조사해 화이트리스트에 추가.

## Codex dispatcher

### Spawn

- 실행: `codex exec --skip-git-repo-check --json [--sandbox <mode>] [--yolo] [-c model_reasoning_effort=<v>] <prompt>`.
- `--ask-for-approval never` 는 제거됨 — codex-cli 가 `exec` 모드에서 해당 플래그를 거부한다.
- Sandbox 기본값: `read-only`. `yolo` / `sandbox` 플래그는 설정의 `option_flags` 를 통해 config-driven 으로 전달된다.
- `--json` 플래그는 JSONL 스트리밍을 활성화하여 envelope 파싱에 사용된다.
- `cwd` = 호출 시점 `process.cwd()`. codex 의 `.codex-tasks/` 자체 분리는 cennad 가 관리하지 않음 — cennad `session_id` 가 thread UUID 역할.

### JSONL 파싱

- codex-cli 가 stdout 으로 JSONL 이벤트 스트림 출력.
- 첫 `thread.started` 이벤트의 `thread_id` → `externalSessionRef`.
- 마지막 `agent.message` / `agent.complete` 의 텍스트 → `response`.
- 에러 이벤트는 `errorMap.ts` 에 따라 매핑.

### Resume

- `codex exec resume --json [-c model_reasoning_effort=<v>] <externalSessionRef> <prompt>`.
- Resume 은 `--sandbox`, `--search`, `--cd` 를 받지 않는다 (codex 0.132). dispatcher 가 자동으로 플래그를 제거.

### Tier 매핑 — `dispatcher/codex/operations/reasoningEffort.ts`

codex 는 단일 코딩 모델(`codex debug models` 기준 기본 `medium`)을 쓰고, tier 는 모델명이 아니라 reasoning effort 로 매핑한다.

```typescript
function resolveCodexEffort(alias: ModelAlias): string | null {
  switch (alias) {
    case ModelAlias.High:
      return "high";
    case ModelAlias.Mid:
      return "medium";
    case ModelAlias.Low:
      return "low";
  }
}
// effort → `-c model_reasoning_effort=<effort>` 로 주입한다.
```

## Gemini dispatcher

> Gemini CLI 서비스는 2026-06-18 종료 예정. 신규 프로젝트는 Antigravity dispatcher 를 사용한다.

### Spawn

- 환경 변수: `GEMINI_CLI_TRUST_WORKSPACE=true` 강제.
- 실행: `gemini -p "<prompt>" [-m <model>]`.
- cwd 는 `~/.claude/plugins/cennad/runtime/gemini-cwd/<sessionId>/`. 세션마다 격리 (한 디렉토리에 여러 세션 인덱스가 섞이지 않도록).

### Session 매핑

- gemini-cli 는 `--resume <integer>` 만 지원 (UUID 아님).
- `start` 호출:
  1. `gemini -p ...` 를 `gemini-cwd/<sessionId>/` 에서 실행.
  2. 직후 같은 cwd 에서 `gemini --list-sessions` 실행, 가장 최근 session 의 integer index → `externalSessionRef`.
- `resume` 호출:
  1. `SessionMeta` 의 `cwd` 가 아니라, 보관된 sessionId 로 `gemini-cwd/<sessionId>/` 진입.
  2. `gemini --list-sessions` 다시 실행 (index 가 재정렬될 수 있음).
  3. `externalSessionRef` 기반 현재 index 해결 후 `gemini --resume <index> -p "<prompt>"`.
- 세션 TTL 만료 시 `gemini-cwd/<sessionId>/` 디렉토리도 함께 삭제 (cennad 가 만든 디렉토리이므로 안전).

### Model alias 매핑

```typescript
function resolveGeminiModel(alias: ModelAlias): string | null {
  switch (alias) {
    case "high":
      return process.env.CENNAD_GEMINI_HIGH ?? "pro";
    case "mid":
      return process.env.CENNAD_GEMINI_MID ?? "flash";
    case "low":
      return process.env.CENNAD_GEMINI_LOW ?? "flash-lite";
  }
}
// gemini-cli 가 인식하는 short alias (pro / flash / flash-lite) 를 그대로 전달.
```

## Antigravity dispatcher

### Spawn

- 실행: `agy -p "<prompt>" [--dangerously-skip-permissions] [--model=<model>]`.
- cwd 는 `~/.claude/plugins/cennad/runtime/antigravity-cwd/<sessionId>/`. 세션마다 격리.
- agy 는 `--output-format` 플래그가 없어(1.x 가 미정의 플래그로 거부) plain text 를 출력 — `parseJsonOutput` 가 text/json 모두 파싱. 모델은 `--model=<name>` (등호; `-m` 별칭 없음).
- Sandbox: 미부착. `flags.sandbox` 는 스키마에 남되 항상 false — 복원 게이트는 #76 종결 ([agy-upstream-watch.md](./agy-upstream-watch.md)). `flags.skip_permissions` → `--dangerously-skip-permissions`.

### Session 매핑

agy 는 `--print` 모드에서 conversation id 를 노출하지 않는다 (Issue #7, open). cennad 는 세션당 격리된 cwd 를 session handle 로 사용한다 — `--continue` 가 cwd-scoped 로 동작함(교차 세션 누출 없음)을 실측 확인.

- `start` 호출: `ensureCwd(sessionId)` 로 `antigravity-cwd/<sessionId>/` 생성 후 실행. `externalSessionRef` = cwd 경로.
- `resume` 호출: `--continue -p "<prompt>" ...` 형태로 실행. `ensureCwd(sessionId)` 가 결정론적으로 동일 경로를 반환하므로, 저장된 `externalSessionRef` 와 항상 일치.
- start 타임아웃 시 해당 cwd 삭제 (세션 히스토리 없음). resume 타임아웃 시 cwd 보존 (히스토리 손실 방지 — `--continue` 가 빈 디렉토리에서 새 대화를 시작할 수 있기 때문).

### stdout 파싱 — Issue #76 대응

`agy -p` 가 non-TTY(파이프/서브프로세스) 환경에서 stdout 을 무음으로 버리거나 행에 걸릴 수 있는 버그(Issue #76, open — 1.0.7 에서도 행 변종 재현, 추적: [agy-upstream-watch.md](./agy-upstream-watch.md)). 3단계 폴백:

1. **JSON 파싱**: stdout 비어 있지 않으면 `response`/`output`/`text`/`message`/`result` 키를 순서대로 탐색. plain text 이면 그대로 반환.
2. **Transcript 폴백**: `resolveTranscript(cwd, since)` → `agyTranscriptStore` 가 agy brain transcript(JSONL)에서 읽기 전용으로 복구.
3. **cli_error**: 두 단계 모두 실패하면 Issue #76 메시지를 포함한 `cli_error` 반환.

### Model alias 매핑 — `dispatcher/antigravity/operations/modelAlias.ts`

codex/gemini 와 달리 환경변수 fallback 없음. 모델 전체 이름은 config `model_map.antigravity` 에서만 가져온다.

```typescript
function resolveAntigravityModel(
  alias: ModelAlias,
  map: TierModelMap | undefined,
): string | null {
  if (!map) return null;
  const name = map[alias];
  return name && name.trim().length > 0 ? name : null;
}
// null → --model 플래그 생략 (agy 기본값). map 미설정 시 항상 null.
```

`config.model_map.antigravity` 는 `{ high, mid, low }` per-tier 매핑. 사용 가능한 모델 전체 이름은 settings UI 드롭다운에서 확인한다.

### core/agyModels — 모델 캐시

`agy models` 결과를 1시간 TTL 캐시(`~/.claude/plugins/cennad/agy-models.json`)로 관리.

- `getAvailableModels()`: 캐시 유효 시 반환, 만료 시 `refreshModels()` 호출. refresh 실패 시 stale 캐시 → 빈 배열 순서로 degradation.
- `refreshModels(now)`: `agy models` 를 15초 타임아웃으로 spawn. 성공 시 파싱 후 원자적 캐시 기록. 실패 시 빈 배열 반환 (throw 없음).

## Envelope 빌더 — `dispatcher/entities/envelope.ts`

```typescript
function buildResponse(args: {
  sessionId: string;
  provider: "gemini" | "codex" | "antigravity" | null;
  result: DispatchResult;
  turn: number;
  createdAt: string;
  startedAt: number; // performance.now()
  artifactPath?: string;
}): ConversationResponse;
```

- `elapsed_ms` = `Math.round(performance.now() - startedAt)`.
- `created_at` 은 ISO 8601 UTC.
- `meta.ignored_options` 는 `result.ignoredOptions` 그대로 전달.
- `artifact_path` 는 값이 있을 때만 포함.

## Error mapping — `dispatcher/errorMap.ts`

| 신호                                   | code                                                                         |
| -------------------------------------- | ---------------------------------------------------------------------------- |
| exit 127 / `ENOENT`                    | `cli_error` (CLI not on PATH)                                                |
| exit 42 (codex bad args)               | `cli_error`                                                                  |
| exit 53 (gemini turn limit on resume)  | `budget_exhausted`. cennad 매핑 삭제. 외부 CLI 자체 세션 파일은 손대지 않음. |
| exit 55 (gemini untrusted workspace)   | `auth`                                                                       |
| exit 73 (lock busy)                    | `cli_error`                                                                  |
| HTTP 401 / 403 in stderr               | `auth`                                                                       |
| HTTP 429 in stderr                     | `rate_limit`                                                                 |
| `ECONNRESET`, `ETIMEDOUT`, `ENOTFOUND` | `network`                                                                    |
| 그 외                                  | `unknown`                                                                    |

codex / gemini / antigravity 세 provider 가 동일한 errorMap 을 공유한다.

## Provider 상호 배타성 (gemini ↔ antigravity)

`config.ratio.gemini.enabled` 와 `config.ratio.antigravity.enabled` 는 동시에 true 일 수 없다.

- **ConfigSchema**: `superRefine` 으로 동시 활성화 시 `antigravity.enabled` 경로에 `ZodIssue` 추가.
- **normalizeMutualExclusion** (`configManager/utils`): 파일에서 로드 시 두 플래그가 모두 true 이면 antigravity 를 우선해 gemini 를 비활성화 (마이그레이션 대상 엔진 우선).
- **activeGoogleEngine** (`hooks/shared`): 훅이 설정을 직접 읽으므로 방어적 해결 — antigravity 가 enabled 이면 우선 반환.
- **Settings UI**: Google Engine 토글(gemini/antigravity)이 라디오 그룹으로 표시되어 하나만 선택 가능. per-tier model 드롭다운은 선택된 Google Engine 에 따라 전환됨.

## 동시성

- v1: 동일 `sessionId` 에 대한 동시 호출은 MCP 단일 프로세스라 자연스럽게 직렬화. 별도 락 없음.
- 다중 cennad 클라이언트 시나리오는 v1 비범위.

## MCP 도구 목록 (3개)

| 도구                    | 역할                                       |
| ----------------------- | ------------------------------------------ |
| `start_conversation`    | 신규 세션 시작, provider 선택, prompt 전달 |
| `continue_conversation` | 기존 세션 재개 (`externalSessionRef` 기반) |
| `open_settings`         | 설정 웹 UI 오픈 (로컬 HTTP 서버)           |

## 미채택 기능 (codex-call/gemini-call 대비)

- `--task` 디렉토리 격리 — cennad `sessionId` 가 그 역할 수행.
- `--ttl-days`, `--cleanup`, `--end`, `--list` 유지보수 CLI — cennad 가 TTL 자체 관리.
- 입력 파일(`--input-file`), 이미지(`--image`) 첨부 — v1 비범위. `options` 객체에 추가 자리 마련.
- 외부 wrapper `sessions.json` 매핑 스토어 — cennad `SessionMeta` 가 대체.
- 외부 CLI 자체 세션 파일 정리 — 외부 CLI 의 자체 관리에 위임.
