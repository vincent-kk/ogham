# 훅 개입 강도 강화 계획 (A·B·C)

주입 문구가 강도(-2..+2)에 따라 실제로 달라지게 만들고(A), 매 턴 주입을
짧은 상기 라인으로 압축하며(B), 키워드를 "조건 → 소유 스킬" 계약형으로
전환한다(C).

## 전역 제약 (모든 태스크 상속)

- 훅 번들 cap **10 KB LIGHT** (`scripts/buildHooks.mjs`). 현재 각 ~3.3 KB.
- `src/hooks/**` 는 `node:*` 빌트인만. `zod` / MCP SDK / `src/core` 금지.
  `src/constants/defaults.js` 는 type-only import 체인이라 허용 (기존 `pickStrength` 선례).
- 훅 도달 코드는 배럴 import 금지 — concrete 파일 경로 직접 import.
- 주입 텍스트는 **영어**. 이 계획서·INTENT.md 설명문은 한국어.
- 파일 1개당 1함수 (organ 분해). 신규 유틸은 `utils/` 아래.
- spec 파일당 **15 케이스 이하**.
- UserPromptSubmit 훅 타임아웃 3초 — 디스크 read 2회 + 문자열 빌드 유지.

## 확정 문구 사양

### SessionStart (`injectStatic`) — 강도 0 예시

```
[cennad] Static policy

Provider ratio: codex 34% · antigravity 33% · claude 33%
Active providers: codex, antigravity, claude
Intervention strength: 0 (neutral)

Moments with owners
- code, refactor, youtube, create-image → `/cennad:codex`
- research, search, large-context → `/cennad:antigravity`
- reasoning, writing, analysis, review → `/cennad:claude`
- a claim worth an independent second opinion → `/cennad:crosscheck`

Routing guidance
- Option flags: {"codex":{...},"antigravity":{...},"claude":{...}}
- Dispatch when a moment matches, when a provider's strength fits the task, or to keep near the ratio.
- Nothing matches → handle it in this session.
- Dispatch through the skills above; never invoke CLI binaries directly.
```

변경점 3가지:

1. `Intervention strength: <n> (<label>)` — 서술형 tone phrase 를 UI 슬라이더와
   같은 한 단어 라벨로 축소 (`subtle`/`soft`/`neutral`/`active`/`strong`).
   실제 지시는 stance 블록이 담당하므로 헤더 중복 제거.
2. `Keyword mapping` → `Moments with owners`. 방향이 `provider → keywords` 에서
   `keywords → /cennad:<skill>` 로 뒤집힌다 (C).
3. `Routing guidance` 의 중간 라인들이 강도별로 통째 교체 (A).

### 강도별 stance 라인 (A)

| 강도 | 라벨      | stance 라인                                                                                                                                                                                                                                             |
| ---- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| +2   | `strong`  | `- A moment above matches → dispatch it now, without asking first.`<br>`- No moment matches but a provider is plainly stronger → dispatch anyway.`<br>`- Handling a matched moment here is a skipped delegation, not a judgment — say why in one line.` |
| +1   | `active`  | `- A moment above matches → dispatch it rather than handling it here.`<br>`- Nothing matches → handle it here, or dispatch to keep near the ratio.`                                                                                                     |
| 0    | `neutral` | `- Dispatch when a moment matches, when a provider's strength fits the task, or to keep near the ratio.`<br>`- Nothing matches → handle it in this session.`                                                                                            |
| −1   | `soft`    | `- Dispatch only where a provider is clearly stronger than this session for the task.`<br>`- Otherwise handle it here; the ratio is a ceiling, not a quota.`                                                                                            |
| −2   | `subtle`  | `- Dispatch only when the user names a provider, or the work plainly exceeds this session.`<br>`- Otherwise handle it here.`                                                                                                                            |

설계 근거:

