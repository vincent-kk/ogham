# IR Schema — 정본(Intermediate Representation) 스키마

> **상태: 보류 — 개발예정.** 이 스키마를 쓰는 마이그레이션은 착수하지 않는다(2026-07-12 — [migration-playbook-deferred.md](./migration-playbook-deferred.md)). 현재 어떤 플러그인에도 `definitions/` 는 없다.

호스트 중립 플러그인 기술. 모든 정본은 플러그인의 `definitions/` 아래 위치하며, 컴파일러가 이를 읽어 호스트별 산출물(`targets/<host>/`)을 emit 한다. 정본은 **어떤 호스트도 직접 언급하지 않는다**(호스트 지식은 프로파일에만).

## 0. 디렉터리

```
plugins/<pkg>/
├── definitions/              ← 정본 (사람이 작성·유지하는 SSoT)
│   ├── plugin.yaml           ← 매니페스트 + MCP 서버 선언
│   ├── skills/<name>.md      ← skill 본문 (토큰 규약 사용)
│   ├── agents/<name>.yaml    ← 페르소나 + bundle 전략
│   └── hooks/<name>.yaml     ← 라이프사이클 의도 + fallback
├── src/ · bridge/ · libs/    ← 런타임 (호스트 중립, 무수정)
└── targets/<host>/           ← 생성물 (커밋; compiler-architecture.md §4)
```

원칙: 정본은 선언적. 로직·조건부는 최소화하고, 못 빼는 구조 차이는 **명시 필드**(hook `fallback`, agent `bundle`)로 선언해 emitter 가 해석한다.

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
  # Claude emit: .mcp.json {"mcpServers":{tools:{command:"node",args:["${CLAUDE_PLUGIN_ROOT}/bridge/mcp-server.cjs"]}}}
  # Codex  emit: .mcp.json {"mcpServers":{deilen:{command:"node",args:["bridge/mcp-server.cjs"],"cwd":"."}}}
  #              ↑ 서버명을 플러그인명으로 오버라이드 (도구명에 플러그인 스코프가 없어 전역 충돌 회피)
  # agy    emit: mcp_config.json {"mcpServers":{tools:{command:"node",args:["bridge/mcp-server.cjs"],"cwd":"."}}}

store: # 선택. Codex `interface`(스토어 메타) 등 호스트 스토어 노출용
  displayName: "Deilen"
  shortDescription: "..."
  category: "Developer Tools"

components: # 이 플러그인이 보유한 정본 종류 (emitter 활성화)
  skills: true
  agents: false # deilen 은 없음
  hooks: false
```

스칼라 정책: `version` 은 기존 `inject-version.mjs` 가 `package.json` → 주입. 컴파일러는 이 동기화 지점을 흡수한다.

## 2. Skill 정본 — `definitions/skills/<name>.md`

frontmatter(호스트 공통 + Claude 확장) + 토큰 규약을 쓰는 본문.

```markdown
---
name: preview # 공통 (필수)
description: "..." # 공통 (필수)
# --- 아래는 Claude 전용. 타 호스트 emit 시 드롭 ---
user_invocable: true
argument-hint: ""
---

2. **Render.** Call {{tool:render_viewer}} with `{ content | path, title? }` ...
3. Use {{skill:setup}} to configure ... ← 상호참조도 토큰
```

### 토큰 규약 (L1 스칼라 바인딩)

| 토큰                 | 의미           | Claude emit                                            | Codex emit                                    | agy emit                        |
| -------------------- | -------------- | ------------------------------------------------------ | --------------------------------------------- | ------------------------------- |
| `{{tool:<logical>}}` | MCP 도구 참조  | `mcp__plugin_<plugin>_<server>__<logical>` (full-form) | `mcp__<plugin>.<logical>` ⚠️서버명=플러그인명 | `mcp_<server>_<logical>` ⚠️추정 |
| `{{skill:<name>}}`   | skill 상호참조 | `/<plugin>:<name>`                                     | `$<name>` ⚠️재확인                            | `<name>` skill 서술 참조        |
| `{{pluginRoot}}`     | 플러그인 루트  | `${CLAUDE_PLUGIN_ROOT}`                                | (사용 금지 — cwd 전략)                        | (사용 금지 — cwd 전략)          |
| `{{var:<key>}}`      | 임의 상수      | 프로파일/`plugin.yaml` 값                              | 동일                                          | 동일                            |

- `<server>` 는 본문에 없고 `plugin.yaml: mcp.server` + 프로파일 서버명 정책으로 조립 → 본문은 서버명 변경에 불변.
- Claude 는 full-form 을 쓴다(서브에이전트 grant 해석 규칙 — repo 관례).
- 토큰 미사용(리터럴 `mcp_`/`mcp__`)은 **린트 에러**. 미해결 토큰(오타)은 빌드 실패.
- `{{pluginRoot}}` 는 skill 본문에서 원칙적으로 불필요해야 한다(경로 지식은 MCP 서버 안으로). 잔존 사용처는 Claude 전용 기능으로 간주하고 빌드 경고.

## 3. Agent 정본 — `definitions/agents/<name>.yaml`

```yaml
name: qa-reviewer
description: "Post-implementation reviewer focused on metrics, rule compliance."
instructions: |
  You are the FCA-AI QA/Reviewer ...
