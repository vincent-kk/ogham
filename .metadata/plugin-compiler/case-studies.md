# Case Studies — deilen(스칼라) · filid(구조 분기) · 로드맵

> **상태: 보류 — 개발예정.** 실측·PoC 결과는 유효하나 전체 이관(§C Stage 3)은 착수하지 않는다(2026-07-12 — [migration-playbook-deferred.md](./migration-playbook-deferred.md)). 본문의 훅 집계(§0 표 등)는 SessionEnd 제거 완료 **이전** 기준이다.

두 PoC 로 2층 차이([host-capability-matrix.md](./host-capability-matrix.md) §2)를 모두 검증한다. deilen 은 L1 스칼라만, filid 는 L2 구조 분기(훅·agents) 전부를 친다. 2026-07-11 실측으로 기존 "실측 게이트 3종" 은 해소·정정되었고(§D), 잔여 게이트가 재정의되었다.

## 0. 플러그인 이식 지형 (2026-07-11 집계)

| 플러그인     | hooks (이벤트)                                             | mcp 서버명 | skills | agents | 이식 난이도                               |
| ------------ | ---------------------------------------------------------- | ---------- | ------ | ------ | ----------------------------------------- |
| prawf        | —                                                          | (MCP 없음) | 6      | 10     | ★ 최단순 — agy 무변환, Codex agents 만 L2 |
| deilen       | —                                                          | tools      | 2      | 0      | ★ L1 PoC 대상                             |
| entrez       | —                                                          | tools      | 5      | 1      | ★★                                        |
| r-statistics | —                                                          | tools      | 6      | 3      | ★★                                        |
| atlassian    | —                                                          | tools      | 6      | 3      | ★★                                        |
| maencof-lens | SessionStart                                               | t          | 3      | 1      | ★★★ (훅 1)                                |
| cennad       | SessionStart, UserPromptSubmit                             | tools      | 6      | 0      | ★★★ (훅 2)                                |
| imbas        | SessionStart, PreToolUse, SubagentStart, UPS, SessionEnd   | tools      | 14     | 3      | ★★★★ (훅 5)                               |
| maencof      | SessionStart, UPS, PreToolUse, **PostToolUse**, SessionEnd | t          | 28     | 5      | ★★★★★ (훅 5 + 최대 스킬)                  |
| filid        | SessionStart, PreToolUse, SubagentStart, UPS, SessionEnd   | t          | 20     | 14     | ★★★★★ (L2 PoC 대상)                       |

- **서버명 전역 충돌 (Codex)**: `tools` 6개(atlassian·cennad·deilen·entrez·imbas·r-statistics), `t` 3개(filid·maencof·maencof-lens) — 스코프 없는 Codex 도구명(`mcp__tools.*`)에서 **동시 설치 즉시 충돌**. 서버명=플러그인명 오버라이드 결정의 수치 근거.
- 훅 없는 5개(prawf·deilen·entrez·r-statistics·atlassian)는 Stage 1 경로만으로 3-호스트 이식 완결.
- **정본화 변환량** (인벤토리 정밀 집계): SKILL.md 내 `mcp__` 리터럴 — filid 269 · imbas 250 · maencof 144 · atlassian 82 · cennad 12 · maencof-lens 12 · r-statistics 8 · deilen 6 · entrez 6 · prawf 0 ≈ **789건** + agents 그랜트 177건. full-form 표기가 일관되어 `{{tool:}}` 토큰화는 스크립트 1회 변환으로 처리 가능. `/plugin:skill` 상호호출도 광범위(`/maencof:build` 34회, `/imbas:manifest` 32회 등) — `{{skill:}}` 토큰화 동일 경로.
- **agents `tools` 그랜트 두 계열**: 인라인 콤마(filid·prawf — 빌트인만, 이식 마찰 낮음) vs YAML 블록(나머지 6종 — full-form `mcp__` 권한 직접 명시 → agent emitter 가 호스트별 도구명 재매핑 필수). imbas engineer 의 `[OP:]` 시맨틱 표기(도구명 하드코딩 회피)는 이식 친화 선례.
- **OS 하드 의존 실측**: `filid/skills/migrate/migrate.sh`(POSIX 전용 bash)가 유일한 하드 OS 의존이었으나 순수 Node `migrate.mjs` 로 재작성되어 해소됨 — 3-호스트 이식 시 OS-한정 고지 불요. filid·imbas·maencof·maencof-lens 4종엔 `run-hook.cmd`(Windows 대체 진입점, build-hooks.mjs 배선)가 이미 존재. deilen `openBrowser` 는 child_process 직접 사용이나 darwin/win32/linux 자체 분기로 안전.
- **cennad 자기참조 조정**: cennad 는 codex/agy/claude CLI 를 위임 호출하는 플러그인 — Codex/agy 호스트에 이식하면 "자기 호스트를 다시 스폰"하는 순환이 생긴다. 호스트별 emit 시 자기 자신 provider 를 위임 대상에서 제외(또는 nested-session 정책 명시)하는 플러그인-국소 조정 필요.

