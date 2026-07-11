# Case Studies — deilen(스칼라) · filid(구조 분기) · 로드맵

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
- **OS 하드 의존 실측**: `filid/skills/migrate/migrate.sh` 가 유일한 POSIX 전용 쉘 스크립트(bash 필요) — Windows 축의 알려진 예외로 Stage 3 에서 Node 재작성 또는 POSIX-한정 고지. filid·imbas·maencof·maencof-lens 4종엔 `run-hook.cmd`(Windows 대체 진입점, build-hooks.mjs 배선)가 이미 존재. deilen `openBrowser` 는 child_process 직접 사용이나 darwin/win32/linux 자체 분기로 안전.
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

| 정본 (논리 이벤트)                          | Claude emit | Codex emit (훅 채널 없음 — 실측)                                                          | agy emit                                                 |
| ------------------------------------------- | ----------- | ----------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| SessionStart, fallback: pre-invocation-once | 그대로      | skill lazy-init 지시 + `AGENTS.md`                                                        | `PreInvocation` + once-guard                             |
| PreToolUse (Read\|Write\|Edit)              | 그대로      | **드롭** + AGENTS.md 규칙 서술                                                            | `PreToolUse` + matcher 번역 (agy 도구 어휘 ⚠️Stage 실측) |
| SubagentStart                               | 그대로      | 드롭 + 경고                                                                               | 드롭 + 경고 (대응 이벤트 없음)                           |
| UserPromptSubmit                            | 그대로      | 드롭                                                                                      | `PreInvocation` (경량 페이로드로 재작성)                 |
| SessionEnd, fallback: stale-sweep           | 그대로      | **MCP 서버 기동 시 sweep** (`cacheManager.sweepStaleSessions(exceptId)` 런타임 소폭 보강) | `Stop` 재배선                                            |

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

## E. Open Questions (갱신)

1. ~~생성물 커밋 여부~~ → **커밋으로 결정** (bridge/ 일관, git 설치 지원). 손편집 금지.
2. ~~`.mcp.json` 단일 vs 분리~~ → **호스트별 파일이 타깃 트리로 물리 분리**되어 무의미화.
3. **FCA 정합**: `definitions/`(정본)와 `targets/`(산출물)의 노드 분류 — `targets/` 는 organ(생성물, INTENT 불요) 취급이 자연스러우나 zero-peer-file 규칙과의 정합 확인 필요.
4. **maencof recap/commit**: agy 는 `Stop` 재배선으로 부분 보존 가능. Codex 는 MCP-기동 sweep 만 가능 — recap UX 자체는 드롭. 수용 여부 사용자 결정.
5. ~~Claude `.mcp.json` 의 `cwd` 지원 여부~~ → **지원 확정** (공식 plugins-reference: cwd 필드 + 전 필드 `${CLAUDE_PLUGIN_ROOT}` 전개 + plugin.json 인라인). 단 Claude emit 은 무결손 원칙상 현행 변수-args 유지, cwd 동형화는 `process.cwd()` 감사 후 선택적 단순화 (matrix §4.1).
6. Codex `interface` 스토어 메타의 정본 필드(`store:`) 채택 범위.
