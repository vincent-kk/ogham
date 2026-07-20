# Adapter Architecture — Claude 정본 + in-place 호스트 어댑터

Claude 산출물(현행 `plugins/<pkg>/` 루트 파일)이 **정본이자 그대로 Claude 배포물**이고, Codex·Antigravity 호환은 그 옆에 **생성되는 소수의 추가 파일(어댑터)** 이 담당한다. 선행 사례는 ponytail(단일 트리 + `.codex-plugin` 병치 + Claude/Codex 훅 파일 공유). 실측 근거는 [host-capability-matrix.md](./host-capability-matrix.md).

## 1. 왜 재배치(`definitions/`→`targets/`)가 아니라 in-place 인가

구 설계(2026-07-11)는 Codex 가 플러그인 훅을 못 쓰고 산출물 구조가 갈라진다는 전제에서 호스트별 배포 트리를 분리했다. 0.144.4 재실측으로 전제가 무너졌다:

- Codex 가 `.claude-plugin/plugin.json`·`.claude-plugin/marketplace.json` 을 **fallback 으로 직접 읽고**, `hooks/hooks.json` 을 **Claude 포맷 그대로 파싱**한다 (matrix §4.2·§5.1).
- 남는 실차이는 Codex MCP args 변수 미전개·서버명 스코프, agy 파일명·훅 어휘뿐 — 전부 **추가 파일로 흡수 가능**하고, 호스트는 자기 파일만 읽으므로 서로 간섭하지 않는다.
- 재배치의 비용(3중 트리 커밋 노이즈·마켓플레이스 소스 전환·바이트 등가 게이트 운영)이 근거를 잃었다. in-place 는 Claude 파일을 **수정하지 않으므로** 무결손이 게이트가 아니라 구조로 보장된다.

트레이드오프(수용): 설치 시 타 호스트 어댑터 파일 몇 개가 함께 복사된다(구 요구 3 "정본만 전달" 완화). 각 파일은 수 KB JSON 이고 호스트가 읽지 않는 파일은 무해하다 — ponytail 도 동일 방식으로 15+ 호스트를 지원한다.

## 2. 파일 지형

```
ogham/                                  ← 저장소 루트 = 마켓플레이스 루트
├── .claude-plugin/marketplace.json     ← 정본 (Claude 소비, Codex fallback)
├── .agents/plugins/marketplace.json    ← [생성] Codex 마켓플레이스 (중첩 source/policy)
└── plugins/<pkg>/
    ├── .claude-plugin/plugin.json      ← 정본 (Claude 소비)
    ├── .mcp.json                       ← 정본 (Claude 전용 — 변수 args)
    ├── skills/ · agents/ · hooks/hooks.json · bridge/ · libs/ · public/ …  ← 정본 (호스트 공유)
    ├── plugin.json                     ← [생성] 루트 매니페스트 — agy 마커 + Codex 가 실제로 읽는 경로
    ├── .codex-plugin/plugin.json       ← [생성] 위와 바이트 동일 (Codex 규약 경로)
    ├── mcp_config.json                 ← [생성] agy MCP 설정 (MCP 보유 9개)
    ├── hooks.json                      ← [생성] agy 훅 (PreToolUse→named-group; filid·imbas·maencof)
    ├── .codex-plugin/hooks.json        ← [생성] Codex read-matcher 훅 (filid·imbas)
    └── .codex-plugin/skills/**         ← [생성] Codex 스킬 변이 — self-load 스폰 (entrez·filid·imbas·r-statistics)
```

`[생성]` 경로 7종(총 **322 파일**)이 어댑터의 전부다. 손편집 금지 — `tools/plugin-compiler` 가 정본에서 재생성한다. 매니페스트(2종)·agy MCP·agy 훅·Codex 훅·Codex 스킬 변이·마켓플레이스가 이에 해당한다.

**매니페스트가 왜 두 곳인가** (2026-07-15 실측): agy 는 루트 `plugin.json` 을 **플러그인 마커**로 요구한다 — 없으면 플러그인을 Claude 임포트로 처리하며 우리 `mcp_config.json` 을 덮어써 `OGHAM_HOST` 마커를 파괴한다. 그런데 **Codex 도 그 경로를 탐색해 `.codex-plugin/plugin.json` 을 가린다** — 루트에 최소 마커(`{"name":…}`)만 두면 **Codex MCP 가 통째로 죽는다**. 두 경로에 **같은 전체 매니페스트**를 두면 양쪽이 만족하고, 같은 빌더 출력이라 갈라질 수 없다. Claude 는 `.claude-plugin/plugin.json` 만 읽으므로 무영향(실측: `--plugin-dir` 로딩 로그·경고 수 동일).

**`.agents/plugins.json`(agy declared)은 폐기**됐다 — 항목별 경로·컨테이너 경로·마커 조합 3종 모두 로드 실패(matrix §4.4). agy 는 `.agents/plugins/<n>/` 디렉터리 스캔으로만 플러그인을 찾는다.