- `Otherwise handle the task directly in this session.` 고정 라인이 +2 에서도
  위임을 억제하던 문제를 해소 — +2 는 fallback 조건을 "no moment AND no
  strength match" 로 좁히고, 마지막 라인이 미위임에 이유 서술을 요구한다
  (seiri election contract 의 "skipped election, not a judgment" 패턴).
- −1/−2 의 `prefer Claude` / `bias to Claude` 는 provider `claude`(외부 CLI)와
  이름이 충돌했다. 전부 `this session` / `here` 로 통일.

### 모먼트 라인 (C)

- 활성 provider 마다 한 줄: `- <keywords> → \`/cennad:<provider>\``.
- 키워드가 공백이면 provider 기본 도메인 텍스트로 대체 (강점 정보가
  keyword 설정에 의해 사라지지 않게):
  - codex → `heavy code, refactor, sandboxed shell`
  - antigravity → `live web search, very large context`
  - claude → `reasoning, writing, analysis, review`
- 활성 provider ≥ 2 일 때만 마지막에 crosscheck 라인 추가:
  `- a claim worth an independent second opinion → \`/cennad:crosscheck\``
- 활성 0개면 모먼트 섹션 자체를 생략하고 기존 `Run /cennad:setup ...` 라인 유지.

### UserPromptSubmit (`injectDynamic`) — 2줄 압축 (B)

호출 ≥ 1:

```
[cennad] Calls: codex 7 · antigravity 3 · claude 0 (total 10) · behind target: claude +33
<nudge 라인>
```

호출 0건:

```
[cennad] No delegations yet this session.
<nudge 라인>
```

활성 provider 0개 (nudge 생략):

```
[cennad] No provider enabled — run /cennad:setup.
```

기존 6줄(헤더 2 + current/target/drift 3 + counts 1)을 2줄로 줄인다.
`Current ratio` / `Target ratio` / `Drift` 3줄은 "어디가 목표에 못 미치나"라는
결론만 남기고 `behind target: <provider> +<drift>` 로 흡수한다. drift > 0 인
provider 를 큰 순으로 나열하고, 하나도 없으면 `on target`.

### 강도별 nudge 라인 (B)

| 강도 | nudge                                                                                                  |
| ---- | ------------------------------------------------------------------------------------------------------ |
| +2   | `Domain match this turn → dispatch now via /cennad:<provider>; keeping it here needs a stated reason.` |
| +1   | `Domain match this turn → prefer /cennad:<provider> over handling it here.`                            |
| 0    | `Weigh /cennad:<provider> against handling it here.`                                                   |
| −1   | `Use /cennad:<provider> only where it is clearly stronger than this session.`                          |
| −2   | `Use /cennad:<provider> only when asked.`                                                              |

`<provider>` 는 플레이스홀더로 남긴다 — 활성 provider 이름은 같은 페이로드의
counts / behind target 부분이 이미 노출하므로 매 턴 반복하지 않는다.

## 태스크

### T1 — 강도 라벨 + stance 블록 (A)

**파일**

- 삭제: `plugins/cennad/src/hooks/injectStatic/utils/tonePhrase.ts`
- 신규: `plugins/cennad/src/hooks/injectStatic/utils/strengthLabel.ts`
- 신규: `plugins/cennad/src/hooks/injectStatic/utils/routingStance.ts`
- 수정: `plugins/cennad/src/hooks/injectStatic/injectStatic.ts`
- 신규: `plugins/cennad/src/hooks/injectStatic/__tests__/routingStance.test.ts`
- 수정: `plugins/cennad/src/hooks/injectStatic/__tests__/injectStatic.test.ts`
  (`tonePhrase` describe 5케이스 → `strengthLabel` 5케이스)

**인터페이스 (T2·T4 가 소비)**

```ts
// utils/strengthLabel.ts
export function strengthLabel(strength: InterventionStrength): string;
// 'subtle' | 'soft' | 'neutral' | 'active' | 'strong'

// utils/routingStance.ts
export function routingStance(strength: InterventionStrength): string[];
// '- ' 접두사를 포함한 완성 라인 배열 (2~3줄)
```

