# apex tier + liveness timeout — implementation plan

`high` 위에 최상위 티어 `apex` 를 추가하고, wall-clock kill 이던 timeout 을 **무출력(liveness) 감시 + 티어별 절대 상한** 으로 교체한다. 설정 UI 의 단일 세그먼트 비율바 스타일 결함도 함께 고친다.

## Global constraints (every task inherits)

- TypeScript ^5.7 / ESM / import 확장자 `.js` · Node ≥ 20 · Yarn 4.12 workspaces
- 훅(`src/hooks/**`)은 이 작업 범위 밖 — 10 KB LIGHT cap 을 건드리지 않는다
- 설정 UI(`index.html`·`app.js`)·`SKILL.md`·`agents/*.md`·`CLAUDE.md` 텍스트는 **영문만**
- 문자열 리터럴 대신 `src/constants/` 도메인 상수; 주석 최소; 단문 제어문 중괄호 없음(`curly: multi`)
- fractal 루트에 peer 파일 금지 — 새 로직은 organ 하위(`utils/`·`operations/`)에 1 함수 1 파일
- `bridge/`·`public/` 빌드 산출물은 **커밋하지 않는다** (사용자가 직접 커밋)
- spec 파일당 테스트 ≤ 15 케이스
- 검증 명령: `yarn cennad typecheck` · `yarn cennad test:run` · `yarn cennad build:plugin` · `yarn workspace @ogham/cross-platform test:run`

## Measured facts (근거 — 추측 아님)

| 사실                                                                                                  | 확인 방법                                                 |
| ----------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| codex `ultra` effort = "Maximum reasoning with automatic task delegation", `gpt-5.6-sol` 전용         | `codex debug models`                                      |
| claude `--output-format stream-json --verbose` 는 `system/thinking_tokens` 이벤트를 추론 중 계속 방출 | 실측 (9-line JSONL)                                       |
| claude 최종 이벤트 = `{"type":"result","subtype":"success","result":"<text>","is_error":false,…}`     | 실측                                                      |
| agy 1.1.8 `--output-format stream-json` 최종 이벤트 = `{"event":"result","result":{status,response}}` | 실측 (7-line JSONL, `step_update` 가 중간 heartbeat)      |
| agy 1.1.8 `--print-timeout` **기본 5분** — 미전달 시 agy 가 스스로 종료                               | `agy --help`                                              |
| agy 는 `gemini-3.5-flash-low` 와 `Gemini 3.5 Flash (Low)` 표기를 **모두** 수용                        | 실측 2회 — 기존 표기 유지 가능, 모델명 스키마 변경 불필요 |
| codex `--json` 이벤트: `thread.started`/`turn.started`/`item.*`/`error`/`turn.failed`                 | 실측 (usage limit 로 turn.failed — 스트림 형식은 확인)    |

## Tier semantics

`apex` 는 기존 티어와 **같은 축**(model + effort)만 쓴다. 사용자는 UI 에서 apex 에도 임의 모델/effort 를 매핑할 수 있고, 아래는 기본값일 뿐이다.

| tier | codex                      | claude             | antigravity                   |
| ---- | -------------------------- | ------------------ | ----------------------------- |
| apex | `gpt-5.6-sol` / `ultra`    | `opus[1m]` / `max` | `Gemini 3.1 Pro` / `High`     |
| high | `gpt-5.6-sol` / `max`      | `opus` / `max`     | `Gemini 3.1 Pro` / `Low`      |
| mid  | `gpt-5.6-terra` / `high`   | `opus` / `high`    | `Gemini 3.5 Flash` / `Medium` |
| low  | `gpt-5.6-terra` / `medium` | `sonnet` / `high`  | `Gemini 3.5 Flash` / `Low`    |