## 3. 어댑터 생성 규칙

### 3.1 매니페스트 — `plugin.json`(플러그인 루트) + `.codex-plugin/plugin.json` (**같은 내용, 두 경로**)

같은 빌더가 만든 **바이트 동일한** 파일을 두 곳에 둔다(스펙이 고정). 왜 두 곳인지는 §2 참조 — agy 는 루트 `plugin.json` 을 마커로 요구하고, Codex 도 그 경로를 읽어 `.codex-plugin` 을 가리기 때문에 **루트에는 전체 매니페스트가 들어가야** 한다.

`.claude-plugin/plugin.json` + `.mcp.json` + 디렉터리 사실에서 유도:

- 메타 필드(name·version·description·author·license·keywords·homepage·repository) 그대로 복사. version 은 `scripts/injectVersion.mjs` 가 `.claude-plugin` 과 함께 동기화.
- `"skills": "./skills/"` — skills/ 존재 시.
- `"hooks": "./hooks/hooks.json"` — hooks 존재 시 **명시 선언**(기본 발견에 의존하지 않음). Claude 와 같은 파일을 공유한다.
- `"mcpServers"`: 인라인 객체 — `.mcp.json` 의 각 서버를 (a) 서버명 → **플러그인명**으로 오버라이드(전역충돌 회피 — Codex 는 플러그인 스코프를 부여하지 않는다, 실측), (b) args 의 `${CLAUDE_PLUGIN_ROOT}/X` → 상대 `X` 로 변환, (c) **`"cwd": "."` 명시**(생략하면 Codex 가 **세션 cwd** 로 띄워 상대 args 가 깨지고 서버가 무음 사망한다 — matrix §4.1), (d) **`env.OGHAM_HOST="codex"` 주입** — 호스트 결합 런타임 쓰기(maencof `CLAUDE.md`, filid `.claude/rules/`)의 분기 신호(플레이북 Stage 4). 원본 env 는 보존하되 값에 변수가 있으면 오류.
- 대가: cwd 가 플러그인 루트로 고정되므로 **MCP 서버의 `process.cwd()` 는 사용자 세션 경로가 아니다**. 세션 cwd 를 알려주는 env 도 없고 MCP `roots` 도 불가(실측) — **프로젝트 좌표를 잃는다**. 런타임은 `@ogham/cross-platform` 의 `hostPaths`(`pluginRoot()`·`projectRoot()`)로 흡수하며, 프로젝트 경로는 **모델이 도구 인자 `project_root` 로 넘긴다**(matrix §9 · 플레이북 G7).
- Codex 가 이 파일을 읽는 순간 `.claude-plugin` fallback 과 `.mcp.json` 자동 발견이 **모두 차폐**된다 — Claude 전용 형식이 Codex 에 노출되지 않는 단일 차단점.

### 3.2 `mcp_config.json` (플러그인별, agy)

`.mcp.json` 과 동일 래퍼에 상대 args(서버명은 원본 유지 — agy 는 플러그인 단위 네임스페이스) + `env.OGHAM_HOST="agy"` 주입.

**상대 args 는 플러그인 디렉터리 기준으로 정상 해석된다**(G4 실측 — 절대경로 주입은 불필요했다). 단 **agy 는 `.agents/plugins/<n>/`(전역 `~/.agents/` 또는 워크스페이스)에 있는 플러그인의 MCP 만 띄운다** — `agy plugin install` 이 넣는 `~/.gemini/config/plugins/` 에서는 로드되지 않는다(matrix §4.4). 이건 우리 어댑터로 못 고치는 agy CLI 의 갭이다.

호스트 감지 규약(런타임 공통): MCP 서버 프로세스는 `process.env.OGHAM_HOST`(부재=claude), 훅 프로세스는 Codex 주입 env `PLUGIN_DATA` 유무로 분기한다. Claude 소비 파일에는 어떤 마커도 넣지 않는다.

### 3.3 루트 `.agents/plugins/marketplace.json` (Codex)

`.claude-plugin/marketplace.json` 에서 유도: 항목별 `{name, source: {source: "local", path: "./plugins/<n>"}, policy: {installation: "AVAILABLE", authentication: "ON_INSTALL"}, category}` (category 는 Claude 값 Title-case). `interface.displayName` = 마켓플레이스 name.

### ~~3.4 루트 `.agents/plugins.json` (agy declared)~~ — **폐기 (2026-07-15)**

agy 의 declared 레이어는 **어떤 형식으로도 플러그인을 로드하지 못했다** — 항목별 경로(`./plugins/<n>`)·컨테이너 경로(`./plugins`)·루트 `plugin.json` 마커 조합 3종 실패(matrix §4.4). agy 는 `.agents/plugins/<n>/` **디렉터리 스캔**으로만 플러그인을 찾는다. emitter 제거됨.