`injectStatic.ts` 는 `Intervention strength: ${n} (${strengthLabel(n)})` 로
헤더를 바꾸고, Routing guidance 의 기존 `Delegate when …` / `Otherwise …`
4줄을 `...routingStance(n)` 으로 교체한다. `- Option flags:` 라인과 마지막
스킬 라인은 강도와 무관하게 유지하되, 마지막 라인 문구를
`- Dispatch through the skills above; never invoke CLI binaries directly.` 로
바꾼다 (스킬 목록은 T2 의 모먼트 섹션이 이미 나열).

**검증**: `yarn cennad test:run` — 강도 5값 각각 stance 라인 배열이 서로
다르고, +2 만 `skipped delegation` 문구를 포함.

### T2 — 모먼트 계약 섹션 (C)

**파일**

- 신규: `plugins/cennad/src/hooks/injectStatic/utils/momentLines.ts`
- 수정: `plugins/cennad/src/hooks/injectStatic/utils/joinKeywords.ts`
  (fallback 파라미터 additive 추가)
- 수정: `plugins/cennad/src/hooks/injectStatic/injectStatic.ts`
- 신규: `plugins/cennad/src/hooks/injectStatic/__tests__/momentLines.test.ts`

**인터페이스**

```ts
// utils/joinKeywords.ts — 기존 시그니처 호환 (fallback 기본값 '(none)')
export function joinKeywords(raw: string, fallback?: string): string;

// utils/momentLines.ts
export function momentLines(
  keywords: HookConfig["keywords"],
  active: readonly HookProvider[],
): string[];
// ['Moments with owners', '- <domain> → `/cennad:<p>`', ..., (crosscheck)]
// active 가 비면 [] 반환
```

`DEFAULT_DOMAIN: Record<HookProvider, string>` 은 `momentLines.ts` 모듈 스코프
상수로 둔다 (이 파일의 책임 범위 — 다른 소비자 없음).

**검증**: 키워드 공백 → 기본 도메인 텍스트 대체, 활성 1개 → crosscheck 라인
없음, 활성 2개 이상 → crosscheck 라인 포함.

### T3 — 매 턴 주입 압축 + nudge (B)

**파일**

- 삭제: `plugins/cennad/src/hooks/injectDynamic/utils/formatRatio.ts`
  (T3 가 orphan 으로 만든다 — `RatioLane` 타입은 `behindTarget.ts` 로 이동)
- 신규: `plugins/cennad/src/hooks/injectDynamic/utils/behindTarget.ts`
- 신규: `plugins/cennad/src/hooks/injectDynamic/utils/nudgeLine.ts`
- 유지: `utils/signed.ts` (behindTarget 이 소비)
- 수정: `plugins/cennad/src/hooks/injectDynamic/injectDynamic.ts`
- 신규: `plugins/cennad/src/hooks/injectDynamic/__tests__/behindTarget.test.ts`
- 신규: `plugins/cennad/src/hooks/injectDynamic/__tests__/nudgeLine.test.ts`
- 수정: `plugins/cennad/src/hooks/injectDynamic/__tests__/injectDynamic.test.ts`
  (`formatRatio` describe 4케이스 제거 → 13케이스)

**인터페이스**

```ts
// utils/behindTarget.ts
export interface RatioLane {
  name: string;
  count: number;
  weight: number; // 설정 비율(%), disabled 면 0
}
export function behindTarget(lanes: RatioLane[]): string;
// 'behind target: claude +33 · codex +5' | 'on target'

// utils/nudgeLine.ts
export function nudgeLine(strength: InterventionStrength): string;
```

`buildDynamicPayload` 출력은 위 사양의 2줄. 활성 provider 0개면 1줄
(`No provider enabled — run /cennad:setup.`).

**검증**: 호출 0/≥1/전부-disabled 3분기 + 강도 5값 nudge.