antigravity `high` 만 기존 `Gemini 3.1 Pro (High)` → `(Low)` 로 내린다: apex 가 그 자리를 가져가므로, codex 가 mid/low 를 한 모델의 effort 로 가르는 것과 같은 패턴을 따른다. `default_tier` 는 세 provider 모두 `mid` 유지.

## Timeout model

```
config.timeouts = {
  idle_ms: 600000,                     // 공통: 마지막 출력 이후 무활동 상한
  hard_cap_ms: { apex: 21600000, high: 7200000, mid: 3600000, low: 1800000 },
}
```

- **idle** — stdout/stderr 청크가 도착할 때마다 리셋. 세 CLI 모두 스트리밍 이벤트를 흘리므로 "생각 중"은 활동으로 잡히고, 진짜 정지만 종료된다. 기존 `spawn_timeout_ms` 는 제거한다.
- **hard cap** — 티어별 절대 상한(좀비 방지 안전망). agy 에는 같은 값을 `--print-timeout` 으로도 넘겨 agy 자체 5분 기본을 무력화한다.

---

## Task 1 — `spawnCli` 에 idle timeout 추가 (shared/cross-platform)

**Deliverable**: 무출력 시간만으로 자식을 종료하고, 어느 timeout 이 발동했는지 구분해 반환한다.

### 1.1 `shared/cross-platform/src/spawn/types.ts`

`SpawnOptions` 에 추가:

```ts
  /**
   * Idle (no-output) limit: the timer resets on every stdout/stderr chunk, so a
   * long-running child stays alive as long as it keeps emitting. Independent of
   * `timeoutMs`, which stays a wall-clock ceiling; whichever fires first wins.
   */
  idleTimeoutMs?: number;
```

`SpawnResult` 에 추가:

```ts
  /** Which limit fired when `timedOut` is true. */
  timeoutKind?: "wall" | "idle";
```

### 1.2 `shared/cross-platform/src/spawn/spawnCli.ts`

- `SpawnState` 에 `timeoutKind: "wall" | "idle" | undefined` 추가, `SpawnHandle` 에 `idleTimer: ReturnType<typeof setTimeout> | null` 과 `idleTimeoutMs: number | undefined` 추가.
- `osTimeout` 은 idle 값에도 적용: `const idleTimeoutMs = options.idleTimeoutMs !== undefined ? osTimeout(options.idleTimeoutMs) : undefined;`
- 새 모듈 스코프 함수 2개:

```ts
function fireTimeout(
  handle: SpawnHandle,
  state: SpawnState,
  kind: "wall" | "idle",
): void {
  if (state.settled || state.timedOut) return;
  state.timedOut = true;
  state.timeoutKind = kind;
  killChild(handle, state);
  state.timeoutSettleTimer = setTimeout(
    () => settle(handle, state, null),
    1000,
  );
}

function touchIdle(handle: SpawnHandle, state: SpawnState): void {
  if (handle.idleTimeoutMs === undefined || state.settled) return;
  if (handle.idleTimer) clearTimeout(handle.idleTimer);
  handle.idleTimer = setTimeout(
    () => fireTimeout(handle, state, "idle"),
    handle.idleTimeoutMs,
  );
}
```

- 기존 wall 타이머는 `fireTimeout(handle, state, "wall")` 을 호출하도록 교체.
- spawn 직후 `touchIdle(handle, state)` 1회 호출(첫 출력 전 정지도 잡히도록).
- `child.stdout.on('data')` 와 `child.stderr.on('data')` 핸들러 **선두**에서 `touchIdle(handle, state)` 호출.
- `settle()` 에서 `if (handle.idleTimer) clearTimeout(handle.idleTimer);` 추가하고, resolve 페이로드에 `timeoutKind: state.timeoutKind` 추가.

### 1.3 테스트