## A. deilen — L1 스칼라 PoC (가장 단순)

구성: MCP(server `tools`) + skills 2(`preview`/`setup`). **agent·hook 없음** → 순수 스칼라 층만 노출.

### A.1 정본 → 산출물 (3-호스트)

`definitions/plugin.yaml`:

```yaml
name: deilen
mcp: { server: tools, entry: bridge/mcp-server.cjs }
components: { skills: true, agents: false, hooks: false }
```

emit 결과:

| 산출물                   | Claude (`targets/claude/`)                                                                                   | Codex (`targets/codex/`)                                                                          | agy (`targets/agy/`)                                       |
| ------------------------ | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| 매니페스트               | `.claude-plugin/plugin.json`                                                                                 | `.codex-plugin/plugin.json` (+`interface`)                                                        | `plugin.json`                                              |
| MCP 설정                 | `.mcp.json` `{"mcpServers":{"tools":{command:"node",args:["${CLAUDE_PLUGIN_ROOT}/bridge/mcp-server.cjs"]}}}` | `.mcp.json` `{"mcpServers":{"deilen":{command:"node",args:["bridge/mcp-server.cjs"],"cwd":"."}}}` | `mcp_config.json` `{"mcpServers":{"tools":{…,"cwd":"."}}}` |
| `{{tool:render_viewer}}` | `mcp__plugin_deilen_tools__render_viewer`                                                                    | `mcp__deilen.render_viewer`                                                                       | `mcp_tools_render_viewer` ⚠️추정                           |
| 런타임                   | `bridge/` `libs/` 복사                                                                                       | 동일                                                                                              | 동일                                                       |

### A.2 이 PoC 가 닫는 잔여 위험

- agy **인터랙티브 모드** 플러그인 MCP 기동 (`--print` 는 미기동 실측 — matrix §4.4).
- agy 도구명 실제 형식 / Codex skills 노출·호출 구문(`$<skill>`).
- Codex 서버명=플러그인명 오버라이드의 도구명 충돌 회피 검증 (deilen+filid 동시 설치).
- deilen 서버 로직의 `process.cwd()` 의존 감사 (cwd 전략 부작용 — 세션 cwd 가 아니라 플러그인 루트가 됨).
- 통과 시: agent·hook 없는 플러그인(entrez, atlassian, r-statistics, prawf 스킬군)은 동일 경로로 거의 자동 이식.

## B. filid — L2 구조 분기 PoC (가장 복잡)

구성: MCP(server **`t`**) + skills 19 + **agents 14** + **hooks 5**. 모든 구조 차이를 동시에 노출.

### B.1 Hooks — 호스트별 3분기 (기존 "SessionEnd 재배선" 설계 대체)

