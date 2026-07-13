# Provider Dispatch — codex-cli / agy (Antigravity CLI) / claude-code

`dispatcher/` 모듈은 검증된 `~/.claude/skills/codex-call/scripts/codex_call.mjs` 와 `antigravity_call.mjs` 의 동작·envelope·exit code 처리를 TypeScript 로 재구현한다. 코드를 그대로 복사하지 않고 인터페이스만 보존한다.

## 공통 dispatcher 인터페이스

```typescript
interface ConversationOptions {
  multi_agent?: boolean;
  // 향후 확장 — search, sandbox, image, input_file 등.
}

interface DispatchOptions<F> {
  prompt: string;
  tier: "high" | "mid" | "low";
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

`dispatcher/index.ts` 가 `{ codex, antigravity, claude }` 세 dispatcher 를 export. `dispatcher/operations/dispatchers.ts` 의 `dispatchers` 맵이 provider 키로 인덱싱. 도구 핸들러는 `dispatchers[provider].start(...)` / `.resume(...)` 호출 후 `dispatcher/entities/envelope.ts` 의 `buildResponse` 로 `ConversationResponse` 직조.

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

- `codex exec resume --skip-git-repo-check --json [-m <model>] [-c model_reasoning_effort=<v>] <externalSessionRef> <prompt>`.
- Resume 은 `--sandbox`, `--search`, `--cd` 를 받지 않는다. dispatcher 가 자동으로 플래그를 제거.
- `--skip-git-repo-check` 는 resume 에도 필요하다 — 없으면 codex 가 trusted 로 기록하지 않은 디렉터리에서 실행을 거부하므로, start 는 성공한 세션이 continue 에서 실패한다.
- tier 를 바꿔 resume 하면 모델이 바뀌고 codex 가 `This session was recorded with model X but is resuming with Y` 경고를 낸다(실행 자체는 진행). 그래서 `continue_conversation` 은 tier 생략 시 `SessionMeta.tier` 를 복원해 같은 모델로 이어간다 — `default_tier` 로 떨어지는 것은 tier 를 기록하지 않은 legacy 세션뿐이다.

### Tier 매핑 — `dispatcher/codex/operations/resolveTier.ts`

tier 는 `config.model_map.codex` 의 `{model, effort}` 쌍으로 해석된다. env override `CENNAD_CODEX_<TIER>_MODEL` / `CENNAD_CODEX_<TIER>_EFFORT` 가 config 보다 우선한다.

```typescript
function resolveCodexTier(
  tier: Tier,
  map: CodexModelMap | undefined,
): { model?: string; effort?: string };
// model → `-m <model>`, effort → `-c model_reasoning_effort=<effort>` 로 주입.
// 미해결 차원은 플래그를 생략해 사용자 `~/.codex/config.toml` 이 결정하게 둔다.
```

effort 스케일은 `low < medium < high < xhigh < max < ultra` 이며 **지원 집합은 모델마다 다르다** — `ultra` 는 `gpt-5.6-sol`/`gpt-5.6-terra` 전용이고 `gpt-5.5`/`gpt-5.4` 계열은 `xhigh` 가 상한이다. claude-code 와 달리 codex 는 미지원 effort 를 조용히 낮추지 않고 `invalid_request_error` 로 실패시키므로, 모델과 effort 는 반드시 짝으로 해석하고 settings UI 가 모델별 선택지를 제한한다.

기본 매핑은 frontier 모델을 `high` 에만 할당하고, `mid` 와 `low` 는 같은 balanced 모델(`gpt-5.6-terra`)을 effort 로 가른다.

| tier   | 기본 모델       | 기본 effort | 역할                   |
| ------ | --------------- | ----------- | ---------------------- |
| `high` | `gpt-5.6-sol`   | `max`       | frontier               |
| `mid`  | `gpt-5.6-terra` | `high`      | balanced everyday work |
| `low`  | `gpt-5.6-terra` | `medium`    | 동일 모델, 낮은 effort |

### core/codexModels — 모델 카탈로그 캐시

`codex debug models` 결과를 1시간 TTL 캐시(`<CENNAD_HOME>/runtime/codex-models.json`)로 관리.

- `getCodexModels()`: 캐시 유효 시 반환, 만료 시 `refreshCodexModels()` 호출. 실패 시 stale 캐시 → `constants/codexModels.ts` 의 정적 fallback 순으로 degradation (빈 배열이 아니라 정적 목록 — UI 가 항상 선택지를 갖도록).
- `parseCodexModels`: `visibility !== 'list'` 또는 `supported_in_api === false` 항목을 제외하고 `supported_reasoning_levels[].effort` 를 추출. 카탈로그 순서(codex `priority`, frontier 우선)를 보존한다.
- settings UI 의 `/provider-status` 가 `codexModels` 배열로 서빙 → per-tier model / effort 드롭다운을 동적 바인딩한다.

## Antigravity dispatcher

### Spawn

- 실행: `agy -p "<prompt>" [--dangerously-skip-permissions] [--model=<model>]`.
- cwd 는 `<CENNAD_HOME>/runtime/antigravity-cwd/<sessionId>/`. 세션마다 격리. `<CENNAD_HOME>` 은 기본 `~/.claude/plugins/cennad` 이며 `CENNAD_CONFIG_PATH` 로 override 가능하다.
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

환경변수 fallback 없음. 모델 전체 이름은 config `model_map.antigravity` 에서만 가져온다.

```typescript
function resolveAntigravityModel(
  tier: Tier,
  map: TierModelMap | undefined,
): string | null {
  if (!map) return null;
  const name = map[tier];
  return name && name.trim().length > 0 ? name : null;
}
// null → --model 플래그 생략 (agy 기본값). map 미설정 시 항상 null.
```

`config.model_map.antigravity` 는 `{ high, mid, low }` per-tier 매핑. 사용 가능한 모델 전체 이름은 settings UI 드롭다운에서 확인한다.

### core/agyModels — 모델 캐시

`agy models` 결과를 1시간 TTL 캐시(`<CENNAD_HOME>/runtime/agy-models.json`)로 관리.

- `getAvailableModels()`: 캐시 유효 시 반환, 만료 시 `refreshModels()` 호출. refresh 실패 시 stale 캐시 → 빈 배열 순서로 degradation.
- `refreshModels(now)`: `agy models` 를 15초 타임아웃으로 spawn. 성공 시 파싱 후 원자적 캐시 기록. 실패 시 빈 배열 반환 (throw 없음).

## Claude dispatcher

### Spawn

- 실행: `claude -p <prompt> --output-format json --session-id <cennad sessionId> --permission-mode <mode> --model <model> [--effort <effort>] [--fallback-model <chain>] --strict-mcp-config --safe-mode`.
- `--strict-mcp-config` 와 `--safe-mode` 는 항상 부착 — 자식 프로세스가 부모 세션의 MCP 서버·훅·CLAUDE.md·스킬을 상속하지 않도록 격리.
- Sandbox 플래그 없음. 격리는 `permission_mode` 로 제어. `flags.permission_mode` → `--permission-mode <mode>` (6가지: `default`, `acceptEdits`, `auto`, `dontAsk`, `plan`, `bypassPermissions`).
- 출력: 단일 JSON 객체, `result` 필드가 응답 텍스트. `externalSessionRef` = 주입한 `sessionId`.

### Resume

- `claude --resume <externalSessionRef> -p <prompt> --output-format json --permission-mode <mode> --model <model> [--effort <effort>] --strict-mcp-config --safe-mode`.
- Resume 시 `--session-id` 대신 `--resume <ref>`, `--fallback-model` 생략.

### Tier 매핑 — `dispatcher/claude/operations/modelResolver.ts`

Tier → `{ model, effort }` 를 `config.model_map.claude` 에서 해결. 환경변수 `CENNAD_CLAUDE_<TIER>_MODEL` / `CENNAD_CLAUDE_<TIER>_EFFORT` 로 재정의 가능.

```typescript
// model aliases: opus, sonnet, haiku, fable, best, opus[1m], sonnet[1m]
// effort scale: low < medium < high < xhigh < max
// per-model effort caps:
//   opus / fable / best / opus[1m]  → all 5
//   sonnet / sonnet[1m]              → low / medium / high / max (xhigh 없음)
//   haiku                            → effort 없음 (플래그 생략)
function resolveClaudeModel(
  tier: Tier,
  map: ClaudeTierModelMap | undefined,
): { model: string; effort: string | null } | null {
  if (!map) return null;
  const entry = map[tier];
  return entry ? { model: entry.model, effort: entry.effort ?? null } : null;
}
```

기본 매핑: `high={opus,max}`, `mid={opus,high}`, `low={sonnet,high}`.

## Envelope 빌더 — `dispatcher/entities/envelope.ts`

```typescript
function buildResponse(args: {
  sessionId: string;
  provider: "codex" | "antigravity" | "claude" | null;
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

| 신호                                   | code                          |
| -------------------------------------- | ----------------------------- |
| exit 127 / `ENOENT`                    | `cli_error` (CLI not on PATH) |
| exit 42 (codex bad args)               | `cli_error`                   |
| exit 73 (lock busy)                    | `cli_error`                   |
| HTTP 401 / 403 in stderr               | `auth`                        |
| HTTP 429 in stderr                     | `rate_limit`                  |
| `ECONNRESET`, `ETIMEDOUT`, `ENOTFOUND` | `network`                     |
| 그 외                                  | `unknown`                     |

codex / antigravity / claude 세 provider 가 동일한 errorMap 을 공유한다.

## 동시성

- v1: 동일 `sessionId` 에 대한 동시 호출은 MCP 단일 프로세스라 자연스럽게 직렬화. 별도 락 없음.
- 다중 cennad 클라이언트 시나리오는 v1 비범위.

## MCP 도구 목록 (3개)

| 도구                    | 역할                                       |
| ----------------------- | ------------------------------------------ |
| `start_conversation`    | 신규 세션 시작, provider 선택, prompt 전달 |
| `continue_conversation` | 기존 세션 재개 (`externalSessionRef` 기반) |
| `open_settings`         | 설정 웹 UI 오픈 (로컬 HTTP 서버)           |

## 미채택 기능 (codex-call/antigravity-call 대비)

- `--task` 디렉토리 격리 — cennad `sessionId` 가 그 역할 수행.
- `--ttl-days`, `--cleanup`, `--end`, `--list` 유지보수 CLI — cennad 가 TTL 자체 관리.
- 입력 파일(`--input-file`), 이미지(`--image`) 첨부 — v1 비범위. `options` 객체에 추가 자리 마련.
- 외부 wrapper `sessions.json` 매핑 스토어 — cennad `SessionMeta` 가 대체.
- 외부 CLI 자체 세션 파일 정리 — 외부 CLI 의 자체 관리에 위임.