- fixture 신규: `shared/cross-platform/src/spawn/__tests__/fixtures/heartbeat.mjs` — 200 ms 간격으로 `tick` 을 stdout 에 5회 출력 후 종료.
- `spawnCli.test.ts` 에 케이스 2개 추가:
  - `idleTimeoutMs: 1000` + heartbeat fixture → `timedOut === false`, exit code 0 (총 실행시간이 idle 값을 넘어도 살아남음).
  - `idleTimeoutMs: 500` + 기존 `long-sleep.mjs` → `timedOut === true`, `timeoutKind === 'idle'`.
- 기존 wall timeout 케이스에 `timeoutKind === 'wall'` 단언 추가.

**검증**: `yarn workspace @ogham/cross-platform test:run`

---

## Task 2 — `apex` 티어 타입·기본값·config 병합 (cennad)

**Deliverable**: `apex` 가 모든 스키마·기본값·레거시 병합 경로에서 1급 티어가 된다.

### 2.1 `src/types/conversation.ts`

```ts
export const Tier = {
  Apex: "apex",
  High: "high",
  Mid: "mid",
  Low: "low",
} as const;
```

`TierSchema` 는 `Object.values(Tier)` 파생이므로 그대로 따라온다.

### 2.2 `src/types/dispatch.ts`

`CodexModelMapSchema`·`ClaudeModelMapSchema`·`AntigravityModelMapSchema` 각각에 `apex: <Provider>TierConfigSchema` 를 `high` 위에 추가.

`DispatchOptions` 에서 `spawnTimeoutMs: number` 를 다음으로 교체:

```ts
/** No-output limit; resets on every CLI output chunk. */
idleTimeoutMs: number;
/** Absolute ceiling for the resolved tier. */
hardCapMs: number;
```

### 2.3 `src/types/config.ts`

`spawn_timeout_ms` 제거하고 티어별 상한 스키마 추가:

```ts
export const TierDurationSchema = z.object({
  apex: z.number().int().positive(),
  high: z.number().int().positive(),
  mid: z.number().int().positive(),
  low: z.number().int().positive(),
});

export type TierDuration = z.infer<typeof TierDurationSchema>;

// Liveness-based dispatch limits. idle_ms is the no-output ceiling — every CLI
// streams events, so a thinking model keeps resetting it and only a stalled one
// trips it. hard_cap_ms is the per-tier absolute stop.
export const TimeoutsConfigSchema = z.object({
  idle_ms: z.number().int().positive(),
  hard_cap_ms: TierDurationSchema,
});

export type TimeoutsConfig = z.infer<typeof TimeoutsConfigSchema>;
```

`ConfigObjectSchema` 에서 `spawn_timeout_ms: …` → `timeouts: TimeoutsConfigSchema`.

### 2.4 `src/constants/defaults.ts`

- 세 provider `model_map` 에 apex 추가 + antigravity `high` 를 `{ model: 'Gemini 3.1 Pro', effort: 'Low' }` 로 (위 표대로).
- `spawn_timeout_ms` 줄 삭제, 대신:

```ts
  timeouts: {
    idle_ms: 10 * 60 * 1000,
    hard_cap_ms: {
      apex: 6 * 60 * 60 * 1000,
      high: 2 * 60 * 60 * 1000,
      mid: 60 * 60 * 1000,
      low: 30 * 60 * 1000,
    },
  },
```

### 2.5 `src/core/configManager/utils/mergeModelMap.ts`

세 provider 블록에 `apex: mergeTierConfig(raw<P>.apex, defaults.<p>.apex),` 추가.

### 2.6 `src/core/configManager/utils/mergeWithDefaults.ts`

`spawn_timeout_ms` 줄을 제거하고 `timeouts: mergeTimeouts(raw.timeouts),` 로 교체. 신규 파일 `src/core/configManager/utils/mergeTimeouts.ts`:

