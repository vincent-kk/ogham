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
│       ├── tonePhrase.ts            # intervention_strength → tone string
│       └── joinKeywords.ts          # provider keywords → 한 줄 표시
├── injectDynamic/
│   ├── INTENT.md
│   ├── index.ts                     # barrel
│   ├── injectDynamic.ts             # buildDynamicPayload(config, counter) → string
│   ├── build/
│   │   └── injectDynamic.entry.ts
│   └── utils/
│       ├── loadCounter.ts           # fs read + parent-pid 비교 후 0 표시 결정
│       └── formatRatio.ts           # current vs target ratio + drift
└── shared/                          # LCA organ — 두 hook 이 공유
    ├── paths.ts                     # CENNAD_HOME (= ~/.claude/plugins/cennad) 등 빌드 시 inline
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
  ratio: { codex, antigravity, claude }        // ProviderRatio = { value, enabled }
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

`AntigravityFlags` (`option_flags.antigravity`): `{ sandbox: boolean; skip_permissions: boolean }`.
`ClaudeFlags` (`option_flags.claude`): `{ permission_mode: 'default' | 'acceptEdits' | 'auto' | 'dontAsk' | 'plan' | 'bypassPermissions' }`.

## `injectStatic` 페이로드

세션당 1회 stdout 출력.

입력: `~/.claude/plugins/cennad/config.json` (없으면 defaults).

`config.ratio` 는 `{ codex: { value, enabled }, antigravity: { value, enabled }, claude: { value, enabled } }` (백분율 + 활성 플래그). 레거시 정수 비율은 `pickRatio` 에서 백분율 + enabled 로 마이그레이션해 표시. hook 은 read-only 이므로 디스크 파일은 다음 MCP write 때 정규화된다.

출력:

```
[cennad] Static policy

Provider ratio: codex <r_c>% · antigravity <r_a>% · claude <r_cl>%
Active providers: <codex | antigravity | claude | codex, antigravity | ... | none — run /setup>
Intervention strength: <-2..+2> (<tone phrase>)

Keyword mapping
- codex       → <config.keywords.codex>
- antigravity → <config.keywords.antigravity>
- claude      → <config.keywords.claude>

Routing guidance
- Option flags:        <JSON.stringify(config.option_flags)>
- Delegate when (a) a keyword matches the provider's domain,
  (b) the task suits the provider's strength (antigravity: live search, large context;
  codex: heavy code, sandboxed shell; claude: reasoning, writing, analysis, review), or
  (c) keeping near the configured ratio.
- Use /cennad:codex, /cennad:antigravity, and /cennad:claude skills, never invoke CLI binaries directly.
```

`Active providers` 는 `enabled === true` 인 provider 만 나열. 전부 false 면 `none — run /setup`.

`option_flags` 표시는 `JSON.stringify(config.option_flags)` 한 줄.

Tone phrase:

| value | phrase                                                      |
| ----- | ----------------------------------------------------------- |
| `-2`  | very conservative — prefer Claude unless strongly indicated |
| `-1`  | conservative — bias to Claude                               |
| ` 0`  | balanced — follow ratio and keywords                        |
| `+1`  | proactive — delegate when reasonable                        |
| `+2`  | aggressive — delegate by default when any keyword matches   |

## `injectDynamic` 페이로드

매 턴 stdout 출력.

입력: `~/.claude/plugins/cennad/runtime/counter.json` (없으면 0/0 으로 표시).

출력 (호출 ≥ 1):

```
[cennad] Live state

Calls this session: codex <c_c> · antigravity <c_a> · claude <c_cl> · total <total>
Current ratio:      codex <pct_c>% · antigravity <pct_a>% · claude <pct_cl>%
Target ratio:       codex <pct_target_c>% · antigravity <pct_target_a>% · claude <pct_target_cl>%
Drift:              codex <±n> · antigravity <±n> · claude <±n>   (target - current)
```

호출 0건:

```
[cennad] Live state

No calls this session yet.
```

부모 PID 변경 감지: `process.ppid !== counter.parent_pid` 면 카운터가 0/0 으로 표시. 카운터 파일 자체의 리셋은 다음 MCP 호출 시 `core/counterManager` 가 수행 — hook 은 read-only.

목표 비율(`Target ratio`)은 `ratio.<provider>.enabled === false` 인 provider 를 0% 로 표시. drift 계산도 0 기준.

활성 provider 없음 (`!ratio.codex.enabled && !ratio.antigravity.enabled && !ratio.claude.enabled`): 마지막 줄에 `Available providers: none — run /setup` 추가.

## 빌드 가드 — `scripts/buildHooks.mjs`

filid 의 `build-hooks.mjs` 복제 + `hookEntries` 만 교체:

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
