# Host Capability Matrix — Claude Code · Codex · Antigravity

조사 결론(2026-07-14 갱신). 근거: **로컬 실측**(codex-cli 0.144.4 — ponytail 플러그인 설치·훅 기동 확인 / agy 1.1.1 — 2026-07-11 실측 유지) + **openai/codex main 소스 검증**(훅 파서·플러그인 매니페스트·MCP 로더) + 공식 문서. 2026-07-11 실측(codex 0.144.1)의 **"플러그인 훅 전면 불가" 결론은 0.144.4 재실측으로 폐기**되었다 — §4.2.

## 1. 메커니즘 대응 (3 호스트)

| Claude 메커니즘                                      | Codex 대응                                                                                                                            | Antigravity(agy) 대응                                                                                                                                                                           |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **MCP 서버** (`.mcp.json` → `bridge/mcp-server.cjs`) | 🟢 동일 `mcpServers` 래퍼 — args 변수 미전개 → 상대 args + **`cwd:"."` 필수** (§4.1)                                                  | 🟡 `mcp_config.json` — 상대 args 정상. 단 **`.agents/plugins/` 에 있어야 로드**된다 (§4.4)                                                                                                      |
| **Skills** (`skills/<n>/SKILL.md`)                   | 🟢 동일 구조 `SKILL.md` 무변환 수용                                                                                                   | 🟢 **무변환 수용** (Claude 형식 그대로 processed, 실측)                                                                                                                                         |
| **Agents** (`agents/<n>.md`)                         | 🔴 플러그인 컴포넌트 아님 (매니페스트 스키마에 없음 — 소스 확인)                                                                      | 🟢 **동일 `.md` 형식 수용** (frontmatter 포함, 실측)                                                                                                                                            |
| **Hooks** (`hooks/hooks.json`)                       | 🟢 **Claude hooks.json 포맷 그대로 파싱** (§4.2 — 이벤트 10종·계약 동일)                                                              | 🔴 **파싱 실패 → 0개 로드** (named-group 형식 불일치, §4.3)                                                                                                                                     |
| **Manifest** (`.claude-plugin/plugin.json`)          | 🟢 `.codex-plugin/plugin.json` 우선, **`.claude-plugin` fallback** (§5.1)                                                             | 🔴 루트 `plugin.json` **필수** — 없으면 Claude 임포트로 폴백해 **어댑터를 덮어쓴다** (§4.4)                                                                                                     |
| **Commands** (Claude: skills 로 통합됨)              | — (Skills 로 대체)                                                                                                                    | 🟢 `commands/<n>.toml` (gemini 형식) → skills 자동 변환                                                                                                                                         |
| **Rules** (CLAUDE.md / .claude/rules)                | **`AGENTS.md` 뿐** — 루트·전역(`~/.codex/AGENTS.md`) 둘 다 주입·중첩 (G8·M2-5 실측). `~/.codex/rules` 는 **커맨드 allowlist** 라 무관 | `GEMINI.md`·`AGENTS.md`·`.agents/rules/*.md` 후보 — **`--print` 에선 자동주입 안 됨**(M2-6: 모델이 `grep_search` 로 읽음). 대화형 주입 미확인 → filid/maencof 는 conservative(claude 채널) 유지 |
| **Marketplace** (`.claude-plugin/marketplace.json`)  | `.agents/plugins/marketplace.json` 우선, **`.claude-plugin` fallback**                                                                | 🔴 `.agents/plugins.json` declared **무용지물** (실측) — 디렉터리 스캔만 유효 (§4.4)                                                                                                            |

호환 레이어: Codex 는 hook 커맨드 프로세스에 `CLAUDE_PLUGIN_ROOT`·`PLUGIN_ROOT`·`CLAUDE_PLUGIN_DATA`·`PLUGIN_DATA` 를 env 로 주입한다(소스 주석에 "OOTB compat" 명기 — `hooks/engine/discovery.rs`). 커맨드는 `$SHELL -lc`(Windows `cmd /C`) 경유라 `${CLAUDE_PLUGIN_ROOT}` 가 쉘에서 전개된다. **MCP args/env 에는 여전히 어떤 전개도 없다.** agy 는 `agy plugin import claude` 명령으로 Claude 플러그인 임포트 경로를 자체 제공한다.

## 2. 결론 모델 — 재배치가 아니라 in-place 어댑터

2026-07-11 체제의 L1(스칼라 치환)/L2(구조 분기) + `targets/<host>/` 배포 트리 모델은 **폐기**한다. 0.144.4 재실측으로 Codex 가 Claude 산출물(매니페스트 fallback·hooks 포맷·skills·마켓플레이스 fallback)을 거의 그대로 소비하므로, 호스트 차이는 **소수의 추가 파일(어댑터)** 로 흡수된다:

| 차이                       | 흡수 지점                                                                                  |
| -------------------------- | ------------------------------------------------------------------------------------------ |
| Codex MCP args 변수 미전개 | `.codex-plugin/plugin.json` 인라인 `mcpServers` (상대 args + **`cwd:"."` 명시** — §4.1)    |
| Codex 서버명 전역충돌 위험 | 위 인라인 선언에서 서버명=플러그인명 오버라이드                                            |
| agy MCP 파일명             | 플러그인 루트 `mcp_config.json` 추가 파일                                                  |
| Codex 마켓플레이스 스키마  | 루트 `.agents/plugins/marketplace.json` 추가 파일                                          |
| agy 플러그인 마커·분류     | 플러그인 루트 `plugin.json` (**Codex 도 이 경로를 읽으므로 전체 매니페스트여야** — §4.4.1) |
| ~~agy 클론-즉시-활성화~~   | ~~루트 `.agents/plugins.json` declared~~ → **폐기**: 어떤 형식으로도 로드 실패 (§4.4)      |
| agy 훅 어휘 상이           | (잔여 Stage — 러너 어댑터, §4.3)                                                           |

Claude 산출물은 **정본이자 그대로 Claude 배포물** — 수정 자체가 없으므로 무결손이 구조적으로 보장된다. 상세 절차는 [migration-playbook.md](./migration-playbook.md), 생성 도구는 [`tools/plugin-compiler`](../../tools/plugin-compiler/).

## 3. 스칼라 확정값 (실측/소스)