```ts
import { DEFAULT_CONFIG } from "../../../constants/defaults.js";

import { isPlainObject } from "./isPlainObject.js";

function positive(raw: unknown, fallback: number): number {
  return typeof raw === "number" && Number.isFinite(raw) && raw > 0
    ? Math.floor(raw)
    : fallback;
}

export function mergeTimeouts(raw: unknown): unknown {
  const defaults = DEFAULT_CONFIG.timeouts;
  if (!isPlainObject(raw)) return defaults;
  const caps = isPlainObject(raw.hard_cap_ms) ? raw.hard_cap_ms : {};
  return {
    idle_ms: positive(raw.idle_ms, defaults.idle_ms),
    hard_cap_ms: {
      apex: positive(caps.apex, defaults.hard_cap_ms.apex),
      high: positive(caps.high, defaults.hard_cap_ms.high),
      mid: positive(caps.mid, defaults.hard_cap_ms.mid),
      low: positive(caps.low, defaults.hard_cap_ms.low),
    },
  };
}
```

레거시 `spawn_timeout_ms` 는 승계하지 않는다 — 10분 wall-clock 값을 상한으로 옮기면 apex 가 10분에 죽어 이 변경의 목적과 정반대가 된다. `ConfigSchema` 가 unknown key 를 strip 하므로 디스크에서 자연 소멸한다.

### 2.7 테스트

- `src/constants/__tests__/defaults.test.ts` — apex 키 존재 + 상한 순서(`apex > high > mid > low`) 단언. 기본값은 상수에서 파생해 비교(리터럴 복제 금지).
- `src/core/configManager/utils/__tests__/mergeModelMap.test.ts` — apex 없는 레거시 map → 기본 apex 채움.
- 신규 `src/core/configManager/utils/__tests__/mergeTimeouts.test.ts` — 부분 객체·음수·비객체 입력이 기본값으로 수렴.
- `src/core/configManager/__tests__/loadConfig.test.ts` 의 `spawn_timeout_ms` 참조를 `timeouts` 로 교체.

**검증**: `yarn cennad typecheck && yarn cennad test:run`

---

## Task 3 — MCP 도구가 티어별 timeout 을 해석해 dispatcher 로 전달

**Deliverable**: `start_conversation` / `continue_conversation` 이 해석된 tier 로 상한을 고르고, 도구 설명이 apex 를 알린다.

### 3.1 `src/mcp/tools/startConversation/startConversation.ts`

`base` 객체에서 `spawnTimeoutMs: config.spawn_timeout_ms,` 를 다음으로 교체:

```ts
    idleTimeoutMs: config.timeouts.idle_ms,
    hardCapMs: config.timeouts.hard_cap_ms[tier],
```

### 3.2 `src/mcp/tools/continueConversation/continueConversation.ts`

동일 치환. 여기서 `tier` 는 이미 `input.tier ?? session.tier ?? config.default_tier[…]` 로 해석된 값이므로 그대로 인덱싱한다.

### 3.3 `src/mcp/server/lifecycle/createServer.ts`

두 `tier` describe 문자열에 apex 를 반영한다. 정확한 문구는 구현 시 기존 문장 흐름에 맞추되, 반드시 담을 내용:

- 값 4종(`apex`/`high`/`mid`/`low`), 기본은 여전히 provider 별 설정값
- apex = 최상위 비용/능력, 자율 위임(agentic) 수준의 작업에만
- 상한이 티어에 따라 달라진다는 점

**검증**: `yarn cennad typecheck && yarn cennad test:run`

---

## Task 4 — dispatcher 3종: 스트리밍 출력 + idle/hard cap 적용

**Deliverable**: 세 CLI 모두 진행 이벤트를 흘리며, 무출력만으로 종료된다.

### 4.1 codex (이미 `--json`)

