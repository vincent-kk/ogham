## Requirements

`@ogham/plugin-compiler` 는 in-place 멀티호스트 체제의 어댑터 생성기다. 4대 요구:

1. **Claude 무결손** — Claude 가 소비하는 파일(`.claude-plugin/**`·`.mcp.json`·`skills/`·`agents/`·`hooks/`)을 **읽기만** 하고 절대 쓰지 않는다. 쓰기 대상은 어댑터 4종뿐.
2. **결정성** — 동일 정본 → 바이트 동일 어댑터(`stableJson`). `sync` 직후 `sync --check` 는 항상 통과.
3. **호환성 표면화** — Codex 가 조용히 무시/오동작할 항목(미지원 훅 이벤트, `Read` matcher, MCP env/command 변수)을 진단으로 노출.
4. **무배선 실행** — `tsx` 로 즉시 실행, dist 없음. 루트 스크립트 `plugin:adapters`·`plugin:adapters:check` 가 유일한 진입.

## API Contracts

### CLI (`src/main.ts`)

```
node --import tsx tools/plugin-compiler/src/main.ts sync [--check] [pluginDir ...]
```

- 인자 없음: 저장소 루트의 `plugins/*`(`.claude-plugin/plugin.json` 보유 디렉터리) 전부 + 루트 어댑터 2종.
- `pluginDir ...`: 해당 플러그인만 (루트 어댑터 제외).
- `--check`: 디스크에 쓰지 않고 재생성-비교. 불일치(stale/missing) 또는 error 진단 시 exit 1.
- 출력: 진단(⚠/✗) → stderr, 파일별 액션(created/updated/unchanged/stale) 요약 → stdout.

### 생성물 (어댑터 4종)

| 파일                                    | 소스                                                  | 규칙                                                                                                                                                |
| --------------------------------------- | ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `plugins/<p>/.codex-plugin/plugin.json` | `.claude-plugin/plugin.json` + `.mcp.json` + 디렉터리 | 메타 필드 복사, `skills`/`hooks` 존재 시 명시 선언, `mcpServers` 인라인(서버명=플러그인명, args 상대화, `type` 생략, `env.OGHAM_HOST="codex"` 주입) |
| `plugins/<p>/mcp_config.json`           | `.mcp.json`                                           | 동일 래퍼 + args 상대화, 서버명 원본 유지, `env.OGHAM_HOST="agy"` 주입. MCP 없으면 미생성                                                           |
| `.agents/plugins/marketplace.json`      | `.claude-plugin/marketplace.json`                     | 항목별 `{name, source:{source:"local",path}, policy:{AVAILABLE,ON_INSTALL}, category(Title-case)}`                                                  |
| `.agents/plugins.json`                  | `.claude-plugin/marketplace.json`                     | `{"entries":[{"path":"./plugins/<n>"}…]}` (agy declared)                                                                                            |

- args 상대화: `${CLAUDE_PLUGIN_ROOT}/X` 접두를 `X` 로. 변수가 접두 이외 위치·env·command 에 있으면 **error** (생성물이 깨지므로).
- **호스트 마커 env**: 생성되는 MCP 선언에 `OGHAM_HOST` (`codex`/`agy`)를 주입한다. Claude `.mcp.json` 은 무수정이므로 마커 부재 = claude. 호스트 결합 런타임 쓰기(maencof `CLAUDE.md`, filid `.claude/rules/`)가 이 값으로 분기한다(런타임 분기 구현은 플레이북 Stage 4). 훅 프로세스의 호스트 감지는 Codex 주입 env `PLUGIN_DATA` 유무.
- 버전 동기화: `scripts/inject-version.mjs` 가 `.claude-plugin` 과 함께 `.codex-plugin/plugin.json`(존재 시)을 갱신 — sync 재실행 없이 릴리즈 가능.

### 진단

| level   | code                  | 조건                                                               |
| ------- | --------------------- | ------------------------------------------------------------------ |
| error   | `mcp-variable-args`   | `${CLAUDE_PLUGIN_ROOT}` 가 args 접두 이외 위치·command·env 에 존재 |
| warning | `codex-unknown-event` | hooks.json 에 Codex 미지원 이벤트(10종 밖) — Codex 가 조용히 무시  |
| warning | `codex-read-matcher`  | PreToolUse/PostToolUse matcher 에 `Read` — Codex 는 미발화         |

## Acceptance Criteria

- `yarn plugin:adapters` 2회 연속 실행 시 2회째 전 파일 `unchanged`.
- `yarn plugin:adapters:check` 가 어댑터 손편집·정본 변경 후 미재생성을 exit 1 로 검출.
- 훅 5종 플러그인(cennad·filid·imbas·maencof·maencof-lens)에서 `codex-read-matcher` 외 진단 0 (filid·imbas 는 `Read|Write|Edit` matcher 로 warning 1 씩 예상).
- Claude 소비 파일의 git diff 0 (도구 실행 전후).