### T4 — E2E·문서·빌드 검증

**파일**

- 수정: `plugins/cennad/src/__tests__/e2e/hooks/inject-static.layerA.test.ts`
  (`'balanced'` → `'neutral'`, `'very conservative'` → `'subtle'`)
- 수정: `plugins/cennad/src/__tests__/e2e/hooks/inject-static.layerB.test.ts` (동일)
- 수정: `plugins/cennad/src/__tests__/e2e/hooks/inject-dynamic.layerA.test.ts`
  (`'Calls this session: …'` / `'Drift:'` → 새 한 줄 포맷)
- 수정: `plugins/cennad/src/__tests__/e2e/hooks/inject-dynamic.layerB.test.ts` (동일)
- 수정: `plugins/cennad/src/__tests__/e2e/hooks/legacy-migration.both.test.ts`
  (`'Target ratio:'` 2곳 → 마이그레이션된 비율이 반영된 새 표현으로 교체)
- 수정: `.metadata/cennad/hooks.md` (페이로드 스펙 전면 갱신 — tone phrase 표를
  라벨+stance 표로, injectDynamic 출력 예시 교체)
- 수정: `plugins/cennad/src/hooks/injectStatic/INTENT.md` (Structure/Conventions, 50줄 이내)
- 수정: `plugins/cennad/src/hooks/injectDynamic/INTENT.md` (동일)

**검증 명령**

```bash
yarn cennad typecheck
yarn cennad test:run
yarn cennad build:plugin      # 10 KB cap + 금지 모듈 가드
yarn cennad test:e2e:run      # Layer B 는 번들 대상이므로 build:plugin 이후
yarn format && yarn lint
```

`bridge/` 산출물은 커밋하지 않는다 (사용자가 직접 커밋).

## 진행 기록

| 태스크 | 결과                                                              | 검증                                                                                                              |
| ------ | ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| T1     | `strengthLabel` + `routingStance` 도입, `tonePhrase` 제거         | `test:run src/hooks/injectStatic` 25 통과                                                                         |
| T2     | `domainLines` + `joinKeywords` fallback, 키워드 방향 반전         | 동일 실행에 포함                                                                                                  |
| T3     | `behindTarget` + `nudgeLine`, `formatRatio` 제거, 2줄 압축        | `test:run src/hooks` 81 통과                                                                                      |
| T4     | E2E 5파일 · hooks.md · architecture.md · CLAUDE.md · INTENT.md ×2 | `test:run` 630 통과 · `test:e2e:run` 61 통과(3 skip) · `build:plugin` 가드 통과 (7,371 B / 6,836 B, cap 10,240 B) |

### 계획에서 벗어난 부분

1. **`momentLines` → `domainLines` 개명 (T2).** 훅 번들 가드의
   `FORBIDDEN_PATTERNS` 에 `/\bmoment\b/` (moment.js 차단)가 있어, stance 산문의
   `A moment above matches` 가 빌드를 실패시켰다. 문구·심볼·섹션 헤더를 모두
   `domain` 어휘로 통일했다 — nudge 라인의 `Domain match this turn` 과 용어가
   맞아떨어지는 부수 이득이 있다. 가드는 6개 플러그인이 공유하는 안전장치라
   패턴을 느슨하게 하는 대신 문구를 바꿨다.
2. **`architecture.md` 의 `loadConfig.ts` 위치 정정.** hooks 트리 블록을 이미
   수정하는 참에, `injectStatic/utils/` 로 잘못 적혀 있던 항목을 실제 위치인
   `shared/` 로 옮겼다. 같은 블록에 stale 한 줄만 남기면 문서가 반쯤 최신인
   상태가 되기 때문.
3. **`roadmap.md` 의 `tonePhrase` / `formatRatio` 언급은 미변경.** Phase 7 구축
   당시의 이력 기록이라 현재 구조 문서가 아니다.