| 항목                        | Claude                                  | Codex                                                                 | Antigravity                                  |
| --------------------------- | --------------------------------------- | --------------------------------------------------------------------- | -------------------------------------------- |
| MCP 설정                    | `.mcp.json` (매니페스트 참조/자동 발견) | 매니페스트 `mcpServers`(경로/인라인), 미선언 시 `.mcp.json` 자동 발견 | `mcp_config.json`                            |
| MCP 래퍼                    | `{"mcpServers": {...}}`                 | 동일 (파일형; 인라인은 서버맵 직접)                                   | 동일 (실측 ✅)                               |
| MCP 경로 전략               | `${CLAUDE_PLUGIN_ROOT}` args 전개       | **상대 args + `cwd:"."` 명시 필수** — 생략 시 세션 cwd (§4.1 실측)    | 상대 args — 해석 기준 미문서화 (§4.4 게이트) |
| **도구명 (모델-facing)**    | `mcp__plugin_<plugin>_<server>__<tool>` | **`mcp__<server>__<tool>`** (0.144.4 실측 — 더블 언더스코어)          | `mcp_<server>_<tool>` (바이너리 관찰)        |
| 도구명 (훅 matcher-facing)  | 모델-facing 과 동일                     | **`mcp__<server>__<tool>`** (Claude 더블언더스코어 — 소스 테스트)     | agy 도구명 regex                             |
| skill 상호참조              | `/<plugin>:<skill>`                     | `$<skill>` / `/skills` (문서, 재확인 필요)                            | 스킬명 직접 언급 (실측 게이트 잔존)          |
| 플러그인 루트 (hook 커맨드) | `${CLAUDE_PLUGIN_ROOT}` 치환            | `CLAUDE_PLUGIN_ROOT` env 주입 + 쉘 전개 (소스 확정)                   | cwd=hooks.json 위치 (변수 불필요)            |
| 훅 stdin                    | snake_case (`session_id`, `tool_input`) | **동일 snake_case Claude 계약** (+`turn_id`·`model` 추가)             | **camelCase** (`conversationId`, `stepIdx`)  |

- Codex `sanitize_name` 이 서버명 하이픈을 언더스코어로 정규화(`r-statistics` → `r_statistics`, 도구명 실측 확인).
- Codex 플러그인 MCP 서버의 `cwd` 를 명시하면 플러그인 루트 기준 join + **루트 밖 금지**(소스: `codex-mcp/plugin_config.rs`). ⚠ **생략 시 플러그인 루트가 아니라 세션 cwd 다** — 2026-07-15 실측이 구 "소스 확정(생략=플러그인 루트)" 판단을 **반증**했다(§4.1). 어댑터는 `"cwd": "."` 를 명시 방출한다.
- 플러그인 MCP 서버 프로세스의 env 는 어댑터가 넣은 `OGHAM_HOST` **단 하나**다(실측: `ps eww`). Codex 는 세션 cwd·워크스페이스 경로를 **어떤 형태로도 주지 않는다**(훅 프로세스와 달리 `CLAUDE_PLUGIN_ROOT`·`PLUGIN_DATA` 도 없음) → `process.cwd()` 를 **사용자 프로젝트로 가정하는** 런타임(r-statistics data-root · deilen 프로젝트 식별 해시)은 Codex 에서 플러그인 루트를 보게 된다 — 상세는 **§9**.

## 4. 구조 분기 (실측/소스 확정)

### 4.1 Codex MCP — 인라인 선언 + 상대 args (게이트 해소)

`.mcp.json` args 의 `${CLAUDE_PLUGIN_ROOT}` 는 리터럴로 남는다(0.144.1 실측, 0.144.4 소스에서도 전개 코드 없음). 해소는 **`.codex-plugin/plugin.json` 인라인 `mcpServers`**:

```json
{
  "mcpServers": {
    "<plugin>": {
      "command": "node",
      "args": ["bridge/mcp-server.cjs"],
      "cwd": ".",
      "env": { "OGHAM_HOST": "codex" }
    }
  }
}
```

- ⚠ **`cwd: "."` 는 필수다** (2026-07-15 실측). 생략하면 Codex 가 **세션 cwd** 로 서버를 띄워 상대 args 가 사용자 프로젝트 기준으로 풀리고, node 가 module-not-found 로 죽어 `handshaking with MCP server failed: connection closed` 가 된다. **`codex exec` 는 이 실패를 조용히 삼키고**(도구가 그냥 없는 것처럼 보인다) TUI 만 `⚠ MCP client for <server> failed to start` 를 표시한다 — 무음 사망이라 발견이 늦었다. 구 판단("생략 시 플러그인 루트 기본 — 소스 확정 `environment_cwd(root, None) → root`")은 폐기.
- 설치 경로(`~/.codex/plugins/cache/<mp>/<plugin>/<version>`)는 어댑터 **생성 시점에 알 수 없으므로** 절대 args 주입은 불가능하다 → `cwd:"."` 가 유일 해법.
- 매니페스트에 `mcpServers` 를 선언하면 `.mcp.json` 자동 발견을 **대체**한다(소스: `ext/mcp/executor_plugin/provider.rs` — 선언 있으면 그것만 읽음). Claude 형식 `.mcp.json` 이 Codex 에 노출되지 않는 차폐 지점.
- 서버명은 플러그인명으로 오버라이드 — **필수**다. Codex 는 플러그인 스코프를 부여하지 **않으며**(실측 §6-G1: 시스템 프롬프트가 "use tool provenance to tell which plugin they come from" 이라 명시), 오버라이드가 없으면 ogham 서버명 `tools`×6·`t`×3 이 `mcp__tools__*` 로 전역 충돌한다.

### 4.2 Codex Hooks — 지원 확정 (2026-07-11 "전면 불가" 폐기)

0.144.1 에서 `plugin_hooks`=removed + 선언 시 세션 행이었으나, **0.144.4 에서 플러그인 훅이 정식 동작**한다(ponytail 실증: `~/.codex/config.toml` `[hooks.state]` trusted_hash 등록 + SessionStart 훅이 `PLUGIN_DATA` 에 플래그 파일 기록). `codex features list`: `hooks`=stable·true, `plugins`=stable·true (`plugin_hooks` 플래그는 removed 로 남아 있으나 무의미한 잔재).

소스 확정 계약 (openai/codex main):