capability: read-only # read-only | write  → 호스트별 권한으로 번역
model: standard # standard | deep  (논리 등급; 프로파일이 슬러그로 매핑)
bundle: standalone # ★ standalone | embed  (§3.1)
maxTurns: 40 # Claude 전용. 타 호스트 드롭(경고 로그)
```

### 3.1 `bundle` 플래그 — Codex agent 번들 불가(L2) 해소

| 값           | Claude             | Codex                                                                                                                    | agy                              |
| ------------ | ------------------ | ------------------------------------------------------------------------------------------------------------------------ | -------------------------------- |
| `standalone` | `agents/<name>.md` | `targets/codex/.codex-agents/<name>.toml` 스테이징 → setup skill 이 `~/.codex/agents/` 또는 `<repo>/.codex/agents/` 설치 | `agents/<name>.md` 번들 (무변환) |
| `embed`      | `agents/<name>.md` | 오케스트레이팅 skill 본문에 `{{persona:<name>}}` 인라인                                                                  | `agents/<name>.md` 번들          |

agy 는 agents 를 플러그인 컴포넌트로 수용(실측)하므로 bundle 값과 무관하게 항상 번들 — L2 분기는 Codex 한정.

### 3.2 필드 번역 규칙 (프로파일이 수행)

| 정본                    | Claude                                       | Codex                           | agy                                   |
| ----------------------- | -------------------------------------------- | ------------------------------- | ------------------------------------- |
| `capability: read-only` | `tools: Read, Glob, Grep`                    | `sandbox_mode: read-only`       | `tools:` Claude 표기 유지 ⚠️해석 실측 |
| `capability: write`     | `tools: Read, Write, Edit, Glob, Grep, Bash` | `sandbox_mode: workspace-write` | 동상                                  |
| `model: standard`       | `model: sonnet`                              | (프로파일 매핑 슬러그)          | (agy 모델 슬러그 매핑 ⚠️)             |
| `model: deep`           | `model: opus`                                | (프로파일 매핑 슬러그)          | 동상                                  |
| `maxTurns: N`           | `maxTurns: N`                                | 드롭 + 경고                     | 드롭 + 경고                           |

## 4. Hook 정본 — `definitions/hooks/<name>.yaml`

```yaml
event: SessionEnd # 의도한 논리 이벤트 (Claude 이벤트 어휘를 논리 어휘로 사용)
matcher: "*" # 논리 매처 (Claude 도구 어휘)
entry: bridge/session-cleanup.mjs
timeout: 3
fallback: stale-sweep # ★ 호스트에 event 부재/훅 자체 부재 시 (§4.1)
```

### 4.1 `fallback` — 이벤트/채널 부재(L2) 선언

`event` 가 호스트 프로파일의 지원 집합에 없거나(agy 의 SessionStart·SessionEnd·UserPromptSubmit), 호스트가 플러그인 훅 자체를 지원하지 않을 때(Codex) emitter 동작:

| `fallback`            | agy 에서                                                                            | Codex 에서 (훅 채널 없음)                         |
| --------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------- |
| `pre-invocation-once` | `PreInvocation` 재배선 + 러너 once-guard (세션당 1회 근사)                          | skill lazy-init 지시 주입 + `AGENTS.md` 서술      |
| `stale-sweep`         | **드롭 + MCP 서버 기동 시 sweep** (agy `Stop` 은 매 턴 발화라 SessionEnd 매핑 금지) | MCP 서버 기동 시 sweep (런타임이 sweep 모드 지원) |
| `stop`                | `Stop` 재배선 (경량 턴-종료 작업 한정 opt-in)                                       | 드롭 + 경고                                       |
| `drop`                | 생략 + 빌드 경고                                                                    | 생략 + 빌드 경고                                  |

- **핵심**: agy `Stop` 은 Claude `Stop` 처럼 **매 실행 루프(턴) 종료마다** 발화하며 세션당 1회가 아니다. 따라서 SessionEnd(무거운 정리/커밋/recap)를 `Stop` 으로 재배선하면 매 턴 실행된다 — `stale-sweep` 이 이를 agy 훅에서 제거하고 MCP-기동 sweep 으로 보상한다. `stop` 은 진짜 경량 작업에 한해 opt-in.

- 지원 이벤트(agy): `PreToolUse`/`PostToolUse` 는 matcher 를 프로파일 번역표로 재작성(Claude `Write|Edit` → agy 도구명 regex — 어휘는 Stage 1 실측으로 확정). 번역 불가 matcher 는 빌드 경고.
- stdin/응답 계약 차이는 정본이 아니라 **러너 어댑터** 소관 ([compiler-architecture.md](./compiler-architecture.md) §5) — 훅 구현은 Claude 계약만 알면 된다.
- `fallback` 없는 hook 이 비-공통 이벤트를 쓰면 빌드 실패.

## 5. 검증 불변식 (스키마 레벨)

- 모든 skill 본문 도구 참조는 `{{tool:}}` 토큰 (리터럴 `mcp_`/`mcp__` 금지).
- `bundle: embed` agent 는 자신을 인라인할 오케스트레이팅 skill 존재.
- `fallback` 없는 hook 이 비-공통 이벤트 사용 시 빌드 실패.
- `mcp.server` 는 `[a-z][a-z0-9]*` (도구명 조립 안전; Codex 하이픈 정규화 고려).
- Codex 타깃에 hooks 산출물이 존재하면 빌드 실패 (생성 자체가 결함 — 실측 근거).
