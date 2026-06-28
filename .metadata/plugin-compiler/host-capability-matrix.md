# Host Capability Matrix — Claude Code ↔ Codex

조사 결론(2026-06-28). 근거: cennad codex 위임 + `developers.openai.com/codex/{plugins/build, skills, hooks, config-reference, config-advanced}` 교차검증.

## 1. 4 메커니즘 대응

| Claude 메커니즘                                      | Codex 대응                                              | 매핑          | 비고                                                         |
| ---------------------------------------------------- | ------------------------------------------------------- | ------------- | ------------------------------------------------------------ |
| **MCP 서버** (`.mcp.json` → `bridge/mcp-server.cjs`) | 플러그인 `.mcp.json` 또는 `config.toml [mcp_servers.*]` | 🟢 런타임 1:1 | 래퍼 키·도구명만 변환 (§3)                                   |
| **Skills** (`skills/<n>/SKILL.md`)                   | Agent Skills (`SKILL.md`)                               | 🟡 본문 공유  | frontmatter `name`/`description`만 유효, 호출·토큰 변환 (§3) |
| **Agents** (`agents/<n>.md`)                         | 네이티브 subagent (`.codex/agents/*.toml`)              | 🟠 부분       | **플러그인 번들 불가**, `tools`/`maxTurns` 대응 없음 (§4)    |
| **Hooks** (`hooks/hooks.json`)                       | 플러그인 hook (`hooks/hooks.json`)                      | 🟠 거의 보존  | **`SessionEnd` 부재**, 도구 매처 불일치 (§4)                 |

호환 레이어(확정): Codex 는 `$REPO_ROOT/.claude-plugin/marketplace.json` 을 레거시 호환으로 읽고, 플러그인 hook 커맨드에 `PLUGIN_ROOT`/`PLUGIN_DATA` + 별칭 `CLAUDE_PLUGIN_ROOT`/`CLAUDE_PLUGIN_DATA` 를 주입한다.

## 2. 2층 차이 모델 (이 설계의 중심 가설)

호스트 차이는 두 종류이며 처리 방식이 다르다.

| 층                 | 정의                   | 처리                                          | 결과                            |
| ------------------ | ---------------------- | --------------------------------------------- | ------------------------------- |
| **L1 스칼라 치환** | 같은 의미, 표기만 다름 | 정본의 논리 토큰 → 프로파일 값 바인딩         | **완전 호환**                   |
| **L2 구조 분기**   | 한쪽에만 존재/부재     | 호스트별 emitter 분기 또는 정본의 조건부 선언 | **빌드에 격리** (사라지진 않음) |

→ "claude/codex 완전 호환"은 **L1 한정 참**. L2 는 본문에서 제거되어 빌드 한 곳으로 모일 뿐이다.

## 3. L1 — 스칼라 치환 (변수로 완전 해결)

| 항목                         | Claude                                  | Codex                            | 변환 규칙                                                             |
| ---------------------------- | --------------------------------------- | -------------------------------- | --------------------------------------------------------------------- |
| **MCP 도구명 (본문 단축형)** | `mcp_<server>_<tool>`                   | `mcp__<server>__<tool>` ⚠️실측   | 정본은 **논리명만**(`render_viewer`), 빌드가 `(server, host)` 로 조립 |
| **MCP 도구명 (풀네임)**      | `mcp__plugin_<plugin>_<server>__<tool>` | plugin-scope 미문서화 ⚠️         | 동상. 본문에 풀네임 하드코딩 금지                                     |
| **skill 상호참조**           | `/<plugin>:<skill>`                     | `$<skill>` / `/skills`           | 정본 `{{skill:<name>}}` → 프로파일 포맷                               |
| **플러그인 루트 변수**       | `${CLAUDE_PLUGIN_ROOT}`                 | `${PLUGIN_ROOT}` (+ Claude 별칭) | hook 커맨드: 별칭 덕에 그대로 가능. **MCP args: 미보장 ⚠️실측**       |