현행 5 훅: SessionStart(setup) · PreToolUse(Read|Write|Edit 가드) · SubagentStart(agent-enforcer) · UserPromptSubmit · SessionEnd(session-cleanup).

| 정본 (논리 이벤트)                          | Claude emit | Codex emit (훅 채널 없음 — 실측)                                                          | agy emit                                                                     |
| ------------------------------------------- | ----------- | ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| SessionStart, fallback: pre-invocation-once | 그대로      | skill lazy-init 지시 + `AGENTS.md`                                                        | `PreInvocation` + once-guard                                                 |
| PreToolUse (Read\|Write\|Edit)              | 그대로      | **드롭** + AGENTS.md 규칙 서술                                                            | `PreToolUse` + matcher 번역 (agy 도구 어휘 ⚠️Stage 실측)                     |
| SubagentStart                               | 그대로      | 드롭 + 경고                                                                               | 드롭 + 경고 (대응 이벤트 없음)                                               |
| UserPromptSubmit                            | 그대로      | 드롭                                                                                      | `PreInvocation` (경량 페이로드로 재작성)                                     |
| SessionEnd, fallback: stale-sweep           | 그대로      | **MCP 서버 기동 시 sweep** (`cacheManager.sweepStaleSessions(exceptId)` 런타임 소폭 보강) | **드롭 + MCP-기동 sweep** (agy Stop 은 매 턴 발화 — SessionEnd 로 매핑 금지) |

- 재배선의 함정(유지): `SessionEnd` 는 "현재 세션 삭제", sweep 은 "현재 제외 잔여 정리" — 런타임이 두 모드를 지원해야 함.
- stdin 계약 차이는 러너 어댑터가 흡수 ([compiler-architecture.md](./compiler-architecture.md) §5) — `bridge/*.mjs` 무수정.

### B.2 Agents 14 — 호스트별 전략

frontmatter 분포(조사 유지): 전원 `model: sonnet`(단 `fractal-architect: opus`), `tools` 는 read-only/write 두 부류, `maxTurns` 20–60 → 정본 `capability` 2값 + `model` 2등급으로 정규화.

- Claude → `agents/<n>.md` (현행과 바이트 동일 — 동등성 게이트).
- Codex → `targets/codex/.codex-agents/<n>.toml` 스테이징; **filid `setup` skill 이 `~/.codex/agents/`(또는 repo `.codex/agents/`) 설치 단계를 떠안음**. `maxTurns` 드롭 경고.
- agy → `agents/<n>.md` 무변환 번들 (수용 실측 ✅, 스폰 의미론은 Stage 실측).

### B.3 이 PoC 가 닫는 위험

- 훅 3분기(특히 Codex 무훅 보상 채널)의 실효성 — filid 의 구조 가드가 AGENTS.md 서술만으로 얼마나 유지되는지 사용성 판단.
- 러너 어댑터의 agy 계약 왕복 (camelCase stdin → Claude 계약 → injectSteps 응답).
- 14 agents 정규화 + Codex 설치 스텝 UX.
- server `t` vs `deilen=tools` — 토큰 조립의 서버명 비균일성 + Codex 오버라이드 검증.

## C. 로드맵 (단계적 도입)

| 단계     | 범위              | 산출                                                                               | 게이트                                                                        |
| -------- | ----------------- | ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| **0**    | 설계              | 이 문서군                                                                          | (완료 — 실측 반영)                                                            |
| **1**    | deilen 스칼라 PoC | 토큰 치환 + manifest/mcp/skill/runtime emitter, 프로파일 3종, `targets/` 트리      | §A.2 잔여 실측 4건 (agy 인터랙티브 MCP·도구명, Codex skills 구문, cwd 부작용) |
| **2**    | filid 구조 PoC    | hook 3분기 emit + 러너 어댑터 + agent dual-emit + `setup` 설치 스텝                | sweep 동등성·AGENTS.md 보상 실효성·agy 훅 왕복                                |
| **3**    | 전체 이관         | 10 플러그인 `definitions/` 화 + 루트 마켓플레이스 전환 + CI(스냅샷·windows-latest) | **Claude 바이트 동일성** 그린 + 호스트별 스모크 그린                          |
| **확장** | 신규 호스트       | `profiles/<host>.ts` (Cursor, OpenCode, …)                                         | —                                                                             |