| 항목        | Codex (`codex-rs/config/hook_config.rs` · `hooks/engine/*`)                                                                                                                                                                        |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 파일 형식   | Claude `{"hooks": {"<Event>": [{matcher, hooks: [{type:"command", command, timeout}]}]}}` **그대로** + 확장필드 `commandWindows`·`statusMessage`·`async`                                                                           |
| 이벤트      | **10종**: PreToolUse·PermissionRequest·PostToolUse·PreCompact·PostCompact·SessionStart·UserPromptSubmit·SubagentStart·SubagentStop·Stop — PascalCase 표기 Claude 동일. **SessionEnd·Notification 없음**(미지 이벤트는 조용히 무시) |
| matcher     | Claude 의미론: 생략/`*`/빈문자열=전체, 파이프 alternation 정확일치, 그 외 regex. UserPromptSubmit/Stop 은 matcher 무시                                                                                                             |
| 도구명 별칭 | `apply_patch` ← **`Write`·`Edit`**, `spawn_agent` ← **`Agent`**, shell 계열은 **`Bash`** 로 직렬화, MCP 는 `mcp__<server>__<tool>`. **`Read` 별칭 없음** — 파일 읽기는 대부분 Bash 경유                                            |
| stdin       | snake_case Claude 계약 (`session_id`·`hook_event_name`·`tool_name`·`tool_input`·`prompt`·`stop_hook_active`…) + `turn_id`·`model`                                                                                                  |
| stdout      | `hookSpecificOutput.additionalContext`(developer 메시지로 대화 주입)·`permissionDecision` allow/deny(+`updatedInput`)·legacy `decision: block`·universal `continue`/`systemMessage`/`suppressOutput`                               |
| exit code   | **2 = 차단, stderr = 사유** (Claude 동일)                                                                                                                                                                                          |
| env         | `CLAUDE_PLUGIN_ROOT`·`PLUGIN_ROOT`·`CLAUDE_PLUGIN_DATA`·`PLUGIN_DATA` 주입, `$SHELL -lc` 실행                                                                                                                                      |
| timeout     | 초 단위 (Claude 동일)                                                                                                                                                                                                              |
| 신뢰 게이트 | 설치 후 TUI **`/hooks` 에서 훅별 trust 승인** 필수 — config.toml `[hooks.state]` 에 훅 해시 고정. 훅 파일 변경 시 재승인 필요 추정(§6)                                                                                             |

→ ogham 훅 5종 플러그인(cennad·filid·imbas·maencof·maencof-lens)이 쓰는 이벤트(SessionStart·UserPromptSubmit·PreToolUse·PostToolUse·SubagentStart)는 **전부 지원 범위**. `hooks/hooks.json` 을 Claude·Codex 가 **한 파일로 공유**한다(ponytail 과 동일 패턴). 이전 §4.5 "대체 채널"(AGENTS.md·skill lazy-init 보상)은 폐기.

**파일도구 계약 (2026-07-15 실측 — stage5)**: Codex 는 파일 편집/생성을 **`tool_name:"apply_patch"` + `tool_input:{command:<V4A 패치>}}`** 로 보낸다(`file_path` 없음 — `*** Update/Add File:` 헤더에 절대경로). 셸(읽기·grep·ls)은 **`tool_name:"Bash"` + `{command}`**. **`Read`/`Grep`/`Glob` 도구는 미발화**(모델이 셸 경유). 훅은 세션 cwd(실 프로젝트)를 받는다. ⇒ 해소: `@ogham/cross-platform/codex-hooks` 가 `apply_patch`→`Write`/`Edit`(file_path·content) 정규화, PreToolUse 엔트리 배선(`16a161cc`) — maencof Layer1·filid 문서계약 deny 가 Codex 에서 발화(E2E 실측, Claude 와 바이트 동일).

부분 손실(정직 고지): (a) **읽기 추적(Read/Grep/Glob)은 이식 불가** — 모델이 셸로 읽어 해당 도구가 원천 미발화. (b) maencof recorder 는 maencof **MCP** 도구 매칭이라 `normalizeMaencofToolName`(`mcp__maencof__*`)으로 이미 동작 — 파일도구 무관. (c) 다중 파일 `apply_patch` 는 첫 파일만 가드. (d) **미신뢰 훅은 조용히 스킵**(실측 재확인) — `codex exec` 는 `--dangerously-bypass-hook-trust` 필요.

### 4.3 Antigravity Hooks — 별도 어휘 (2026-07-11 실측 유지)

| 항목        | Claude                                         | Antigravity                                                                                                                                                             |
| ----------- | ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 파일 위치   | `hooks/hooks.json` (매니페스트 참조/자동 발견) | 플러그인 루트 `hooks.json` (규약 발견)                                                                                                                                  |
| 최상위 형식 | `{"hooks": {"<Event>": [...]}}`                | `{"<hookName>": {"enabled": bool, "<Event>": [...]}}` (named group)                                                                                                     |
| 이벤트      | 위 §4.2 참조                                   | **PreToolUse · PostToolUse · PreInvocation · PostInvocation · Stop** 5종                                                                                                |
| matcher     | Claude 도구명                                  | agy 도구명 regex (`run_command`, `view_file`, `browser_.*`)                                                                                                             |
| stdin       | snake_case                                     | **camelCase** (`conversationId`, `workspacePaths[]`, `stepIdx`)                                                                                                         |
| 실행        | 커맨드 그대로                                  | `sh -c` (Unix) / `cmd /c` (Windows), `~` 전개, **cwd = hooks.json 위치**                                                                                                |
| 응답 계약   | `hookSpecificOutput` 등                        | PreToolUse: `{decision: allow\|deny\|ask\|force_ask, reason, permissionOverrides[]}` / Pre·PostInvocation: `{injectSteps: [{ephemeralMessage\|userMessage\|toolCall}]}` |

이벤트 매핑(러너 어댑터 — 잔여 Stage): `SessionStart(주입)` → `PreInvocation`+세션당 1회 가드, `UserPromptSubmit` → `PreInvocation`, `PreToolUse`/`PostToolUse` → 동명 이벤트+matcher 번역, `SubagentStart` → 드롭. SessionEnd 관심사는 mcp-lifecycle 이관으로 전 호스트에서 이미 소멸([sessionend-refactor.md](./sessionend-refactor.md)).

**오독 확정 (G5 — 2026-07-15 실측)**: `agy plugin install` 은 Claude 플러그인을 감지하면 `hooks/hooks.json` 을 **플러그인 루트 `hooks.json` 으로 복사**한다. 그런데 그 내용은 Claude 포맷이라 agy 가 최상위 키 `"hooks"` 를 **훅 이름**으로 오독하고 파싱에 실패한다:

```
W hooks.go:44] Failed to parse hooks file …/maencof-lens/hooks.json:
  invalid hook "hooks": command hook must specify 'command'
I hooks_manager.go:53] loaded 0 named hooks from 0 hooks.json file(s)
```

