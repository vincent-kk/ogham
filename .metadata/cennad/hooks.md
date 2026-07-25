# Hooks — filid pattern

filid 의 hook 패턴을 그대로 따른다. 디렉토리 `hooks/` 는 설정 전용 노드, 실제 구현은 `src/hooks/<name>/build/<name>.entry.ts` → esbuild 번들 → `bridge/<name>.mjs`.

`hooks.json` 에서 hook 을 호출할 때는 `libs/run.cjs` cross-platform runner 를 거친다.

## `hooks/hooks.json`

```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "node \"${CLAUDE_PLUGIN_ROOT}/libs/run.cjs\" \"${CLAUDE_PLUGIN_ROOT}/bridge/injectStatic.mjs\"",
            "timeout": 5
          }
        ]
      }
    ],
    "UserPromptSubmit": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "node \"${CLAUDE_PLUGIN_ROOT}/libs/run.cjs\" \"${CLAUDE_PLUGIN_ROOT}/bridge/injectDynamic.mjs\"",
            "timeout": 3
          }
        ]
      }
    ]
  }
}
```

- 두 hook 만 등록.
- 산출물 파일명은 카멜케이스 (`injectStatic.mjs`, `injectDynamic.mjs`).
- `${CLAUDE_PLUGIN_ROOT}` 와 `libs/run.cjs` 사용은 filid 동일.

## `libs/run.cjs`

filid 의 `packages/filid/libs/run.cjs` 를 그대로 복사한다. 변경 금지.

## `src/hooks/` 트리

```
src/hooks/
├── INTENT.md
├── index.ts
├── injectStatic/
│   ├── INTENT.md
│   ├── index.ts                     # barrel
│   ├── injectStatic.ts              # buildStaticPayload(config) → string
│   ├── build/
│   │   └── injectStatic.entry.ts    # 진입점 (process.stdout.write + exit 0)
│   └── utils/
│       ├── strengthLabel.ts         # intervention_strength → 한 단어 라벨
│       ├── routingStance.ts         # intervention_strength → guidance 라인 배열
│       ├── domainLines.ts           # 활성 provider → 도메인 소유자 표
│       └── joinKeywords.ts          # keywords 트림 + caller fallback
├── injectDynamic/
│   ├── INTENT.md
│   ├── index.ts                     # barrel
│   ├── injectDynamic.ts             # buildDynamicPayload(config, counter) → string
│   ├── build/
│   │   └── injectDynamic.entry.ts
│   └── utils/
│       ├── readPromptFromStdin.ts   # 훅 stdin JSON → `prompt` (2s 타임아웃)
│       ├── loadCounter.ts           # fs read + parent-pid 비교 후 0 표시 결정
│       ├── asNonNegInt.ts           # counter 필드 정수 가드
│       ├── underShare.ts            # 점유율 미달 → `under share: <p> Npt`
│       ├── matchDomain.ts           # 프롬프트 × 키워드 → 소유 provider
│       ├── isAsciiOnly.ts           # 매칭 규칙 분기 (경계 vs 부분 문자열)
│       ├── hasWordBoundaryMatch.ts  # ASCII 단어 경계 검색 (정규식 미사용)
│       ├── nudgeLine.ts             # intervention_strength → 상기 한 줄
│       ├── matchLine.ts             # 매치된 턴의 소유자 지목 한 줄
│       └── providerList.ts          # provider 실명 나열 포매터
└── shared/                          # LCA organ — 두 hook 이 공유
    ├── selfProvider.ts              # 호스트 자신의 provider (resolveHostDescriptor)
    ├── electableProviders.ts        # enabled − crosscheck_only − self
    ├── paths.ts                     # CENNAD_HOME (기본 pluginCache('cennad'), env override) 등 빌드 시 inline
    ├── safeReadJson.ts
    ├── nowIso.ts
    ├── configTypes.ts               # HookConfig, HookCounter, Ratio, ProviderRatio, OptionFlags, ...
    ├── loadConfig.ts                # fs read + safe JSON parse + 레거시 ratio 마이그레이션
    ├── pickKeywords.ts
    ├── pickModel.ts
    ├── pickOptionFlags.ts
    ├── pickPreamble.ts
    ├── pickProviderRatio.ts
    ├── pickRatio.ts
    ├── pickRecencyFactor.ts
    └── pickStrength.ts
```