**서버명 비균일성** (정본이 논리참조를 써야 하는 이유): `deilen=tools`, `filid=t`, `r-statistics=tools`. 본문이 `mcp_t_*` / `mcp_tools_*` 로 서버명을 박아두면 호스트뿐 아니라 플러그인마다 깨진다. 정본은 서버명조차 모르고 논리 tool 명만 참조 → 빌드가 `plugin.yaml` 선언 서버명 + 호스트 포맷으로 조립한다.

## 4. L2 — 구조 분기 (호스트별 emitter 필요)

### 4.1 매니페스트 / `.mcp.json` 래퍼

- 파일명: `.claude-plugin/plugin.json` vs `.codex-plugin/plugin.json` (필드셋 거의 동일: `name/version/description/skills/mcpServers/hooks` + Codex `apps`).
- `.mcp.json` 본문: Claude `{"mcpServers":{...}}` ↔ Codex **direct map** `{"<server>":{...}}` 또는 `{"mcp_servers":{...}}`. Claude 래퍼는 Codex 가 인식하지 않음 → 호스트별 생성.

### 4.2 Hook 이벤트 집합

| 이벤트                                                                            | Claude | Codex       |
| --------------------------------------------------------------------------------- | ------ | ----------- |
| SessionStart / UserPromptSubmit / PreToolUse / PostToolUse / Stop / SubagentStart | ✅     | ✅          |
| SubagentStop / PreCompact / PostCompact / PermissionRequest                       | (일부) | ✅          |
| **SessionEnd**                                                                    | ✅     | ❌ **부재** |

- Codex hook 핸들러: `type:"command"`만 실행(`prompt`/`agent` skip), `async:true` 미지원, 기본 timeout 600s, stdin JSON. JSON 형식(`matcher`/`hooks[]`/`type`/`command`/`timeout`/`statusMessage`)은 Claude 와 동일 + `commandWindows`.
- 도구 매처: Claude `Read|Write|Edit` 가 Codex 도구모델과 1:1 아님 (`Write`/`Edit`≈`apply_patch`, `Read` 일반 매처 없음).
- **재배선 대상**: `SessionEnd` 를 쓰는 `filid`/`maencof`/`imbas`. → [case-studies.md](./case-studies.md) §filid.

### 4.3 Agents

- Codex 플러그인은 `agents/` 를 컴포넌트로 받지 않음. 네이티브 subagent 는 `~/.codex/agents/*.toml` 또는 `<repo>/.codex/agents/*.toml`(repo/user 레벨)에 **별도 설치**.
- 필드 매핑: 본문→`developer_instructions`, `name`/`description` 유지, `model: sonnet|opus`→Codex 슬러그(**기계적 매핑 금지** — 프로파일 명시 매핑), `tools` 화이트리스트→`sandbox_mode`+MCP allowlist 근사, `maxTurns`→**버림**(Codex 는 전역 `[agents] max_threads/max_depth/job_max_runtime_seconds`만).
- → 정본 `bundle: standalone|embed` 플래그로 호스트별 전략 선택. [ir-schema.md](./ir-schema.md) §agent.

## 5. 출처 · 신뢰도

- ✅ **확정**(Codex답+공식문서 일치): 플러그인 매니페스트 필드, `.mcp.json` 두 형식, hook 이벤트셋·`SessionEnd` 부재, `CLAUDE_PLUGIN_ROOT` 주입, `.claude-plugin/marketplace.json` 호환, custom prompts deprecation(2026-01-22)→Agent Skills, `agents/` 비-컴포넌트.
- ⚠️ **실측 필요** (PoC 게이트):
  1. MCP `args` 내 `${CLAUDE_PLUGIN_ROOT}` / `${PLUGIN_ROOT}` 전개 여부 (공식 문서는 hook 커맨드만 보장).
  2. Codex 모델-facing MCP 도구명의 정확한 형식 (`mcp__<server>__<tool>` plugin-scope 포함 여부).
  3. 프로젝트-로컬 `.codex/config.toml` 의 MCP 등록 가부 (플러그인 번들 `.mcp.json` 경로를 쓰면 무관).