세션을 깨뜨리진 않지만 **훅은 0개 로드**된다. ⇒ agy 에서 ogham 훅은 **전면 무동작**. 해소는 agy 포맷 `hooks.json`(named-group + agy 이벤트) emitter + 러너 어댑터 — **Stage 3**.

### 4.4 Antigravity MCP — 동작한다. 단 **위치**가 전부다 (2026-07-15 실측 — 구 서술 폐기)

- 스키마: **Stdio** `{command, args, env}` / **SSE** `{serverUrl}`. `cwd` 필드 없음.
- **상대 `args` 는 플러그인 디렉터리 기준으로 정확히 풀린다** (실측). ⇒ 우리가 생성하는 `mcp_config.json`(`args:["bridge/mcp-server.cjs"]` + `env.OGHAM_HOST="agy"`)은 **그대로 유효**하다. 절대경로 주입 불요 — 구 G4 대응책은 불필요했다.
- **⚠ 결정적 격차 — agy 는 커스터마이제이션 루트에서만 플러그인 MCP 를 띄운다:**

| 플러그인 위치                                                         | 플러그인 MCP 로드 |
| --------------------------------------------------------------------- | ----------------- |
| `~/.gemini/config/plugins/<n>/` — **`agy plugin install` 이 넣는 곳** | ❌ **안 뜬다**    |
| `~/.agents/plugins/<n>/` — 전역 커스터마이제이션 루트                 | ✅ 뜬다           |
| `<workspace>/.agents/plugins/<n>/` — 워크스페이스 루트                | ✅ 뜬다           |

설치 로그가 `✔ mcpServers : 1 processed` 라고 보고해도 런타임에는 로드되지 않는다 — **agy 1.1.2 CLI 의 갭**. (대조군: 동일 서버를 전역 `~/.gemini/config/mcp_config.json` 에 넣으면 정상 기동 ⇒ agy 의 stdio MCP 자체는 멀쩡하다.)

- **루트 `plugin.json` 이 분류를 가른다**: 없으면 agy 가 `source: claude-code` 로 임포트하며 **우리 `mcp_config.json` 을 `.mcp.json` 에서 재생성해 덮어쓴다**(`${CLAUDE_PLUGIN_ROOT}` 리터럴 · `env: null` → **`OGHAM_HOST` 마커 소실**). `plugins/<n>/plugin.json` = `{"name":"<n>"}` 를 두면 `source: antigravity` 로 분류되고 우리 어댑터가 **온전히 보존**된다. ⇒ **5번째 어댑터 파일이 필요하다.**
- **`.agents/plugins.json` declared 레이어는 무용지물**: 항목별 경로(`./plugins/<n>`)로도, 컨테이너 경로(`./plugins`)로도, 루트 `plugin.json` 마커를 붙여도 플러그인이 로드되지 않았다(실측 3종). ⇒ 이 어댑터 파일은 **폐기 대상**.

#### 4.4.1 ⚠ 루트 `plugin.json` 은 Codex 도 읽는다 — 충돌과 해법 (2026-07-15 실측)

agy 가 요구하는 루트 `plugin.json` 은 **Codex 의 매니페스트 탐색 경로에도 포함**되며 `.codex-plugin/plugin.json` 을 **가린다**. 실측 인과:

| `plugins/<n>/plugin.json` 내용        | Codex MCP 도구         | agy 분류                               |
| ------------------------------------- | ---------------------- | -------------------------------------- |
| (파일 없음)                           | ✅ 4개 노출            | ❌ `claude-code` → **어댑터 덮어쓰기** |
| `{"name":"deilen"}` (agy 최소 마커)   | 🔴 **`[]` — MCP 소실** | ✅ `antigravity`                       |
| **Codex 매니페스트 전체** (동일 내용) | ✅ 4개 노출            | ✅ `antigravity` → **어댑터 보존**     |

⇒ **해법: 루트 `plugin.json` 을 둘 거면 `.codex-plugin/plugin.json` 과 동일한 전체 매니페스트를 담아야 한다.** 그러면 한 파일이 Codex·agy 를 동시에 만족시킨다(둘을 병치해도 무해 — 내용이 같으므로). 최소 마커만 두면 **Codex 가 죽는다.**

⚠ **Claude 영향 미검증**: Claude 는 `.claude-plugin/plugin.json` 을 읽으므로 무관할 것으로 보이나, "Claude 무결손" 은 이 체제의 근간이므로 **머지 전 Claude 재설치로 확인해야 한다**.

## 5. 배포 · 설치 채널

### 5.1 마켓플레이스/설치 (실측 + 소스)

| 호스트 | 매니페스트 탐색 순서                                                                                        | 설치                                                                                          | 설치 형태                                                              |
| ------ | ----------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Claude | `.claude-plugin/plugin.json`                                                                                | `/plugin marketplace add` → `/plugin install`                                                 | 관리 디렉터리 복사                                                     |
| Codex  | `.codex-plugin/plugin.json` → **`.claude-plugin/plugin.json`** (소스: `DISCOVERABLE_PLUGIN_MANIFEST_PATHS`) | `codex plugin marketplace add <path\|git>` → `codex plugin add <n>@<mp>` → TUI `/hooks` trust | `~/.codex/plugins/cache/<mp>/<n>/<version>/` 스냅샷 + `data/` 디렉터리 |
| agy    | 플러그인 루트 `plugin.json` (마커). 없으면 Claude 임포트 경로로 폴백                                        | ⚠ **`agy plugin install` 로는 MCP 가 죽는다** — `.agents/plugins/<n>/` 에 배치해야 한다(§4.4) | `~/.gemini/config/plugins/<n>/` 통째 복사 (MCP 미로드 위치)            |

- Codex 마켓플레이스 매니페스트 탐색: `.agents/plugins/marketplace.json` → `.agents/plugins/api_marketplace.json` → **`.claude-plugin/marketplace.json`** (소스). Claude 형 문자열 `source: "./plugins/<n>"` 도 파싱된다(untagged) — 다만 명시적 `.agents/plugins/marketplace.json`(중첩 `source`/`policy` 스키마)을 두는 것이 정책·표시 제어에 유리.
- Codex 플러그인 매니페스트 컴포넌트(소스: `plugin/manifest.rs`): `skills`·`hooks`(경로/인라인)·`mcpServers`(경로/인라인)·`apps`·`interface`. **`agents`·`commands` 없음.**
- ~~agy 의 declared 레이어: `.agents/plugins.json`~~ → **무용지물 (2026-07-15 실측)**. 항목별 경로·컨테이너 경로·`plugin.json` 마커 조합 3종 모두 플러그인을 로드하지 못했다. agy 는 `.agents/plugins/<n>/` **디렉터리 스캔**으로만 플러그인을 찾는다.
- 참고: Codex plugin-creator 스킬 문서에 "공유/워크스페이스 ingestion 검증은 `hooks` 필드를 거부" 언급 — **로컬 마켓플레이스 설치와 별개 경로**(ponytail 로컬 설치에서 훅 동작 실증). ChatGPT 워크스페이스 배포를 노릴 때만 재검토.