- `src/hooks/*` 는 **외부 npm 모듈 import 금지**. `node:fs`, `node:path`, `node:os`, `node:crypto` 만.
- `src/core/*`, `src/types/*` import 금지 (zod 가 번들에 빨려들면 cap 위반). 필요한 타입은 `src/hooks/shared/` 에 별도 선언.
- 각 `*.entry.ts` 는 main logic 호출 후 `process.exit(0)` 종료. 예외 발생해도 stderr 만 쓰고 `process.exit(0)`.

## Provider 모델 — 3-key 구조

cennad 는 **codex**, **antigravity**, **claude** 3개 provider 를 지원한다.

config 의 `ratio`, `keywords`, `option_flags`, `preamble`, `recency_factor` 는 모두 3-key 구조(`codex`, `antigravity`, `claude`)를 갖는다. 훅은 이를 read-only 로 소비한다.

```
HookConfig {
  ratio: { codex, antigravity, claude }        // ProviderRatio = { value, enabled, crosscheck_only? }
  keywords: { codex, antigravity, claude }
  option_flags: { codex, antigravity, claude }
  preamble: { codex, antigravity, claude }
  recency_factor: { codex, antigravity, claude }
  intervention_strength: -2 | -1 | 0 | 1 | 2
}

HookCounter {
  codex: number
  antigravity: number
  claude: number
  is_stale: boolean
}
```

## enabled vs electable — 자동 선출 제외

두 집합을 구분한다.

```
enabled   = 이 provider 를 쓸 수 있다 (crosscheck 참가 · 사용자 명시 호출)
electable = enabled AND NOT crosscheck_only AND NOT self-host
```

훅이 스스로 지목·권고하는 대상은 `electable` 뿐이고, crosscheck 참가자는 `enabled`
전부다. 제외 사유는 둘이며 결과는 같다.

**(1) self-exclusion — 구조적·자동.** 호스트가 이미 돌리고 있는 모델을 그 세션이
다시 선출하는 것은 위임이 아니다. 호스트 판정은 `shared/selfProvider.ts` 가
`resolveHostDescriptor(process.env)` 로 한다 — 이것이 **훅 전용 경로**다.
`detectHost()` 는 마커 전용이고 훅 프로세스는 마커를 받지 못하므로, 그걸 쓰면
어느 호스트에서든 `claude` 로 오판한다.

| 호스트 | 감지 신호                                           | 제외 provider |
| ------ | --------------------------------------------------- | ------------- |
| claude | 마커·시그널 없음 (기본)                             | `claude`      |
| codex  | `OGHAM_HOST=codex` 또는 `PLUGIN_DATA`               | `codex`       |
| agy    | `OGHAM_HOST=agy` 또는 `ANTIGRAVITY_CONVERSATION_ID` | `antigravity` |

**(2) `crosscheck_only` — 사용자 설정.** `ProviderRatio` 의 optional 필드이며 설정
UI 의 provider 별 토글이 켠다. 비율 0% 로 대신하지 않는 이유: 0% 는 "목표 점유율
0" 이지 "자동 선출 대상 아님" 이 아니다 — 0% 여도 도메인 매치는 성립한다.

`AntigravityFlags` (`option_flags.antigravity`): `{ sandbox: boolean; skip_permissions: boolean }`.
`ClaudeFlags` (`option_flags.claude`): `{ permission_mode: 'default' | 'acceptEdits' | 'auto' | 'dontAsk' | 'plan' | 'bypassPermissions' }`.

## `injectStatic` 페이로드

세션당 1회 stdout 출력.

입력: `<CENNAD_HOME>/config.json`. `<CENNAD_HOME>` 은 기본
`~/.claude/plugins/cennad` 이며 non-blank `CENNAD_CONFIG_PATH` 로 override
가능하다. 별도 home 의 config 가 없거나 JSON/object 로 읽을 수 없으면 기본
home 의 config 를 읽기 전용 fallback 으로 시도하고, 둘 다 읽을 수 없으면
defaults 를 사용한다.

`config.ratio` 는 `{ codex: { value, enabled }, antigravity: { value, enabled }, claude: { value, enabled } }` (백분율 + 활성 플래그). 레거시 정수 비율은 `pickRatio` 에서 백분율 + enabled 로 마이그레이션해 표시. hook 은 read-only 이므로 디스크 파일은 다음 MCP write 때 정규화된다.