### 3.5 런타임 거동 어댑터 — agy 훅 · Codex 훅 · Codex 스킬 변이

정적 매니페스트 외에 호스트별 런타임 거동 차이를 흡수하는 생성물 3종(순수 변환은 런타임 라이브러리 `@ogham/cross-platform` 의 `agy-hooks`·`codex-hooks`·`agy-runner` 가 소유):

- **agy `hooks.json`** (루트, `buildAgyHooks`): Claude `PreToolUse` → agy named-group(`{"<plugin>":{"PreToolUse":[…]}}`). 핸들러 `node bridge/run-agy.mjs PreToolUse bridge/<handler>.mjs` — 러너가 agy camelCase stdin ↔ Claude 계약을 번역하고 `{decision:deny}` 를 역변환. **게이팅(deny) 훅만 방출**(주입 채널은 agy injectSteps 미렌더로 死코드). filid·imbas·maencof.
- **Codex `.codex-plugin/hooks.json`** (`buildCodexHooks`): Claude 훅 전체 복사 + read 잡는 PreToolUse matcher(`Read|Write|Edit`)에 `|Bash` 추가 — Codex 가 셸로 직렬화하는 단순 읽기(`cat`/`head`)를 `parseBashRead` 로 `Read` 승격. Claude `hooks/hooks.json` **바이트 불변**. filid·imbas.
- **Codex `.codex-plugin/skills/` 트리** (`buildCodexSkills`): Codex 엔 `subagent_type` 레지스트리가 없다 → 스폰 스킬을 self-load 형("subagent 띄워 `../_shared/personas/<id>.md` 채택")으로 재작성 + 전 스킬 copy-all(발견이 REPLACE) + 페르소나 복사. Codex 매니페스트 `skills` 를 이 dir 로 재지정. Claude `skills/` **바이트 불변**. entrez·filid·imbas·r-statistics(prawf 는 이미 self-load — 무변환).

## 4. 도구 (`tools/plugin-compiler`)

```
src/
├── main.ts                      CLI 진입: sync [--check] [pluginDir...]
├── constants/ types/ utils/     organ: 경로·호스트 상수 · 계약 타입 · stableJson
├── cli/                         fractal: 인자 파싱 · 진단/액션 포맷 (순수)
├── facts/                       fractal: Claude 정본 → PluginFacts/MarketplaceFacts (읽기 전용)
├── adapters/                    fractal: facts → 생성 파일 내용 (순수)
├── lint/                        fractal: 호환성 진단 (훅 이벤트 subset · matcher Read)
└── pipeline/                    fractal: 대상 열거 + 쓰기/검사 오케스트레이션
```

- **sync**: 대상 플러그인(무인자 = 전체 + 루트)의 어댑터를 재생성해 디스크와 다를 때만 쓴다(결정적 `stableJson` — 재실행 무변경).
- **sync --check**: 쓰지 않고 재생성-비교. 불일치·error 진단 시 exit 1 — CI clean-regen 게이트용.
- 진단: error(codex 미지원 훅 이벤트 잔존 — 조용한 무시 방지, MCP env/command 변수), warning(matcher 의 `Read` — Codex 미발화), 요약 출력.
- 실행: `yarn plugin:adapters` / `yarn plugin:adapters:check` (루트 스크립트, tsx 경유 — dist 없음).

## 5. 검증 전략

- **단위 스펙**: 순수 변환(adapters·lint·cli·utils)과 I/O 계약(pipeline·facts)을 vitest 로 고정 — 루트 `yarn test:run` 에 편입.
- **Claude 무결손**: 도구가 Claude 소비 파일을 쓰지 않는다(생성 대상은 §2 의 어댑터 전용 경로 7종뿐 — Codex 훅·스킬 변이도 `.codex-plugin/` 하위라 `hooks/hooks.json`·`skills/` 와 안 겹친다) — 코드 리뷰로 강제되는 구조적 보장. 별도 등가 게이트 불요.
- **결정성**: `sync` 직후 `sync --check` 가 통과(무 diff). CI 에는 `plugin:adapters:check` 를 편입해 정본-어댑터 desync 차단(배선은 플레이북 Stage 2).
- **스모크(호스트별)**: [migration-playbook.md](./migration-playbook.md) 게이트 G1–G6 — Codex 실설치(훅 trust·MCP 도구 목록·exec 거동), agy validate + 인터랙티브 기동.

## 6. 새 호스트 추가 절차

1. `adapters/` 에 해당 호스트 빌더 추가(필요 파일이 있을 때만).
2. `lint/` 에 그 호스트의 제약 진단 추가.
3. 플레이북에 설치·스모크 절차 추가. 정본(Claude 산출물)·런타임(src/bridge/libs)은 무수정.