### 5.2 Windows / POSIX

| 관심사            | Claude                                           | Codex                                                                    | Antigravity                  |
| ----------------- | ------------------------------------------------ | ------------------------------------------------------------------------ | ---------------------------- |
| hook 실행         | 커맨드 문자열 (ogham 은 `node …/run.cjs` 직호출) | `$SHELL -lc` / `cmd /C` + env 주입                                       | `sh -c` / `cmd /c` 자동 분기 |
| Windows 전용 필드 | (없음 — run.cjs 가 process.execPath 로 우회)     | hooks `commandWindows` (소스 확정)                                       | (자동 분기라 불필요)         |
| 함정              | —                                                | `cmd /C` 는 `${VAR}` 미전개 → Windows 지원 시 `commandWindows` 병기 필요 | `cmd /c` 이스케이프 규칙     |

원칙 유지: 훅/서버 진입은 항상 `node <script>` 직접 호출, 경로는 변수 또는 cwd 상대.

## 6. 리스크 / 열린 실측 게이트

번호는 [migration-playbook.md](./migration-playbook.md) 의 게이트 정의와 일치한다.

1. ~~**G1 — Codex 플러그인 MCP 도구명·스코프**~~ → **닫힘 (2026-07-15)**. 도구명 `mcp__<server>__<tool>`(더블 언더스코어, `sanitize_name` 으로 하이픈→언더스코어). **플러그인 스코프 없음** — Codex 시스템 프롬프트가 "use tool provenance to tell which plugin they come from" 이라 명시한다. ⇒ 서버명=플러그인명 오버라이드는 "무해한 방어" 가 아니라 **충돌 회피 필수 조치**다(`tools`×6·`t`×3). 부수 발견: `cwd` 누락으로 MCP 9종 전체가 무음 사망하던 블로커 — §4.1 참조(수정 완료).
2. ~~**G2 — Codex 훅 exec 헤드리스**~~ → **닫힘 (2026-07-15) — ogham 훅 end-to-end 검증**. maencof-lens 훅 trust 후 헤드리스 `codex exec` 에서 **발화하고, 모델이 주입 문구를 그대로 인용**했다(`[maencof-lens] Read-only vault access enabled.`). ⇒ `${CLAUDE_PLUGIN_ROOT}` 쉘 전개 · `libs/run.cjs` · **Claude 포맷 `hooks/hooks.json` 공유** · `additionalContext` 주입이 **전부 동작**. **미신뢰 훅은 조용히 스킵** — exit 0, 경고 없음, 프로세스 미스폰. ⇒ **cennad codex 위임 경로는 trust 전까지 ogham 훅 무동작이고 고지가 없다.** 우회로: `--dangerously-bypass-hook-trust`. **훅 프로세스는 세션 cwd 를 받는다**(실측) — MCP 와 달리 §9 경로 문제의 대상이 아니다.
3. ~~**G3 — Codex 훅 재신뢰 UX**~~ → **닫힘 (2026-07-15)**. `codex plugin add` 는 `enabled` 만 세우고 훅 신뢰는 안 준다. 첫 TUI 진입에서 `Hooks need review — 1 hook is new or changed / Hooks can run outside the sandbox after you trust them` 게이트가 뜨고 `Review hooks · Trust all and continue · Continue without trusting` 중 선택한다. 신뢰는 `[hooks.state."<plugin>@<mp>:<훅파일>:<event>:<i>:<j>"].trusted_hash` 로 고정 — **"new or changed"** 가 재신뢰 트리거다(훅 파일 변경 시 재승인).
4. ~~**G4 — agy MCP 상대 args 해석 기준**~~ → **닫힘 (2026-07-15, agy 1.1.2)**. 상대 args 는 **플러그인 디렉터리 기준으로 정상 해석**된다 — 우리 `mcp_config.json` 은 무수정으로 유효. **진짜 문제는 args 가 아니라 위치였다**: `agy plugin install` 이 넣는 `~/.gemini/config/plugins/` 에서는 MCP 가 아예 안 뜨고, `.agents/plugins/`(전역 `~/.agents/` 또는 워크스페이스)에서만 뜬다(§4.4). 추가로 **루트 `plugin.json` 이 없으면 agy 가 우리 어댑터를 덮어써 `OGHAM_HOST` 마커를 파괴**한다.
5. ~~**G5 — agy 의 `hooks/hooks.json` 자동 로드 오독**~~ → **닫힘 (2026-07-15) — 오독 확정**. agy 가 Claude 포맷을 훅 이름 `"hooks"` 로 오독해 **파싱 실패**하고 `loaded 0 named hooks` 가 된다(§4.3 로그). 세션은 안 깨지지만 **agy 에서 ogham 훅은 전면 무동작** — 해소는 Stage 3.
6. ~~**G6 — skill 본문 full-form 도구명**~~ → **닫힘 (2026-07-15)**. 스킬 로딩 자체는 양호: Codex 가 `<plugin>:<skill>` 접두로 주입해 Claude 규약(`/<plugin>:<skill>`)과 이름이 같고, 설명·한국어 트리거도 원문 유지된다. 다만 **본문의 Claude full-form(`mcp__plugin_deilen_tools__render_viewer`)은 실제 Codex 도구명(`mcp__deilen__render_viewer`)과 불일치가 확정**됐다 — "미실측" 이 아니라 확정된 격차이며 완화는 Stage 5.
7. ~~**G7 — `process.cwd()` 의존 런타임 감사**~~ → **닫힘 (2026-07-15) — 제약 확정. §9 가 상세 정본.**
   Claude 는 MCP 프로세스에 **"프로젝트(cwd)" 와 "플러그인 위치(`CLAUDE_PLUGIN_ROOT` env)" 를 따로** 준다(실측: `PWD=~/Soulstream/tirnanog`, `CLAUDE_PLUGIN_ROOT=…/plugins/deilen`). Codex 는 **둘 다 주지 않고** cwd 하나를 두 용도가 다투게 만든다 — `cwd:"."` 로 플러그인 루트를 잡으면 프로젝트 경로를 잃는다. env 도 `OGHAM_HOST` 뿐이고, **MCP 표준 `roots` 도 불가**(§9). ⇒ 런타임 코드는 Claude 계약 하에서 정상이며 이는 **Codex 전환 고유 문제**다. 대응은 Stage 4 결정 대상.