## 2차 개정안 — 교차검증 반영 (미구현, 승인 대기)

codex·antigravity·claude 3자 평가 + 자체 실측으로 드러난 결함을 반영한 재설계.
1차 구현의 가장 큰 실패는 **강도 다이얼이 단조롭지 않다**는 것 — 0의 트리거 집합
{domain match, strength fits, ratio}이 +1의 {domain match}를 포함해 0이 +1보다
강하게 읽힌다. 실동작 티어는 5단계가 아니라 2.5단계였다.

원인은 축 설계다. 5레벨이 확신도 축(`clearly`/`plainly`/`fits`) 위에서 미끄러지는데,
이 축은 연속적이고 판정자가 위임당하는 당사자라 이산 단계를 만들지 못한다.

### 새 축 — 3개 이산 축의 조합

| 강도 | (i) 매치 없을 때        | (ii) 사용자 확인                  | (iii) 예외 형태                               |
| ---- | ----------------------- | --------------------------------- | --------------------------------------------- |
| −2   | 여기서 처리             | 위임 전 사용자가 이름을 불러야 함 | 위임 자체가 예외                              |
| −1   | 여기서 처리             | 불필요                            | 열린 판단                                     |
| 0    | 여기서 처리             | 불필요                            | 시작 전 명시적 결정                           |
| +1   | 여기서 처리             | 불필요                            | 이탈 시 어느 부분을 이 세션이 소유하는지 서술 |
| +2   | 분리 가능한 부분은 위임 | 불필요                            | **닫힌 4개 목록만**                           |

(ii)와 (iii)이 이산적으로 갈리므로 인접 레벨이 텍스트만으로 구분된다.

### SessionStart stance — 교체본

**+2 (strong)**

```
- A domain above matches → dispatch it through the owning skill before starting the work.
- Keeping matched work here is allowed only for one of these:
  (1) the user asked this session to do it;
  (2) it needs files, state, or tools the provider cannot reach;
  (3) the whole change is one file and under ~20 lines;
  (4) a dispatch for this same task already failed this session.
  Name the number in your reply — "keeping here (2)". Nothing else is an exception.
- A failed dispatch is not a retry loop: report it, then handle it here.
- The ratio line reports past turns. Never dispatch to move it.
- An explicit user instruction outranks every line above.
```

**+1 (active)**

```
- A domain above matches → dispatch it through the owning skill rather than handling it here.
- Keeping matched work here is a decision — name the part this session must own.
- Nothing matches → handle it here.
- The ratio line reports past turns. Never dispatch to move it.
- An explicit user instruction outranks every line above.
```

**0 (neutral)**

```
- A domain above matches → choose between the owning skill and this session before you start, not after.
- Lean dispatch when the work is self-contained and sizable, or needs live web, a sandbox, or an outside view.
- Lean local when it is small, or leans on state this session already built.
- Nothing matches → handle it here.
- The ratio line reports past turns. Never dispatch to move it.
```

**−1 (soft)**

```
- Dispatch only when a provider owns most of the work in front of you.
- Otherwise handle it here; the ratio line is a report, not a quota.
- An explicit user instruction outranks every line above.
```

**−2 (subtle)**

```
- Dispatch only when the user asks for a provider by name.
- Otherwise handle it here, and never dispatch to move the ratio.
```

교체 근거: 자기평가 트리거(`clearly stronger`/`strength fits`)를 관찰 가능한
속성(규모·자족성·세션 상태 의존도·provider 고유 능력)으로 바꿨고, 자유 서술 사유를
닫힌 번호 목록으로 바꿨으며(합리화 표면적 제거), `to keep near the ratio` 위임 지시를
삭제하고 그 자리에 금지 문장을 넣었다. 사용자 지시 우선순위와 실패 정책은 신규.

### UserPromptSubmit — 3줄 구조

