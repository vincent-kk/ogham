# Hooks — filid pattern

filid 의 hook 패턴을 그대로 따른다. 디렉토리 `hooks/` 는 설정 전용 노드, 실제 구현은 `src/hooks/<name>/<name>.entry.ts` → esbuild 번들 → `bridge/<name>.mjs`.

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
            "command": "node \"${CLAUDE_PLUGIN_ROOT}/libs/run.cjs\" \"${CLAUDE_PLUGIN_ROOT}/bridge/inject-static.mjs\"",
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
            "command": "node \"${CLAUDE_PLUGIN_ROOT}/libs/run.cjs\" \"${CLAUDE_PLUGIN_ROOT}/bridge/inject-dynamic.mjs\"",
            "timeout": 3
          }
        ]
      }
    ]
  }
}
```

- 두 hook 만 등록. 본 플러그인은 PreToolUse / SubagentStart / SessionEnd 가 필요 없다.
- `timeout` 값은 short. inject-static 은 디스크 read + 문자열 빌드뿐.
- `${CLAUDE_PLUGIN_ROOT}` 와 `libs/run.cjs` 사용은 filid 동일.

## `libs/run.cjs`

filid 의 `packages/filid/libs/run.cjs` 를 그대로 복사한다 (cross-platform Node 탐색기). 변경 금지.

## `src/hooks/` 트리

```
src/hooks/
├── INTENT.md
├── index.ts                          # barrel
├── inject-static/
│   ├── INTENT.md
│   ├── inject-static.ts              # buildStaticPayload(config) → string
│   ├── inject-static.entry.ts        # 진입점 (process.stdout.write + exit 0)
│   └── utils/
│       ├── load-config.ts            # fs read + safe JSON parse (defaults 병합)
│       ├── tone-phrase.ts            # intervention_strength → tone string
│       └── join-keywords.ts          # provider keywords → 한 줄 표시
├── inject-dynamic/
│   ├── INTENT.md
│   ├── inject-dynamic.ts             # buildDynamicPayload(counter) → string
│   ├── inject-dynamic.entry.ts
│   └── utils/
│       ├── load-counter.ts           # fs read + parent-pid 비교 후 0 표시 결정
│       └── format-ratio.ts           # current vs target ratio + drift
└── shared/                           # 양쪽 hook 공통
    ├── paths.ts                      # COGAIR_HOME (= ~/.claude/plugins/cogair) 등 빌드 시 inline (constants 와 별개)
    ├── safe-read-json.ts
    └── now-iso.ts
```

- `src/hooks/*` 는 **외부 npm 모듈 import 금지**. `node:fs`, `node:path`, `node:os`, `node:crypto` 만.
- `src/core/*`, `src/types/*` import 도 금지 (zod 가 번들에 빨려들면 cap 위반). 필요한 타입은 `src/hooks/shared/` 에 별도 선언.
- 각 `*.entry.ts` 는 main logic 을 호출 후 `process.exit(0)` 종료. 예외 발생해도 stderr 만 쓰고 `process.exit(0)` (훅 실패가 사용자 턴 차단하면 안 됨).

## `inject-static` 페이로드

세션당 1회 stdout 출력. Claude Code 가 `additionalContext` 로 처리.

입력: `~/.claude/plugins/cogair/config.json` (없으면 defaults).

출력 형식:

```
[cogair] Static policy

Provider ratio: gemini <r_g> / codex <r_c> (denominator <sum>)
Intervention strength: <-2..+2> (<tone phrase>)
Available providers: gemini, codex

Keyword mapping
- gemini → <config.keywords.gemini>
- codex  → <config.keywords.codex>

Routing guidance
- Default model alias: <config.default_model>
- Default multi_agent: <config.default_multi_agent>
- Delegate when (a) keyword matches the provider's domain,
  (b) task suits the provider's strength (gemini: live search, large context;
  codex: heavy code, sandboxed shell), or
  (c) keeping near the configured ratio.
- Fall back to Claude when neither provider clearly fits.
- Use /codex and /gemini skills, never invoke CLI binaries directly.
```

Tone phrase:

| value | phrase |
|---|---|
| `-2` | very conservative — prefer Claude unless strongly indicated |
| `-1` | conservative — bias to Claude |
| ` 0` | balanced — follow ratio and keywords |
| `+1` | proactive — delegate when reasonable |
| `+2` | aggressive — delegate by default when any keyword matches |

## `inject-dynamic` 페이로드

매 턴 stdout 출력.

입력: `~/.claude/plugins/cogair/runtime/counter.json` (없으면 0/0 으로 표시).

출력 형식 (호출이 한 번이라도 있는 경우):

```
[cogair] Live state

Calls this session: gemini <c_g> · codex <c_c> · total <total>
Current ratio:      gemini <pct_g>% · codex <pct_c>%
Target ratio:       gemini <pct_target_g>% · codex <pct_target_c>%
Drift:              gemini <±n> · codex <±n>   (target − current)
```

호출 0건:

```
[cogair] Live state

No calls this session yet.
```

부모 PID 변경 감지: `process.ppid !== counter.parent_pid` 면 카운터가 0/0 으로 표시. 카운터 파일 자체의 리셋은 다음 MCP 호출 시 `core/counter-manager` 가 수행 — hook 은 read-only 라 파일을 쓰지 않는다.

활성 provider 가 없는 경우 (`ratio.gemini + ratio.codex == 0`): 마지막 줄에 `Available providers: none — run /setup` 추가.

## 빌드 가드 — `scripts/build-hooks.mjs`

filid 의 `build-hooks.mjs` 그대로 복제 + `hookEntries` 만 교체:

```javascript
const hookEntries = [
  { name: 'inject-static',  maxBytes: LIGHT_HOOK_BYTES },
  { name: 'inject-dynamic', maxBytes: LIGHT_HOOK_BYTES },
];
```

`LIGHT_HOOK_BYTES = 10 * 1024` 충분 — 두 hook 모두 디스크 read + 문자열 빌드만 한다.

`FORBIDDEN_PATTERNS` 는 filid 와 동일하게 유지 (zod, glob 패밀리, @ast-grep/napi, @modelcontextprotocol/sdk, lodash 등). 위반 시 빌드 실패.

## 디버깅

- `node bridge/inject-static.mjs` 직접 실행하면 stdout 으로 페이로드 확인.
- 잘못된 config 는 stderr 경고 후 defaults 로 진행 — Claude 세션이 끊기지 않는다.
- Build 후 `wc -c bridge/inject-static.mjs` 로 사이즈 확인 가능 (10 KB 이내).