8. ~~**G8 — Codex 규칙 파일 채널**~~ → **닫힘 (2026-07-15) — 기존 가정이 틀렸다**. `~/.codex/rules/` 는 지침 문서 채널이 **아니다** — `prefix_rule(pattern=["yarn","test:run"], decision="allow")` 형태의 **쉘 커맨드 승인 allowlist** 다(Claude `settings.json` permissions 대응). Codex 의 지침 채널은 **`AGENTS.md` 뿐**이며, **저장소 루트 `AGENTS.md` 와 전역 `~/.codex/AGENTS.md` 가 둘 다 주입되고 함께 쌓인다**(실측 — `codex debug prompt-input` 에 마커 확인). `.claude/rules/*.md` 는 당연히 무시된다. ⇒ filid `syncRuleDocs` 와 maencof `claudeMdMerger` 의 Codex 타깃은 **`AGENTS.md` 병합**이다.

## 7. 기능 손실 매트릭스 (호스트별 잔여 격차)

| 기능 (사용 플러그인)                                                 | Codex                                                                                                                                                                                                     | Antigravity                                                                                                                                                                                                                                                                                                                                             |
| -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **훅 전반** (SessionStart·PreToolUse·PostToolUse·UserPromptSubmit)   | 🟢 **전부 동작** — trust 승인 후 발화, `additionalContext` 주입까지 실측(G2). 단 `Read` matcher 미발화, 미신뢰 시 무음 스킵                                                                               | 🟡 **어댑터 완성·라이브 검증(D1, `01d1ca98`)**: agy-format hooks.json 로드(`1 named hooks`)·PreInvocation 발화·러너 번역까지 정확. **단 agy 1.1.2 가 injectSteps 미렌더 → 컨텍스트 주입 훅(SessionStart·UserPromptSubmit) 무가치**(플랫폼 한계, F4). 게이팅 훅(PreToolUse `decision`)은 별도 채널이라 D1b 로 우회 후보. 등록(`agy plugin install`) 필수 |
| SessionEnd 정리                                                      | 🟢 mcp-lifecycle 이관 완료 — 호스트 이벤트 불요 (전 호스트 공통)                                                                                                                                          | 🟢 동일                                                                                                                                                                                                                                                                                                                                                 |
| **플러그인 MCP 기동**                                                | 🟢 `cwd:"."` 로 해결 — 도구 노출 확인(G1)                                                                                                                                                                 | 🟡 **위치 의존** — `.agents/plugins/` 에서만 뜬다. `agy plugin install` 경로는 ❌(§4.4)                                                                                                                                                                                                                                                                 |
| Skills                                                               | 🟢 `<plugin>:<skill>` 주입 (Claude 규약 동일)                                                                                                                                                             | 🟢 install 시 processed (실측)                                                                                                                                                                                                                                                                                                                          |
| Subagent 격리 위원회 (filid·prawf·atlassian)                         | 🟢 **런타임 multi_agent 로 이식 가능** (Stage 6 실측, [stage6](./stage6-codex-multiagent.md)) — 스킬에 페르소나 원장 임베드 → 격리 subagent 스폰(10인·충실도 확인). **선언적 `agents` 컴포넌트만 부재**   | 🟡 `agents: 1 processed` (수용 실측) — 스폰 의미론 미검증                                                                                                                                                                                                                                                                                               |
| 호스트 결합 쓰기 — maencof `CLAUDE.md`·filid `.claude/rules/`        | 🟢 **`AGENTS.md` 병합 — M2-5 실측 확인**: filid `rule_docs_sync`·maencof `claudemd_merge` 가 `AGENTS.md` 에 마커 병합, `codex debug prompt-input` 에 규칙 본문 도달, idempotent, 훅 합집합 판정 오판 없음 | 🟡 **미주입 확인 (M2-6)** — agy(--print)는 지침 파일 자동주입 안 함 → conservative(claude 채널) 유지, 업그레이드 보류                                                                                                                                                                                                                                   |
| 플러그인 자기 파일 해석 — `CLAUDE_PLUGIN_ROOT` (6 플러그인 / 7 지점) | 🟡 env 부재 → 폴백. r-statistics `contract.R` 은 폴백 경로가 없어 **`run_r` 파손**, filid `syncRuleDocs` 는 **조용히 skip**. `process.cwd()` 분기로 해결 (§9-A)                                           | 🔴 **동일 문제 + 마커 소실 위험** — 루트 `plugin.json` 없으면 `OGHAM_HOST` 까지 파괴됨(§4.4)                                                                                                                                                                                                                                                            |
| 사용자 프로젝트 경로 — `process.cwd()` (**8 플러그인 / 31 지점**)    | 🔴 **전부 플러그인 루트를 본다.** imbas(15) 사실상 전 기능·cennad 위임 spawn·r-statistics allow-root·deilen 프로젝트 격리. 서버 안에서 복구 불가 — **모델이 인자로 넘기는 수밖에 없다** (§9-B)            | 🔴 동일 구조 (cwd = 플러그인 디렉터리) — Stage 4 헬퍼의 agy 분기 필요                                                                                                                                                                                                                                                                                   |
| `user_invocable`·`argument-hint` 등 Claude frontmatter               | 드롭 여부 미실측 (수용은 확인 — G6)                                                                                                                                                                       | 드롭 여부 미실측 (수용은 확인)                                                                                                                                                                                                                                                                                                                          |
| Claude 전용 UX (deilen 뷰어 자동오픈 등 MCP 무관 기능)               | 🟢 MCP 경유라 손실 없음 (단 cwd 의미 변화 — §9)                                                                                                                                                           | 🟢 동일                                                                                                                                                                                                                                                                                                                                                 |

## 8. 출처 · 신뢰도