```
[cennad] Calls: codex 7 · antigravity 3 · claude 0 (total 10) · under share: claude 10pt
<nudge — 강도별, 매 턴 상시>
<match line — 키워드 매치가 있을 때만 추가>
```

`behind target` → `under share` + 단위 `pt`. 할당량 신호로 읽히던 표현을 과거
보고로 고정하고, "비율을 움직이려 위임하지 말라"는 SessionStart 에 한 번만 둔다.

**nudge (상시)**

| 강도 | 문구                                                                                              |
| ---- | ------------------------------------------------------------------------------------------------- |
| −2   | `Delegate to codex, antigravity, or claude only when asked by name.`                              |
| −1   | `Delegate only when codex, antigravity, or claude owns most of this work.`                        |
| 0    | `codex, antigravity, claude, or here — decide before you start.`                                  |
| +1   | `Prefer codex, antigravity, or claude over handling owned work here.`                             |
| +2   | `Dispatch owned work to codex, antigravity, or claude; keeping it here needs a listed exception.` |

**match line (매치 시 추가)** — `<kw>` 는 매치된 키워드, `<p>` 는 소유 provider

| 강도 | 문구                                                                |
| ---- | ------------------------------------------------------------------- |
| −2   | `Matched "<kw>" → /cennad:<p> available.`                           |
| −1   | `Matched "<kw>" → /cennad:<p> if it owns most of this.`             |
| 0    | `Matched "<kw>" → /cennad:<p> or here? Decide before starting.`     |
| +1   | `Matched "<kw>" → /cennad:<p> owns this. Prefer it.`                |
| +2   | `Matched "<kw>" → /cennad:<p> owns this. Dispatch before starting.` |

`<provider>` 플레이스홀더는 전부 제거 — nudge 는 실명 나열, match line 은 단일 지목.
매치 키워드가 턴마다 달라지므로 습관화(벽지 효과)를 견딘다.

### 키워드 매칭 규칙

UserPromptSubmit 훅이 stdin JSON 의 `prompt` 를 읽어 config 키워드와 대조한다
(`plugins/filid/src/hooks/userPromptSubmit/userPromptSubmit.entry.ts` 의 `readStdin`,
`plugins/maencof/.../runVaultCommitter.ts` 의 `input.prompt` 가 선례).

- 프롬프트·키워드 모두 소문자 정규화 후 비교.
- **ASCII 전용 키워드**: 단어 경계 매칭 (`code` 가 `decode` 에 오탐하지 않도록).
- **비-ASCII 포함 키워드**: 순수 부분 문자열 매칭 — 한국어 조사·어미 변화를 흡수
  (`코드` ⊂ "코드를", "코드리뷰").
- 매치가 여럿이면 `PROVIDER_ORDER` 순으로 첫 provider 하나만 지목 (예측 가능성 우선).
- 매치 없으면 match line 생략 — nudge 는 그대로 낸다 (매치 없는 턴에도 이후 판단으로
  위임이 나올 수 있으므로).

### 자동 선출 제외 — self-exclusion + crosscheck-only

두 가지 제외 사유를 **하나의 개념**으로 통합한다.

```
enabled   = 이 provider 를 쓸 수 있다 (crosscheck 참가 · 사용자 명시 호출)
electable = enabled AND NOT crosscheck_only AND NOT self-host
```

훅의 자동 지목·권고는 `electable` 만 대상으로 하고, crosscheck 참가자는
`enabled` 전부다. 즉 호스트 자신의 provider 는 자동 라우팅에서 빠지되
crosscheck 로는 여전히 불린다.

**(1) self-exclusion — 구조적·자동**

호스트 식별은 `resolveHostDescriptor(process.env)` 로 한다 (`hostRegistry`).
이것이 훅 전용 경로다 — `detectHost()` 는 마커 전용이며 주석이 "hook processes
get no marker at all" 이라고 명시하므로 훅에서 쓰면 안 된다. 판정 순서는
마커(`OGHAM_HOST`) → hook signal → 기본 claude 이고, 이 테이블은 이미 cennad 훅
번들에 들어와 있다 (`paths.ts` → `pluginCache` 체인).