- `src/dispatcher/codex/utils/dispatch.ts` — `DispatchInternal` 의 `spawnTimeoutMs: number` → `idleTimeoutMs: number; hardCapMs: number`; `spawnCodex(argv, { cwd, timeoutMs: input.hardCapMs, idleTimeoutMs: input.idleTimeoutMs })`.
- `src/dispatcher/codex/operations/spawn.ts` — `CodexSpawnOptions` 에 `idleTimeoutMs?: number` 추가해 `spawnCli` 로 전달. timeout 에러 메시지는 `result.timeoutKind` 로 분기:
  - `idle` → `codex produced no output for ${idleTimeoutMs}ms — treated as stalled`
  - `wall` → `codex exceeded the ${timeoutMs}ms ceiling for this tier`
- `src/dispatcher/codex/operations/codexDispatcher.ts` — `spawnTimeoutMs: args.spawnTimeoutMs` 2곳을 두 필드로 교체.

### 4.2 claude — stream-json 전환

- `src/dispatcher/claude/utils/buildStartArgs.ts` / `buildResumeArgs.ts` — `'--output-format', 'json'` → `'--output-format', 'stream-json', '--verbose'`. (`--verbose` 없으면 `-p` 와 stream-json 조합이 거부된다.)
- `src/dispatcher/claude/utils/parseResult.ts` — 단일 객체 파싱을 JSONL 스캔으로 교체. 계약은 유지(`ParsedClaudeResult`):
  - 줄 단위로 순회하며 `JSON.parse` 성공한 객체 중 `type === 'result'` 인 **마지막** 것을 채택.
  - 채택 객체에서 기존과 동일하게 `result`(string) → response, `is_error === true || (subtype !== 'success')` → error 판정.
  - result 이벤트가 하나도 없으면 `{ response: null, error: 'claude stream ended without a result event' }`.
  - 빈 stdout 메시지는 기존 문구 유지.
- `src/dispatcher/claude/utils/dispatch.ts` / `operations/claudeDispatcher.ts` / `operations/spawn.ts` — codex 와 동일한 timeout 배선.

### 4.3 antigravity — stream-json + `--print-timeout`

- `src/dispatcher/antigravity/utils/buildStartArgs.ts` / `buildResumeArgs.ts` — 시그니처에 hard cap 을 받아 다음을 추가:
  - `'--output-format', 'stream-json'`
  - `'--print-timeout', `${Math.ceil(hardCapMs / 1000)}s`` ← agy 는 Go duration 문자열을 받는다(`5m0s` 기본).
- `src/dispatcher/antigravity/utils/parseJsonOutput.ts` — stream-json JSONL 을 먼저 시도하고, 실패 시 기존 동작으로 폴백한다(구버전 agy 안전망):
  - 줄 단위 순회, `event === 'result'` 인 마지막 객체의 `result.response` (string, trim 후 비어있지 않으면) 반환.
  - `result.status` 가 `SUCCESS` 가 아니면 null 반환(빈 응답 경로 → 기존 transcript 복구가 이어받는다).
  - 어떤 result 이벤트도 없으면 기존 단일 JSON/plain-text 경로 그대로.
- `src/dispatcher/antigravity/utils/callAgy.ts` / `operations/spawn.ts` / `operations/antigravityDispatcher.ts` — timeout 배선 교체(`timeoutMs: hardCapMs`, `idleTimeoutMs`). `AgyCallResult.timedOut` 판정은 그대로 두되 `timeoutKind` 를 메시지에 반영.

### 4.4 테스트

- `src/dispatcher/claude/__tests__/` — parseResult 를 JSONL 픽스처(실측 형식: system → assistant → result)로 재작성. 최소: 성공 1, `is_error` 1, result 이벤트 없음 1.
- `src/dispatcher/antigravity/__tests__/timeout.test.ts` — hard cap 과 idle 이 각각 별도 인자로 전달되는지, `--print-timeout` 이 argv 에 붙는지 단언.
- `src/dispatcher/antigravity/__tests__/` — parseJsonOutput 의 stream-json 경로 + 레거시 폴백 케이스.
- Mock CLI 통합 테스트(`src/dispatcher/**/__tests__/integration*`)의 stdout 픽스처를 새 형식으로 갱신.

