# IR Schema — 정본(Intermediate Representation) 스키마

호스트 중립 플러그인 기술. 모든 정본은 플러그인의 `definitions/` 아래 위치하며, 컴파일러가 이를 읽어 호스트별 산출물을 emit 한다. 정본은 **어떤 호스트도 직접 언급하지 않는다**(호스트 지식은 프로파일에만).

## 0. 디렉터리

```
plugins/<pkg>/
├── definitions/              ← 정본 (사람이 작성·유지하는 SSoT)
│   ├── plugin.yaml           ← 매니페스트 + MCP 서버 선언
│   ├── skills/<name>.md      ← skill 본문 (토큰 규약 사용)
│   ├── agents/<name>.yaml    ← 페르소나 + bundle 전략
│   └── hooks/<name>.yaml     ← 라이프사이클 의도 + fallback
├── src/ · bridge/            ← 런타임 (호스트 중립, 무수정)
└── (생성물은 .gitignore 또는 커밋 — compiler-architecture.md §디렉터리)
```

원칙: 정본은 선언적. 로직·조건부는 최소화하고, 못 빼는 구조 차이는 **명시 필드**(예: hook `fallback`, agent `bundle`)로 선언해 emitter 가 해석한다.

## 1. `plugin.yaml`

```yaml
name: deilen # kebab-case, 호스트 공통
version: 0.1.8 # inject-version 이 package.json 에서 주입 (직접 수정 금지)
description: "..." # 호스트 공통
keywords: [markdown, viewer]
author: { name: "Vincent K. Kelvin" }
license: MIT

mcp:
  server: tools # ★ 서버 논리명. 도구 참조 조립의 기준 (filid=t, deilen=tools)
  entry: bridge/mcp-server.cjs # pluginRoot 기준 상대경로
  # 산출물: Claude .mcp.json {"mcpServers":{tools:{...}}}
  #         Codex  .mcp.json {"tools":{...}}  또는 {"mcp_servers":{tools:{...}}}

components: # 이 플러그인이 보유한 정본 종류 (emitter 활성화)
  skills: true
  agents: false # deilen 은 없음
  hooks: false
```

스칼라 정책: `version` 은 기존 `inject-version.mjs` 가 `package.json` → 주입. 컴파일러는 이 동기화 지점을 흡수한다(값 1개 주입 → 프로파일 전체 주입의 특수 케이스).

## 2. Skill 정본 — `definitions/skills/<name>.md`

frontmatter(호스트 공통 + Claude 확장) + 토큰 규약을 쓰는 본문.

```markdown
---
name: preview # 공통 (필수)
description: "..." # 공통 (필수)
# --- 아래는 Claude 전용. Codex emit 시 무시(=드롭), Claude emit 시 유지 ---
user_invocable: true
argument-hint: ""
---

2. **Render.** Call {{tool:render_viewer}} with `{ content | path, title? }` ...
3. Use {{skill:setup}} to configure ... ← 상호참조도 토큰
```

### 토큰 규약 (L1 스칼라 바인딩)

| 토큰                 | 의미           | Claude emit               | Codex emit                        |
| -------------------- | -------------- | ------------------------- | --------------------------------- |
| `{{tool:<logical>}}` | MCP 도구 참조  | `mcp_<server>_<logical>`  | `mcp__<server>__<logical>` ⚠️실측 |
| `{{skill:<name>}}`   | skill 상호참조 | `/<plugin>:<name>`        | `$<name>`                         |
| `{{pluginRoot}}`     | 플러그인 루트  | `${CLAUDE_PLUGIN_ROOT}`   | `${PLUGIN_ROOT}`                  |
| `{{var:<key>}}`      | 임의 상수      | 프로파일/`plugin.yaml` 값 | 동일                              |

- `<server>` 는 본문에 없고 `plugin.yaml: mcp.server` 에서 주입 → 본문은 서버명 변경에 불변.
- 토큰 미사용(리터럴 `mcp_tools_x`)은 **린트 에러**로 막아 정본이 호스트 방언에 오염되지 않게 한다.
- 미해결 토큰(오타)은 빌드 실패.

## 3. Agent 정본 — `definitions/agents/<name>.yaml`