| 호스트 | 감지 신호                                           | 제외되는 provider |
| ------ | --------------------------------------------------- | ----------------- |
| claude | 마커·시그널 없음 (기본)                             | `claude`          |
| codex  | `OGHAM_HOST=codex` 또는 `PLUGIN_DATA`               | `codex`           |
| agy    | `OGHAM_HOST=agy` 또는 `ANTIGRAVITY_CONVERSATION_ID` | `antigravity`     |

`@ogham/cross-platform` 에 `./host-registry` 서브패스 export 를 추가해야 한다 —
모듈과 배럴(`hostRegistry/index.ts`)은 이미 있고 exports 항목만 없다.

**(2) crosscheck_only — 사용자 설정**

`ProviderRatioSchema` 에 optional 필드를 더한다 (기존 config 무변경 호환):

```ts
export const ProviderRatioSchema = z.object({
  value: z.number().int().min(0).max(100),
  enabled: z.boolean(),
  crosscheck_only: z.boolean().optional(),
});
```

비율 0% 로 대신하지 않는 이유: 0% 는 "목표 점유율 0" 이라는 뜻이지 "자동 선출
대상이 아니다" 가 아니다. 0% 여도 도메인 매치는 성립하고 match line 이 나간다.
두 개념을 한 숫자에 겹치면 UI 도 설명할 수 없다.

**페이로드 반영**

```
Provider ratio: codex 65% · antigravity 25% · claude 10%
Active providers: codex, antigravity, claude
Auto-routing: codex, antigravity
Intervention strength: 2 (strong)

Domains with owners
- code, refactor, 코드, 리팩터 → `/cennad:codex`
- research, search, 검색 → `/cennad:antigravity`
- reasoning, writing, 분석 → `/cennad:claude` (crosscheck only — this session's own model)
- a claim worth an independent second opinion → `/cennad:crosscheck`
```

- `Active providers:` 는 의미를 그대로 유지한다 — crosscheck 스킬의 참가자
  게이트가 이 줄을 읽으므로 건드리면 안 된다.
- `Auto-routing:` 이 신규. 자동 지목 대상만 나열한다.
- 제외된 provider 는 표에 남고 사유가 붙는다:
  `(crosscheck only — this session's own model)` / `(crosscheck only — by setup)`.

**매 턴 라인**

- nudge: `electable` 실명만 나열 (`Dispatch owned work to codex or antigravity; …`)
- match line: `electable` 키워드에서만 매치 — 제외된 provider 는 지목하지 않는다
- `under share`: `electable` 기준으로만 계산 (자동 선출이 없는 provider 의 드리프트는
  행동으로 이어질 수 없다)
- `Calls:` 카운트는 전부 표시 — 명시 호출·crosscheck 호출도 실제로 일어난 일이다

**엣지 케이스**

`electable` 이 0개면 (예: claude 세션에서 claude 만 enabled) nudge·match line 을
생략하고 SessionStart 마지막 줄을
`- Every enabled provider is crosscheck-only here; nothing is auto-routed.` 로 바꾼다.
crosscheck 자체는 `enabled` 가 2개 이상이면 그대로 가능하다.

**설정 UI**

provider 카드를 3-state 로 바꾼다: `off` / `crosscheck only` / `auto-routing`.
`crosscheck only` 일 때 비율 슬라이더는 비활성 — 자동 선출이 없으면 목표 점유율이
의미를 갖지 않는다. self-exclusion 은 자동이므로 UI 에 토글을 두지 않고, 해당
provider 카드에 "this host — auto-routing off" 안내만 표시한다.

### 기본 키워드 이중 언어화

`DEFAULT_CONFIG.keywords` 를 한/영 병기로 확장한다. 저장된 사용자 config 가 기본값을
덮으므로 기존 사용자는 설정 UI 에서 추가해야 하며, 설정 페이지에 그 안내를 둔다.