출력:

```
[cennad] Static policy

Provider ratio: codex <r_c>% · antigravity <r_a>% · claude <r_cl>%
Active providers: <enabled 전부 | none — run /setup>
Auto-routing: <electable | none — every enabled provider is crosscheck-only>
Intervention strength: <-2..2> (<label>)

Domains with owners
- <keywords.codex> → `/cennad:codex`
- <keywords.antigravity> → `/cennad:antigravity` (crosscheck only — by setup)
- <keywords.claude> → `/cennad:claude` (crosscheck only — this session's own model)
- a claim worth an independent second opinion → `/cennad:crosscheck`

Routing guidance
- Option flags:        <JSON.stringify(config.option_flags)>
<강도별 stance 라인 — 아래 표>
- The ratio line reports past turns. Never dispatch to move it.
- An explicit user instruction outranks every line above.
- Dispatch through the skills above; never invoke CLI binaries directly.
```

**두 명단은 의미가 다르다.**

- `Active providers` = `enabled === true` 인 전부. **crosscheck 참가자 명단**이며
  `/cennad:crosscheck` 스킬이 이 줄을 읽는다 — 의미를 바꾸면 crosscheck 가 깨진다.
- `Auto-routing` = `electable` = enabled − `crosscheck_only` − 호스트 자신.
  훅이 스스로 지목할 수 있는 집합.

`Domains with owners` 는 활성 provider 를 **전부** 낸다. 자동 선출에서 빠진
provider 도 표에 남기고 사유를 접미로 붙인다 — 제외는 라우팅에서만 일어나고,
사용자가 이름을 부르거나 crosscheck 로 쓰는 경로는 그대로다. 키워드가 공백이면
provider 기본 도메인(`heavy code, refactor, sandboxed shell` /
`live web search, very large context` / `reasoning, writing, analysis, review`)으로
대체하고, crosscheck 줄은 활성 provider 가 2개 이상일 때만 붙는다.

전부 disabled 면 `Domains with owners` 가 통째로 생략되고 마지막 줄이
`- Run /cennad:setup to enable a provider before delegating.` 로 바뀐다.
enabled 는 있는데 electable 이 0이면 stance 대신
`- Nothing is auto-routed here; use crosscheck or name a provider yourself.` 한 줄만 나간다.

`option_flags` 표시는 `JSON.stringify(config.option_flags)` 한 줄.

강도 라벨은 설정 UI 슬라이더 눈금과 같은 어휘다. 강도가 실제로 바꾸는 것은 라벨이
아니라 **stance 라인**이며, 다섯 단계는 확신도(`clearly stronger` 류 — 세션이 자기
자신을 채점하므로 항상 통과한다)가 아니라 **세 축의 이산 조합**으로 갈린다:
(i) 매치가 없을 때의 기본값, (ii) 사용자가 provider 를 지명해야 하는가,
(iii) 예외 목록이 열려 있는가 닫혀 있는가.

| value | label     | (i) 매치 없음 | (ii) 사용자 지명 | (iii) 예외        |
| ----- | --------- | ------------- | ---------------- | ----------------- |
| `-2`  | `subtle`  | 여기서 처리   | 필요             | 위임 자체가 예외  |
| `-1`  | `soft`    | 여기서 처리   | 불필요           | 열린 판단         |
| ` 0`  | `neutral` | 여기서 처리   | 불필요           | 시작 전 명시 결정 |
| `+1`  | `active`  | 여기서 처리   | 불필요           | 소유 범위 서술    |
| `+2`  | `strong`  | 분리분만 위임 | 불필요           | **닫힌 4개 목록** |

문구 정본은 `src/hooks/injectStatic/utils/routingStance.ts` 다 — 여기에 복제하지
않는다. 마지막 두 줄(비율로 위임 금지 · 사용자 지시 우선)은 강도와 무관하게 항상
붙는다.

훅 번들 가드가 `moment.js` 를 단어 단위로 차단하므로, 주입 산문에 `moment` 라는
단어를 쓰면 빌드가 실패한다 — 이 문서와 코드 모두 `domain` 을 쓴다.