**검증**: `yarn cennad typecheck && yarn cennad test:run`

---

## Task 5 — 설정 UI: apex 행 + timeout 필드 + 비율바 결함

**Deliverable**: 브라우저에서 apex 를 매핑하고 상한을 조정할 수 있으며, 단일 provider 에서도 비율바가 pill 형태를 유지한다.

### 5.1 비율바 결함 (독립 수정 — 다른 5.x 와 결합 없음)

`src/mcp/pages/settings/styles/styles.css`:

```css
.ratio-bar-segment:first-child {
  border-start-start-radius: 999px;
  border-end-start-radius: 999px;
}

.ratio-bar-segment:last-child {
  border-start-end-radius: 999px;
  border-end-end-radius: 999px;
}
```

원인: 두 규칙이 같은 명시도로 `border-radius` **단축 속성**을 각각 선언해, 세그먼트가 하나뿐이면(= first 이자 last) 나중 선언인 `:last-child` 가 앞 규칙을 통째로 덮어 왼쪽 모서리가 각졌다. 논리 속성으로 쪼개면 두 규칙이 서로 다른 속성을 쓰므로 함께 적용된다.

### 5.2 `src/mcp/pages/settings/index.html`

- provider 3개 각각의 `default tier` 라디오 그룹에 `apex` 항목을 `high` 앞에 추가 (`id="default-tier-<p>-apex"` 관례는 기존 마크업을 따른다).
- provider 3개 각각의 `.tier-model-map` 에 apex 행 추가:
  ```html
  <div class="tier-field" data-layout="model-effort">
    <span class="tier-label">apex</span>
    <select id="model-<p>-apex" class="tier-select"></select>
    <select id="effort-<p>-apex" class="tier-select"></select>
  </div>
  ```
  (라벨 마크업은 인접 high 행을 그대로 복제해 맞춘다.)
- 기존 `spawn timeout` 단일 입력을 timeout 그룹으로 교체: `#idle-timeout-ms` 1개 + `#hard-cap-apex`·`#hard-cap-high`·`#hard-cap-mid`·`#hard-cap-low` 4개(분 단위 입력, 힌트에 "no-output limit; a working CLI keeps resetting it" 명시).

### 5.3 `src/mcp/pages/settings/scripts/app.js`

- `var TIERS = ['apex', 'high', 'mid', 'low'];`
- `DEFAULT_DEFAULT_TIER` 는 `mid` 유지, 라디오 목록은 `TIERS` 파생이므로 자동 확장.
- `DEFAULT_MODEL_MAP` 계열 상수에 apex 기본값 추가 (Task 2 표와 동일 값).
- `DEFAULT_SPAWN_TIMEOUT_MS` → `DEFAULT_IDLE_TIMEOUT_MS` + `DEFAULT_HARD_CAP_MS` 객체로 교체. 로드(`cfg.timeouts`)·저장(`timeouts: { idle_ms, hard_cap_ms }`) 경로를 같이 바꾸고, 분↔ms 변환은 한 곳(헬퍼 함수)에서만 한다.
- 저장 시 하한 클램프는 기존 `Math.max` 패턴을 따른다(0 이하 방지).

### 5.4 테스트

`src/mcp/pages/settings/__tests__/settingsPage.test.ts` — apex select id 4×3 존재, timeout 입력 5개 존재, `TIERS` 순서 단언.

**검증**: `yarn cennad test:run && yarn cennad build:plugin` (빌드 산출물은 커밋하지 않음)

---

## Task 6 — skills / courier / 문서

**Deliverable**: 호출 측이 복잡도로 티어를 고르고, 문서가 새 계약을 설명한다.

### 6.1 `skills/{codex,antigravity,claude}/SKILL.md`