- ✅ **실측 확정 (2026-07-14, 로컬)**: codex-cli 0.144.4 — ponytail 설치(`codex plugin marketplace add`/`add`), `[hooks.state]` trusted_hash 3건, SessionStart 훅의 `PLUGIN_DATA` 플래그 기록, `codex features list`(hooks/plugins/plugin_sharing/remote_plugin=stable).
- ✅ **소스 검증 (openai/codex main, 2026-07-14)**: `config/hook_config.rs`(이벤트 10종·스키마), `hooks/engine/output_parser.rs`(stdout 계약), `hooks/engine/command_runner.rs`(실행·timeout), `hooks/engine/discovery.rs`(env 주입·trust 해시), `hooks/events/pre_tool_use.rs`(stdin·exit 2), `core/tools/hook_names.rs`(Write/Edit/Agent 별칭·Bash 직렬화), `utils/plugins/plugin_namespace.rs`(매니페스트 fallback), `core-plugins/marketplace.rs`(마켓플레이스 fallback·untagged source), `codex-mcp/plugin_config.rs`(cwd 명시 시 루트 기준 join·루트 밖 금지 — **"생략 시 루트 기본" 은 2026-07-15 실측으로 반증**, §4.1), `ext/mcp/executor_plugin/provider.rs`(mcpServers 선언 시 `.mcp.json` 대체), plugin-creator 스킬 `plugin-json-spec.md`(매니페스트/마켓플레이스 스키마).
- ✅ **실측 확정 (2026-07-15, 로컬 — agy 1.1.2 축)**: `agy plugin install` 로 deilen·maencof-lens 설치 후 tmux 인터랙티브 세션에서 관찰. 위치별 MCP 로드 A/B 4종(`~/.gemini/config/plugins` ❌ · `~/.agents/plugins` ✅ · 워크스페이스 `.agents/plugins` ✅ · 전역 `mcp_config.json` ✅ 대조군), args 형태 3종(변수·절대·상대 — **상대가 플러그인 디렉터리 기준으로 정상 해석**), 루트 `plugin.json` 유무에 따른 분류(`claude-code` ↔ `antigravity`)와 **어댑터 덮어쓰기**, `.agents/plugins.json` declared 3종 실패, 훅 파싱 실패 로그(`invalid hook "hooks"`).
- ✅ **실측 확정 (2026-07-11, 로컬 — 구 agy 1.1.1)**: agy plugin CLI 5종/컴포넌트 validate/설치 위치/hooks.json named-group 5이벤트/`--print` MCP 미기동, Codex 0.144.1 의 `mcp__<server>.<tool>` 도구명·args 미전개. ⚠ 이 중 **"`--print` 라서 MCP 미기동"** 은 오진이었다 — 1.1.2 실측 결과 인터랙티브에서도 **위치**가 원인이다(§4.4).
- 📖 **agy 공식 번들 문서** (`~/.gemini/antigravity-cli/builtin/skills/agy-customizations/docs/*.md`): 플러그인 구조·MCP 스키마·declared 레이어·훅 계약.
- 📄 **ponytail 저장소** (멀티호스트 플러그인 선행 사례): Claude/Codex 훅 파일 공유(`hooks/claude-codex-hooks.json`), `PLUGIN_DATA` 런타임 분기, gemini `hooks/hooks.json` 자동 로드 회피 관행.
- 🔬 **MCP 프로토콜 프로브 (2026-07-15)**: 최소 stdio 서버를 Codex 에 물려 `initialize` 교환을 포착 — client `codex-mcp-client 0.144.4`, protocol `2025-06-18`, capabilities `{elicitation}` (**`roots` 없음**), 역질의 `roots/list` → `{"roots": []}`.
- ✅ **실측 확정 (2026-07-15, 로컬 — Codex 축 1차 PoC)**: codex-cli 0.144.4 에 로컬 마켓플레이스 `ogham` 등록 + `deilen`·`r-statistics` 동시 설치. 생성 어댑터 `.agents/plugins/marketplace.json` 이 그대로 파싱돼 10개 플러그인 전부 해석. 도구명 `mcp__deilen__render_viewer`·`mcp__r_statistics__run_r` 등 8개(G1), 스킬 `<plugin>:<skill>` 주입(G6), MCP 프로세스 env=`OGHAM_HOST` 뿐·cwd=플러그인 루트(G7, `lsof`). **`cwd` 누락 시 MCP 9종 전체 무음 사망** — `cwd:"."` 방출로 수정 후 TUI 경고 0건·헤드리스 exec 도구 노출 확인.
- ✅ **실측 확정 (2026-07-15, 로컬 — M2 모델-facing·E2E 축)**: ogham 마켓플레이스를 ogham_mk2 체크아웃에서 등록 + imbas·r-statistics·filid·maencof 설치. **M2-1** Codex 모델이 `config_get` 에 `project_root`(절대경로) 첫 호출 자발 전달(복구 0회, `codex exec --json`). **M2-4** run_r 이 contract.R 소싱(manifest present)·allow-root(project_root) 정상 — 부수효과 도구는 codex 헤드리스 승인 게이트를 우회해 **설치 스냅샷 브리지를 Codex env 계약대로 스폰**해 MCP 프로토콜로 검증. **M2-5** filid·maencof `AGENTS.md` 병합이 `codex debug prompt-input` 모델 프롬프트에 도달·idempotent·훅 합집합 판정 오판 없음. **M2-2/M2-3(agy)** transcript 판독으로 워크스페이스 경로 미주입·자기탐색 정확 해석 확인. **M2-6(agy)** `--print` 지침 파일 자동주입 없음(모델 `grep_search`). **결함 F2**(r-statistics `resolveDataRefs` 가 projectRoot 안내를 `DATA_ROOT_INVALID` 로 삼킴) 발견·수정·회귀테스트. 상세: [m2-measurement-log.md](./m2-measurement-log.md).
- ⚠️ **미실측 (환경 제약)**: agy **대화형 IDE** 의 규칙 자동주입·워크스페이스 경로 주입(측정은 `agy --print` + CLI 미로그인 상태), agy 인터랙티브 MCP 프로세스 cwd/env(자기탐색이 이를 불요로 함), agents 스폰 의미론.

## 9. Codex 경로 해석 문제 (G7 상세 — Stage 4 결정 정본)

**핵심**: Claude 는 MCP 프로세스에 두 좌표를 **분리해서** 준다. Codex 는 하나도 안 준다.