## D. 실측 게이트 결산 (2026-07-11)

**실전 스키마 검증**: 실제 deilen 스킬 2종 + 실제 filid 에이전트 14종 + filid `.mcp.json`(→`mcp_config.json` 파일명만 변경)을 `agy plugin validate` 에 통과시킴 — 전 컴포넌트 processed. agy 이식이 "파일명·배치 변경 + 훅 변환" 수준임을 실물로 확인.

기존 3 게이트는 로컬 실측으로 종결:

1. ~~MCP args 변수 전개~~ → **부정 확정**, `cwd: "."` 전략으로 해소 (matrix §4.1).
2. ~~Codex 도구명 형식~~ → **확정**: `mcp__<server>.<tool>`, 플러그인 스코프 없음 → 서버명 오버라이드 정책 신설.
3. ~~프로젝트-로컬 MCP 등록~~ → **무관화**: 플러그인 번들 `.mcp.json` 이 세션에 자동 주입됨 실측.

신규 발견으로 추가된 게이트:

4. **Codex 플러그인 훅 전면 불가** (removed + 선언 시 세션 행) → 설계에 반영 완료, 대체 채널의 실효성만 Stage 2 판단.
5. **agy 인터랙티브 MCP 기동** — `--print` 미기동이 모드 한정인지 전면인지 (Stage 1). 아울러 공식 MCP 스키마에 `cwd` 필드가 없어(**Stdio: command/args/env 만**) 플러그인 MCP 의 상대 `args` 해석 기준(플러그인 디렉터리 vs 세션 cwd) 실측 필요 — 실패 시 setup 스킬의 절대 경로 주입으로 대체.
6. agy 도구명·agents 스폰 의미론·PreToolUse matcher 어휘 (Stage 1–2).

### D.1 Stage 1 실측 결과 (2026-07-11, 컴파일러 구현 후 실물 deilen 타깃)

컴파일러가 생성한 **실제 deilen codex 타깃**을 codex 에 설치·기동해 게이트를 실물로 통과:

- ✅ **Codex `cwd: "."` 전략 실물 확정**: `codex mcp list` 이 deilen 서버를 `Cwd=<install-root>/.` 로 등록, `bridge/mcp-server.cjs`(상대 args) 로 **실제 deilen MCP 서버 기동 성공**. PoC 가 아닌 실 서버·실 번들.
- ✅ **Codex 도구명 실물 확정**: `codex exec` 도구 목록에 `mcp__deilen.render_viewer`·`collect_feedback`·`close_viewer`·`open_settings` 4종 노출. `mcp__<server>.<tool>` + 서버명=플러그인명 오버라이드가 실 플러그인에서 동작.
- ✅ **agy 구조 수용**: `agy plugin validate targets/agy` → skills 2 + mcpServers 1 processed.
- ⏳ **잔여 — agy 인터랙티브 MCP 기동**: 헤드리스(`agy --print`)로는 플러그인 MCP 미스폰이라 실 도구명(`mcp_tools_*` 추정) 확정은 인터랙티브 세션 수동 스모크로 남음.

→ deilen(L1) 은 **3-호스트 중 Claude(바이트 등가)·Codex(실 스모크) 통과**, agy 는 구조 수용까지 확인. 실측 게이트 대부분 종결.

### D.2 L2 실측 (2026-07-11, extraction→compile 실물)

hook·agent 보유 플러그인을 `plugin-compiler extract`(현행 산출물 → 정본 역연산) 후 컴파일해 검증:

- **maencof-lens**(최소 L2: 1 hook·1 agent) — Claude 등가 통과. Codex: 훅 미생성 + `researcher.toml`(`sandbox_mode` 를 tools 에서 유도). agy: `hooks.json` named-group(SessionStart→PreInvocation, cwd-상대 커맨드), agent tool 그랜트 `mcp_t_*` 재매핑.
- **filid**(최대 L2: 19 skills·**14 agents**·**5 hooks**) — **Claude 바이트 등가 통과**(가장 강한 무결손 증명). Codex: 훅 **전량 드롭** + 14 `.codex-agents/*.toml`(write/read-only sandbox 정확 분류). agy: SessionStart/UserPromptSubmit→PreInvocation, PreToolUse matcher 번역(`Read|Write|Edit`→`view_file|write_to_file|replace_file_content`), **SessionEnd·SubagentStart 드롭**(SessionEnd 는 agy Stop 이 매 턴 발화라 무거운 정리를 매 턴 돌리지 않도록 제거 — MCP-기동 sweep 보상). 드롭은 hook-loss 경고로 표면화.

**설계 정정(구현 중 발견)**:

- 오라클 = npm `package.json:files` 가 아니라 **Claude 컴포넌트/런타임 세트**(files 는 agents 를 누락 — npm 용). `.omc`·`.DS_Store`·`INTENT.md`/`DETAIL.md`(FCA 거버넌스)는 설치 콘텐츠가 아니므로 오라클/추출에서 제외.
- agent frontmatter `tools:` 의 MCP 그랜트는 토큰화 시 YAML 흐름맵으로 오파싱 → AgentIR 은 frontmatter 를 yaml-parse 하지 않고 rawText 보존 + 관용 필드 추출.
- `{{pluginRoot}}` 은 **MCP args(cwd 전략)와 스킬/agent 프로즈 본문**의 두 컨텍스트 — 프로즈에서는 호스트별 값으로 치환(codex/agy 도 금지 아님). filid `${CLAUDE_PLUGIN_ROOT}/skills/migrate/migrate.mjs` 프로즈 참조가 노출한 케이스.
- 잔여 캐비엇: filid `cross-review/reference.md` 가 Claude 도구명 규약 자체(bare `mcp__plugin_filid_t__`)를 문서화 — 실제 호출 아니라 tool 이름이 없어 토큰화 대상 밖, codex/agy 에서 문서 텍스트로 잔존(기능 무해).

## E. Open Questions (갱신)

1. ~~생성물 커밋 여부~~ → **커밋으로 결정** (bridge/ 일관, git 설치 지원). 손편집 금지.
2. ~~`.mcp.json` 단일 vs 분리~~ → **호스트별 파일이 타깃 트리로 물리 분리**되어 무의미화.
3. **FCA 정합**: `definitions/`(정본)와 `targets/`(산출물)의 노드 분류 — `targets/` 는 organ(생성물, INTENT 불요) 취급이 자연스러우나 zero-peer-file 규칙과의 정합 확인 필요.
4. **maencof recap/commit**: agy `Stop` 은 매 턴 발화라 재배선 불가(무거운 commit/recap 을 매 턴 실행하게 됨) — SessionEnd 는 agy·Codex 모두 드롭. 정리성 작업은 MCP-기동 sweep 으로 보상하나, recap/commit UX 자체는 **손실**(hook-loss 경고로 고지). 수용 여부 사용자 결정.
5. ~~Claude `.mcp.json` 의 `cwd` 지원 여부~~ → **지원 확정** (공식 plugins-reference: cwd 필드 + 전 필드 `${CLAUDE_PLUGIN_ROOT}` 전개 + plugin.json 인라인). 단 Claude emit 은 무결손 원칙상 현행 변수-args 유지, cwd 동형화는 `process.cwd()` 감사 후 선택적 단순화 (matrix §4.1).
6. Codex `interface` 스토어 메타의 정본 필드(`store:`) 채택 범위.
