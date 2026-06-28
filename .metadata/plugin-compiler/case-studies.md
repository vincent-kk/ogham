# Case Studies — deilen(스칼라) · filid(구조 분기) · 로드맵

두 PoC 로 2층 차이([host-capability-matrix.md](./host-capability-matrix.md) §2)를 모두 검증한다. deilen 은 L1 스칼라만, filid 는 L2 구조 분기(SessionEnd·agents) 전부를 친다.

## A. deilen — L1 스칼라 PoC (가장 단순)

구성: MCP(server `tools`) + skills 2(`preview`/`setup`). **agent·hook 없음** → 순수 스칼라 층만 노출.

### A.1 정본 → 산출물

`definitions/plugin.yaml`:

```yaml
name: deilen
mcp: { server: tools, entry: bridge/mcp-server.cjs }
components: { skills: true, agents: false, hooks: false }
```

`definitions/skills/preview.md` 본문 (현행 `mcp_tools_render_viewer` → 토큰):

```markdown
2. **Render.** Call {{tool:render_viewer}} with `{ content | path, title? }` ...
3. **Collect.** Call {{tool:collect_feedback}} with `{ session_id, wait_seconds }` ...
```

emit 결과:

| 산출물                   | Claude                                                                                               | Codex                                                                          |
| ------------------------ | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| 매니페스트               | `.claude-plugin/plugin.json` (`mcpServers: ./.mcp.json`)                                             | `.codex-plugin/plugin.json` (동필드 + 파일명)                                  |
| `.mcp.json`              | `{"mcpServers":{"tools":{"command":"node","args":["${CLAUDE_PLUGIN_ROOT}/bridge/mcp-server.cjs"]}}}` | `{"tools":{"command":"node","args":["${PLUGIN_ROOT}/bridge/mcp-server.cjs"]}}` |
| `{{tool:render_viewer}}` | `mcp_tools_render_viewer`                                                                            | `mcp__tools__render_viewer` ⚠️                                                 |

### A.2 이 PoC 가 닫는 위험 (실측 게이트)

- ⚠️#1 MCP `args` 의 `${PLUGIN_ROOT}` 전개 — Codex 가 deilen MCP 서버를 띄우는지로 직접 확인.
- ⚠️#2 Codex 도구명 실제 포맷 — 생성 본문의 `mcp__tools__render_viewer` 로 모델이 실제 호출되는지.
- 통과 시: agent·hook 없는 모든 플러그인(entrez 일부, atlassian skills 등)은 동일 경로로 거의 자동 이식.

## B. filid — L2 구조 분기 PoC (가장 복잡)

구성: MCP(server **`t`**) + skills 19 + **agents 14** + **hooks 5(SessionEnd 포함)**. 모든 구조 차이를 동시에 노출.

### B.1 Hook 재배선 — `SessionEnd`

현행 5 이벤트 중 `SessionEnd → bridge/session-cleanup.mjs` 만 Codex 에 부재. 나머지(SessionStart/PreToolUse/SubagentStart/UserPromptSubmit)는 그대로(매처만 번역).

`definitions/hooks/session-cleanup.yaml`:

```yaml
event: SessionEnd
entry: bridge/session-cleanup.mjs
timeout: 3
fallback: session-start-sweep
```

- **무엇을 하나**: `removeSessionFiles(session_id, cwd)` — 그 세션의 `session-context-{hash}`·`cached-context-{hash}` 삭제.
- **재배선의 함정(런타임 분기 필요)**: `SessionEnd` 는 "**현재** 세션 삭제", `SessionStart` 는 그 시점에 과거 세션ID 를 모름 → "현재 제외 **stale sweep**" 으로 의미가 바뀐다. 따라서 핸들러가 두 모드를 지원해야 함:
  - Claude(`SessionEnd`): 입력 `session_id` 1개 삭제 (현행 유지).
  - Codex(`SessionStart` sweep): 현재 `session_id` **제외** 한 잔여 `*-context-*` 정리.
  - → `cacheManager` 에 `sweepStaleSessions(exceptId, cwd)` 추가(런타임 소폭 보강). 정본 `fallback` 이 이 모드를 트리거.