- frontmatter `argument-hint`: `--tier apex|high|mid|low`
- `## Tier` 섹션을 복잡도 루브릭으로 교체. 4개 스킬 공통 골자(각 스킬의 어조에 맞춰 서술):
  - `low` — 단일 파일 조회·형식 변환·짧은 요약처럼 판단이 거의 없는 작업
  - `mid` — 기본값. 한 모듈 범위의 구현·리뷰·설명
  - `high` — 여러 파일에 걸친 설계 판단, 원인 추적, 상충하는 제약의 조정
  - `apex` — 자율 실행이 필요한 다단계 작업: 저장소 전반 리팩터링, 다수 파일을 스스로 탐색·수정해야 하는 마이그레이션, 장시간(수십 분 이상) 자율 진행이 전제인 작업. 비용·rate limit 이 가장 크므로 "high 로는 부족한 이유"를 댈 수 있을 때만.
  - 사용자가 명시하면 그 값을 그대로 쓴다(추론 금지).

### 6.2 `skills/crosscheck/SKILL.md`

`--tier` 인자 표기와 안내를 4종으로 갱신. crosscheck 는 같은 tier 가 모든 provider 로 가므로, apex 는 비용이 provider 수만큼 곱해진다는 한 줄을 추가한다.

### 6.3 `agents/courier.md`

`tier` 입력 설명을 `apex | high | mid | low` 로 갱신하고, 능력 라벨 설명에 apex(최상위·자율 위임 수준)를 한 구절로 반영. 모델명은 여전히 적지 않는다.

### 6.4 문서

- `plugins/cennad/CLAUDE.md` — **Tier 해석** 항목에 apex 추가, timeout 모델(idle + 티어별 hard cap, agy `--print-timeout` 연동, claude/agy stream-json 전환) 항목 추가.
- `src/dispatcher/{claude,antigravity}/INTENT.md` + `DETAIL.md` — 출력 형식·플래그 변경 반영 (INTENT.md 50줄 캡 준수; 정확히 50줄이면 같은 edit 에서 ≤49줄로 압축).
- `src/dispatcher/codex/INTENT.md` — timeout 배선 문구 갱신.
- `src/mcp/pages/settings/INTENT.md`, `src/mcp/tools/*/INTENT.md` — apex·timeouts 반영.
- `src/types/INTENT.md`·`src/constants/INTENT.md` 에 관련 서술이 있으면 동기화.
- `.metadata/cennad/{spec,provider-dispatch,web-ui,mcp-tools,skills}.md` — 4-tier 및 timeout 계약 반영.

**검증**: `yarn cennad test:run` 후 `/filid:scan` 으로 신규 findings 0 확인.

---

## Task 7 — 최종 통합 검증

1. `yarn workspace @ogham/cross-platform test:run`
2. `yarn cennad typecheck`
3. `yarn cennad test:run`
4. `yarn cennad lint && yarn format`
5. `yarn cennad build:plugin` — 훅 번들 cap 미초과 확인 (훅은 미변경이므로 회귀만 확인)
6. 실제 위임 1회: `apex` 로 짧은 프롬프트를 claude provider 에 보내 stream-json 파싱 경로가 실동작하는지 확인
7. 설정 UI 를 열어 단일 provider 상태에서 비율바 모서리를 육안 확인

## Out of scope (발견했으나 이번 변경에 포함하지 않음)

- **agy stream-json 이 `conversation_id` 를 노출한다** (실측). 현재의 cwd-격리 세션 추적(Issue #7 우회)을 `--conversation <id>` 로 대체할 수 있는 경로가 열렸지만, 세션 저장 포맷과 resume 계약을 바꾸는 별건이다.
- agy 모델 카탈로그가 kebab 표기(`gemini-3.6-flash-high`)로 바뀌었으나 표시명 표기도 계속 수용된다(실측) — 표기 통일은 별건.
- codex 는 usage limit 로 실제 turn 성공 스트림을 이번에 확인하지 못했다. 형식은 기존 파서가 이미 다루는 이벤트라 변경 없음.