## `injectDynamic` 페이로드

매 턴 stdout 출력.

입력: 훅 stdin JSON 의 `prompt` + `<CENNAD_HOME>/runtime/counter.json` (없으면 0).

매 턴 주입이라 **토큰 점유 최소화가 이 훅의 제1 제약**이다. 매치가 없는 턴은 2줄,
키워드가 매치된 턴만 3줄. 새 정보가 생겨도 줄을 늘리지 않고 기존 줄에 압축한다.

출력 (호출 ≥ 1, 매치 있음):

```
[cennad] Calls: codex <c_c> · antigravity <c_a> · claude <c_cl> (total <total>) · under share: <p> Npt
<nudge>
Matched "<keyword>" → /cennad:<p> ...
```

호출 0건이면 첫 줄이 `[cennad] No delegations yet this session.` 로 바뀐다 (점유율
조각 생략 — 호출이 없으면 모든 provider 가 미달이라 정보가 없다). 매치가 없으면
셋째 줄이 빠진다. 활성 provider 가 하나도 없으면 nudge 없이 한 줄만:
`[cennad] No provider enabled — run /cennad:setup.` 이고, enabled 는 있는데
electable 이 0이면 nudge 자리에
`Every enabled provider is crosscheck-only here; nothing is auto-routed.` 가 온다.

`under share` 는 `설정 비율 - 현재 점유율` 이 양수인 **electable** provider 를 큰
순으로 나열한다 (`under share: claude 33pt · antigravity 8pt`). 양수가 없으면 조각
자체가 빠진다. 자동 선출 대상이 아닌 provider 는 목록에 오르지 않는다 — 위임으로
메울 수 없는 격차를 보여줄 이유가 없다. 단위 `pt` 는 퍼센트 포인트이며, 이 줄은
과거 보고일 뿐 목표가 아니다 (SessionStart stance 가 그렇게 못 박는다).

nudge 는 `electable` provider 실명을 나열하고(`codex or antigravity`), match line 은
매치된 키워드와 소유 스킬을 지목한다. 플레이스홀더를 쓰지 않는 이유는 SessionStart
블록이 컴팩션으로 사라져도 이 줄만으로 해석돼야 하기 때문이다. 문구 정본은
`utils/nudgeLine.ts` · `utils/matchLine.ts`.

**키워드 매칭 규칙** (`utils/matchDomain.ts`):

- 프롬프트·키워드 모두 소문자로 접어 비교하고, **정규식을 만들지 않는다** —
  키워드는 사용자가 쓴 문자열이라 `c++` · `node(js)` 가 그대로 들어온다.
- ASCII 전용 키워드는 단어 경계 검사 (`code` 가 `decode` 에 걸리지 않는다).
- 비-ASCII 를 포함한 키워드는 부분 문자열 (`코드` ⊂ "코드를", "코드리뷰") —
  한국어는 조사가 명사에 붙으므로 경계 검사로는 영영 매치되지 않는다.
- 매치가 여럿이면 `electable` 순서 → 사용자가 키워드를 쓴 순서로 하나만 고른다.

부모 PID 변경 감지: `process.ppid !== counter.parent_pid` 면 카운터가 0 으로 표시. 카운터 파일 자체의 리셋은 다음 MCP 호출 시 `core/counterManager` 가 수행 — hook 은 read-only.

## 빌드 가드 — `scripts/buildHooks.mjs`

filid 의 `buildHooks.mjs` 복제 + `hookEntries` 만 교체:

```javascript
const hookEntries = [
  { name: "injectStatic", maxBytes: LIGHT_HOOK_BYTES },
  { name: "injectDynamic", maxBytes: LIGHT_HOOK_BYTES },
];
```

`LIGHT_HOOK_BYTES = 10 * 1024`. 디스크 read + 문자열 빌드만 하므로 충분.

`FORBIDDEN_PATTERNS` 는 filid 와 동일. 위반 시 `process.exit(1)`.

## 디버깅

- `node bridge/injectStatic.mjs` 직접 실행하면 stdout 으로 페이로드 확인.
- 잘못된 config 는 stderr 경고 후 defaults 로 진행 — Claude 세션이 끊기지 않는다.
- 빌드 후 `wc -c bridge/injectStatic.mjs` 로 사이즈 확인 (10 KB 이내).