- **매처 번역**: `PreToolUse: Read|Write|Edit` → Codex 프로파일이 `apply_patch` 계열로 재작성(`Read` 매처는 대응 없음 → 경고). filid pre-tool-use 가드의 Codex 커버리지 한계를 빌드 경고로 표면화.

### B.2 Agents 14 — dual-emit

frontmatter 분포(조사): 전원 `model: sonnet`(단 `fractal-architect: opus`), `tools` 는 **read-only**(Read,Glob,Grep: drift-analyzer·fractal-architect·qa-reviewer) 와 **write**(+Write,Edit,Bash: 나머지) 두 부류, `maxTurns` 20–60.

정본 정규화 예 — `definitions/agents/qa-reviewer.yaml`:

```yaml
name: qa-reviewer
description: "Post-implementation reviewer focused on metrics, rule compliance."
instructions: |
  You are the FCA-AI QA/Reviewer ...
capability: read-only # Read,Glob,Grep → codex sandbox_mode: read-only
model: standard # sonnet → codex 매핑 슬러그
bundle: standalone # 리뷰 위원회는 격리 필요
maxTurns: 40 # Codex drop
```

emit:

- Claude → `agents/qa-reviewer.md` (현행과 동일: `tools: Read, Glob, Grep` / `model: sonnet` / `maxTurns: 40`).
- Codex → `.codex/agents/qa-reviewer.toml`:
  ```toml
  name = "qa-reviewer"
  description = "Post-implementation reviewer focused on metrics, rule compliance."
  developer_instructions = """You are the FCA-AI QA/Reviewer ..."""
  model = "<codex-slug>"
  sandbox_mode = "read-only"
  ```
- **설치**: Codex `.codex/agents/*.toml` 14개는 플러그인 번들 밖 → filid `setup` skill 이 repo/user 레벨로 복사하는 단계를 떠안음(설치 원자성 회복).

### B.3 이 PoC 가 닫는 위험

- `SessionEnd` 재배선 패턴(런타임 sweep 모드)의 일반화 가능성 → maencof/imbas 에 재사용.
- 14 agents 정규화로 `capability` 2값 + `model` 2등급 매핑의 적합성 확인.
- 도구명 server `t` 케이스로 토큰 조립의 서버명 비균일성 검증(deilen `tools` 와 대조).

## C. 로드맵 (단계적 도입)

| 단계     | 범위              | 산출                                                          | 게이트                              |
| -------- | ----------------- | ------------------------------------------------------------- | ----------------------------------- |
| **0**    | 설계              | 이 문서                                                       | (현재)                              |
| **1**    | deilen 스칼라 PoC | 토큰 치환 + manifest/mcp/skill emitter, claude+codex 프로파일 | 실측 ⚠️#1#2 통과                    |
| **2**    | filid 구조 PoC    | hook 재배선(sweep) + agent dual-emit + `setup` 설치           | `SessionEnd` 동등성·agent 격리 확인 |
| **3**    | 전체 이관         | 10 플러그인 `definitions/` 화 + CI 스냅샷                     | 호스트별 스모크 그린                |
| **확장** | 신규 호스트       | `profiles/<host>.ts`                                          | —                                   |

## D. Open Questions (결정 보류)

1. **실측 3종**([host-capability-matrix.md](./host-capability-matrix.md) §5): MCP args 변수 전개 / Codex 도구명 포맷 / 프로젝트-로컬 MCP. **단계 1 PoC 전 차단 해소 필수**.
2. **생성물 커밋 여부**: `bridge/` 처럼 커밋 vs 릴리스 빌드 생성 (compiler-architecture §4).
3. **`.mcp.json` 단일 vs 분리**: 호스트별 `.mcp.<host>.json` 분리가 안전하나, 두 매니페스트가 같은 `./.mcp.json` 을 가리킬 수 있는지(형식 충돌) 확인.
4. **FCA 정합**: `definitions/` 도입 시 "skill = SKILL.md 한 장" self-describing 규칙과의 재정렬(정본 vs 산출물 어느 쪽이 organ 인지).
5. **maencof recap/commit**: `fallback: drop` 수용 vs `Stop` 재배선의 UX 절충 결정.