## 2차 개정 진행 기록

| 항목           | 결과                                                                             |
| -------------- | -------------------------------------------------------------------------------- |
| 강도 축 재설계 | `routingStance` 를 3축 이산 조합으로 교체 + 공통 꼬리 2줄(비율 금지·사용자 우선) |
| 닫힌 예외 목록 | `+2` 의 자유 서술 사유 → 번호 4개 목록 (`Nothing else is an exception`)          |
| 매 턴 3줄 구조 | `nudgeLine`(실명) 상시 + `matchLine`(지목) 매치 시에만                           |
| 키워드 매칭    | `matchDomain` — 정규식 미사용, ASCII 경계 / 비-ASCII 부분 문자열                 |
| stdin          | `readPromptFromStdin` (2s), entry 에서 주입                                      |
| 자동 선출 제외 | `selfProvider` + `electableProviders`, `crosscheck_only` optional 필드           |
| 점유율 표기    | `behindTarget` → `underShare` (`under share: <p> Npt`, electable 만)             |
| 설정 UI        | provider 별 `crosscheck only` 토글 + 키워드 다국어 안내                          |
| 검증           | 단위 666 · E2E 62(3 skip) · typecheck 0 · 번들 8,815 B / 9,051 B (cap 10,240 B)  |

### codex 위임 결과 평가

두 건을 codex 에 위임하고 핵심만 채택했다.

1. **`matchDomain`** — 정규식을 아예 쓰지 않는 결정이 정확했다. 키워드는 사용자가
   쓴 문자열이라 `c++` · `node(js)` 가 그대로 들어오는데, 이스케이프 문제를 원천
   제거한다. ASCII 경계 판정을 `charCodeAt` 으로 한 것도 저장소 관례와 맞는다.
   기각한 부분: 헬퍼 4개를 함수 내부에 정의(매 호출 클로저 재생성), 훅 내부 호출인데
   런타임 타입 검증 과잉, 한 provider 의 키워드가 비정상이면 전체를 `null` 로 버리는
   설계. 모듈 스코프 + organ 분해로 재작성했다.
2. **`readPromptFromStdin`** — 청크를 문자열로 바꾸지 않고 바이트로 모아 EOF 후 한
   번만 디코딩하는 것이 핵심이고, 한글이 청크 경계에서 깨지는 문제의 정확한 해법이다.
   타이머를 `unref` 하지 않는 근거(호스트가 stdin 을 열어두면 타임아웃이 유일한
   탈출구)도 타당했다. 기각한 부분: 1 MiB `allocUnsafe` 선할당(매 턴 비용), 빈
   `catch` 12개(대부분 도달 불가). 이미 저장소에 있는 filid `readStdin` 패턴
   (`chunks: Buffer[]` → `Buffer.concat`)에 크기 상한과 `prompt` 추출만 얹었다.

번들에서 실제로 동작하는지는 Layer B E2E 로 고정했다 — 한글 프롬프트를 stdin 으로
넣어 `Matched "코드" → /cennad:codex` 가 나오는지 확인한다.

## 인터페이스 요약 (태스크 간 계약)

| 심볼                                      | 생산 | 소비                                  |
| ----------------------------------------- | ---- | ------------------------------------- |
| `strengthLabel(strength): string`         | T1   | `injectStatic.ts`                     |
| `routingStance(strength): string[]`       | T1   | `injectStatic.ts`                     |
| `joinKeywords(raw, fallback?)`            | T2   | `momentLines.ts`                      |
| `momentLines(keywords, active): string[]` | T2   | `injectStatic.ts`                     |
| `RatioLane`                               | T3   | `injectDynamic.ts`, `behindTarget.ts` |
| `behindTarget(lanes): string`             | T3   | `injectDynamic.ts`                    |
| `nudgeLine(strength): string`             | T3   | `injectDynamic.ts`                    |