| 좌표                       | Claude (실측 `ps eww`)                    | Codex (실측)                                                        |
| -------------------------- | ----------------------------------------- | ------------------------------------------------------------------- |
| 사용자 프로젝트 (세션 cwd) | `process.cwd()` = `~/Soulstream/tirnanog` | ❌ 없음 (cwd 는 플러그인 루트에 뺏김)                               |
| 플러그인 설치 위치         | `CLAUDE_PLUGIN_ROOT` env                  | ❌ env 없음 — 단 `cwd:"."` 덕에 `process.cwd()` 가 곧 플러그인 루트 |
| 플러그인 데이터 디렉터리   | `CLAUDE_PLUGIN_DATA` env                  | ❌ 없음 (훅 프로세스에는 `PLUGIN_DATA` 주입, MCP 에는 아님)         |

⇒ 런타임 코드(`process.cwd()` = 프로젝트, `CLAUDE_PLUGIN_ROOT` = 플러그인)는 **Claude 계약 하에서 정상**이다. 이건 보편 버그가 아니라 **Codex 전환 고유 문제**다.

**적용 범위 (MCP 도달 코드 전수, 2026-07-15)**: A 는 6 플러그인 / 7 지점, B 는 **8 플러그인 / 31 지점**(imbas 15 · deilen 5 · filid 4 · cennad 2 · maencof 2 · atlassian 1 · maencof-lens 1 · r-statistics 1). 즉 `cwd:"."` 는 서버를 **살렸을 뿐** 의미를 고치지 못했다. 수정 방향은 `@ogham/cross-platform` 의 `hostPaths`(A 7지점·B 31지점 전부 반영)로 **main 완료** — 절차는 [migration-playbook.md](./migration-playbook.md) Stage 4.

### 9-A. 플러그인 자기 파일 — 해결 가능 (모델 개입 불필요)

`cwd:"."` 로 cwd 가 플러그인 루트에 고정되므로 **`process.cwd()` 가 곧 플러그인 루트**다. 호스트 분기 헬퍼(`OGHAM_HOST`)로 `pluginRoot()` 를 claude=`CLAUDE_PLUGIN_ROOT` / codex=`process.cwd()` 로 나누면 끝난다. Claude 동작 불변.

- **r-statistics `contractScriptPath()`** (`constants/paths.ts:43`): `CLAUDE_PLUGIN_ROOT ?? R_STATISTICS_HOME` → Codex 에서 `~/.claude/plugins/r-statistics/shared/contract.R` 로 폴백하는데 **그 경로는 존재하지 않는다**(실측) → `run_r` 파손. 실제 파일은 설치 루트에 있고 = `process.cwd()`.
- **deilen `bridgeRoot()`**: `import.meta.url` 기반 자기탐색 폴백이 있어 이미 견고 (문제 없음).

### 9-B. 사용자 프로젝트 경로 — 복구 불가 (모델이 넘겨야 함)

Codex 에서 MCP 서버가 사용자 프로젝트 경로를 알 방법이 **하나도 없다**: env 부재 · MCP `roots` 미지원(§8 프로브) · cwd 는 플러그인 루트. **모델만이 두 좌표를 다 안다** ⇒ 도구 인자로 받는 수밖에 없다(선택 인자 + 스킬 안내 — Claude 는 생략 시 기존 동작 유지).

- **r-statistics `inputDataRoot()`** (`paths.ts:54`): `R_STATISTICS_DATA_ROOT ?? process.cwd()` = R 작업 allow-root. Codex 에서는 플러그인 루트가 되어 **사용자 데이터가 allow-root 밖** → 9-A 를 고쳐도 `run_r` 은 실질 사용 불가.
- **deilen `getProjectHash(process.cwd())`** (renderViewer·closeViewer·collectFeedback·httpServer): 프로젝트 식별 해시. Codex 에서는 **모든 프로젝트가 한 버킷으로 붕괴** → 뷰어 세션·피드백이 프로젝트 간 충돌. 렌더 자체는 동작(기능 손실이 아니라 격리 손실).

## 10. 플랫폼 한계 3종 — 우회 + 고지 (2026-07-15)

**"완전 동등"이 우리 코드로 원천 불가한 3가지.** 각각 최선의 우회책을 두되, 남는 격차는 여기와 사용자 README 에 정직 고지한다. (Vincent 님 지시: 우회+고지.)

| #                                                                  | 한계 (플랫폼)                                                                                                                                                                                                                                                                                                  | 우회책 (우리가 하는 것)                                                                                                                                                                                                   | 고지 (남는 격차) |
| ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| **L1. agy PreInvocation injectSteps 미렌더** (agy 1.1.2, F4)       | **게이팅(D1b) 우회 확보 — 라이브 agy 실측(`85fea062`·`6c75b159`)**: agy 가 PreToolUse `write_to_file` `{decision:deny}` 를 **강제**(라이브 trace). maencof Layer1 차단 발화. workspacePaths 부재는 편집 파일 경로로 cwd 역산해 해소(F6). `agy plugin install` 이 bridge 복사(F7) → emitter 상대경로 배포 가능. | **주입 훅·권고 가드(구조경고·vault redirect)는 agy 무동작** — PreToolUse 엔 주입 채널 없음(차단만 이식). **모델은 셸(run_command)로 우회 가능** — Claude·Codex 포함 전 호스트 공통 guardrail 한계(OpenAI 공식 문서 확인). |
| **L2. agy MCP 설치 위치** (agy CLI 버그, §4.4)                     | 플러그인 전체 디렉터리를 `~/.agents/plugins/<n>/` (또는 워크스페이스 `.agents/plugins/`)에 배치하는 스크립트/README 안내. `agy plugin install` 은 훅 등록엔 쓰되 MCP 는 이 배치로 뜬다.                                                                                                                        | 마켓플레이스 `agy plugin install` **단독으로는 MCP 미동작**(로그는 거짓 성공). 사용자가 배치 단계를 수동 수행해야 함 — agy CLI 가 고쳐질 때까지.                                                                          |
| **L3. Codex `agents` 컴포넌트 부재** (Codex 매니페스트 스키마, E4) | 위원회 의존 스킬(filid Phase D·prawf·atlassian)의 페르소나 원장을 **스킬 본문에 임베드** → 네이티브 `multi_agent` 가 스폰 시 주입(**Stage 6 실측 이식가능**, [stage6](./stage6-codex-multiagent.md)). 컴파일러가 `agents/*.md` → 스킬 참조 재배치.                                                             | **선언적 등록**(파일로 페르소나 등록)만 부재 — 원장은 스킬로 전달하면 됨. 완전 플러그인 E2E(마켓플레이스 설치)·병렬 폭은 미측정(저위험).                                                                                  |

세 한계 모두 **우리 코드 결함이 아니라 대상 플랫폼(agy·Codex)의 미구현·버그**다. Claude 는 세 축 모두 정상.