```yaml
name: qa-reviewer
description: "Post-implementation reviewer focused on metrics, rule compliance."
instructions:
  | # 시스템 프롬프트 본문 (Claude=md body, Codex=developer_instructions)
  You are the FCA-AI QA/Reviewer ...
capability: read-only # read-only | write  → 호스트별 권한으로 번역
model: standard # standard | deep  (논리 등급; 프로파일이 슬러그로 매핑)
bundle: standalone # ★ standalone | embed  (§3.1)
maxTurns: 40 # Claude 전용. Codex emit 시 드롭(경고 로그)
```

### 3.1 `bundle` 플래그 — agent 번들 불가(L2) 해소

| 값           | Claude 산출물      | Codex 산출물                                            | 적합                                           |
| ------------ | ------------------ | ------------------------------------------------------- | ---------------------------------------------- |
| `standalone` | `agents/<name>.md` | `.codex/agents/<name>.toml` (별도 설치)                 | 진짜 병렬 격리 필요 (prawf 위원회, filid 리뷰) |
| `embed`      | `agents/<name>.md` | 오케스트레이팅 skill 본문에 `{{persona:<name>}}` 인라인 | 단순 역할, 설치 원자성 우선                    |

### 3.2 필드 번역 규칙 (프로파일이 수행)

| 정본                    | Claude                                       | Codex                           |
| ----------------------- | -------------------------------------------- | ------------------------------- |
| `capability: read-only` | `tools: Read, Glob, Grep`                    | `sandbox_mode: read-only`       |
| `capability: write`     | `tools: Read, Write, Edit, Glob, Grep, Bash` | `sandbox_mode: workspace-write` |
| `model: standard`       | `model: sonnet`                              | (프로파일 매핑 슬러그)          |
| `model: deep`           | `model: opus`                                | (프로파일 매핑 슬러그)          |
| `maxTurns: N`           | `maxTurns: N`                                | 드롭 + 경고                     |

→ 기존 `tools` 자유나열을 `capability` 2값으로 정규화(filid 14 agents 가 정확히 read-only/write 두 부류). 더 세밀한 allowlist 가 필요하면 `tools:` 명시 override 를 선택적으로 허용.

## 4. Hook 정본 — `definitions/hooks/<name>.yaml`

```yaml
event: SessionEnd # 의도한 라이프사이클 이벤트
matcher: "*"
entry: bridge/session-cleanup.mjs
timeout: 3
fallback: session-start-sweep # ★ 호스트에 event 부재 시 (§4.1)
```

### 4.1 `fallback` — 이벤트 부재(L2) 선언

`event` 가 호스트 프로파일의 지원 집합에 없을 때 emitter 동작:

| `fallback`            | 동작                                                       | 적용                                                            |
| --------------------- | ---------------------------------------------------------- | --------------------------------------------------------------- |
| `session-start-sweep` | 해당 호스트에서 `SessionStart` 로 재배선 (멱등 sweep 모드) | filid 캐시 정리 (현재세션 삭제 → stale sweep, 런타임 분기 필요) |
| `stop`                | `Stop` 이벤트로 재배선                                     | 가벼운 턴 종료 마감                                             |
| `drop`                | 해당 호스트에서 생략 + 빌드 경고                           | 동등 복원 불가 UX (maencof recap/commit)                        |

- `Read|Write|Edit` 매처는 Codex 프로파일에서 `apply_patch` 계열로 재작성(매처 번역표는 프로파일 소유).
- 핸들러 본문(`entry`)은 호스트 무관 재사용. 단 `session-start-sweep` 은 입력 세션ID 의미가 바뀌므로 런타임이 sweep 모드를 지원해야 함 → [case-studies.md](./case-studies.md) §filid.

## 5. 검증 불변식 (스키마 레벨)

- 모든 skill 본문 도구 참조는 `{{tool:}}` 토큰 (리터럴 `mcp_` 금지).
- `bundle: embed` agent 는 자신을 인라인할 오케스트레이팅 skill 이 존재해야 함.
- `fallback` 없는 hook 이 비-공통 이벤트를 쓰면 빌드 실패.
- `mcp.server` 는 `[a-z][a-z0-9]*` (도구명 조립 안전).
