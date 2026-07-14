# Host Capability Matrix — Claude Code · Codex · Antigravity

조사 결론(2026-07-14 갱신). 근거: **로컬 실측**(codex-cli 0.144.4 — ponytail 플러그인 설치·훅 기동 확인 / agy 1.1.1 — 2026-07-11 실측 유지) + **openai/codex main 소스 검증**(훅 파서·플러그인 매니페스트·MCP 로더) + 공식 문서. 2026-07-11 실측(codex 0.144.1)의 **"플러그인 훅 전면 불가" 결론은 0.144.4 재실측으로 폐기**되었다 — §4.2.

## 1. 메커니즘 대응 (3 호스트)

| Claude 메커니즘                                      | Codex 대응                                                                | Antigravity(agy) 대응                                                |
| ---------------------------------------------------- | ------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| **MCP 서버** (`.mcp.json` → `bridge/mcp-server.cjs`) | 🟢 동일 `mcpServers` 래퍼 — 단 args 변수 미전개 → 상대 args (§4.1)        | 🟢 `mcp_config.json` — 동일 래퍼, 파일명만 상이 (실측)               |
| **Skills** (`skills/<n>/SKILL.md`)                   | 🟢 동일 구조 `SKILL.md` 무변환 수용                                       | 🟢 **무변환 수용** (Claude 형식 그대로 processed, 실측)              |
| **Agents** (`agents/<n>.md`)                         | 🔴 플러그인 컴포넌트 아님 (매니페스트 스키마에 없음 — 소스 확인)          | 🟢 **동일 `.md` 형식 수용** (frontmatter 포함, 실측)                 |
| **Hooks** (`hooks/hooks.json`)                       | 🟢 **Claude hooks.json 포맷 그대로 파싱** (§4.2 — 이벤트 10종·계약 동일)  | 🟡 루트 `hooks.json` — named-group 형식·이벤트셋 상이 (§4.3)         |
| **Manifest** (`.claude-plugin/plugin.json`)          | 🟢 `.codex-plugin/plugin.json` 우선, **`.claude-plugin` fallback** (§5.1) | 🟡 루트 `plugin.json`(name), `agy plugin import claude` 경로 별도    |
| **Commands** (Claude: skills 로 통합됨)              | — (Skills 로 대체)                                                        | 🟢 `commands/<n>.toml` (gemini 형식) → skills 자동 변환              |
| **Rules** (CLAUDE.md / .claude/rules)                | `AGENTS.md`                                                               | `GEMINI.md` · `AGENTS.md` · `.agents/rules/*.md` · 플러그인 `rules/` |
| **Marketplace** (`.claude-plugin/marketplace.json`)  | `.agents/plugins/marketplace.json` 우선, **`.claude-plugin` fallback**    | Claude marketplace.json 규약 재사용 + `plugins.json` declared (§5.1) |

호환 레이어: Codex 는 hook 커맨드 프로세스에 `CLAUDE_PLUGIN_ROOT`·`PLUGIN_ROOT`·`CLAUDE_PLUGIN_DATA`·`PLUGIN_DATA` 를 env 로 주입한다(소스 주석에 "OOTB compat" 명기 — `hooks/engine/discovery.rs`). 커맨드는 `$SHELL -lc`(Windows `cmd /C`) 경유라 `${CLAUDE_PLUGIN_ROOT}` 가 쉘에서 전개된다. **MCP args/env 에는 여전히 어떤 전개도 없다.** agy 는 `agy plugin import claude` 명령으로 Claude 플러그인 임포트 경로를 자체 제공한다.

## 2. 결론 모델 — 재배치가 아니라 in-place 어댑터

2026-07-11 체제의 L1(스칼라 치환)/L2(구조 분기) + `targets/<host>/` 배포 트리 모델은 **폐기**한다. 0.144.4 재실측으로 Codex 가 Claude 산출물(매니페스트 fallback·hooks 포맷·skills·마켓플레이스 fallback)을 거의 그대로 소비하므로, 호스트 차이는 **소수의 추가 파일(어댑터)** 로 흡수된다:

| 차이                       | 흡수 지점                                                                           |
| -------------------------- | ----------------------------------------------------------------------------------- |
| Codex MCP args 변수 미전개 | `.codex-plugin/plugin.json` 인라인 `mcpServers` (상대 args, cwd 기본=플러그인 루트) |
| Codex 서버명 전역충돌 위험 | 위 인라인 선언에서 서버명=플러그인명 오버라이드                                     |
| agy MCP 파일명             | 플러그인 루트 `mcp_config.json` 추가 파일                                           |
| Codex 마켓플레이스 스키마  | 루트 `.agents/plugins/marketplace.json` 추가 파일                                   |
| agy 클론-즉시-활성화       | 루트 `.agents/plugins.json` declared entries 추가 파일                              |
| agy 훅 어휘 상이           | (잔여 Stage — 러너 어댑터, §4.3)                                                    |

Claude 산출물은 **정본이자 그대로 Claude 배포물** — 수정 자체가 없으므로 무결손이 구조적으로 보장된다. 상세 절차는 [migration-playbook.md](./migration-playbook.md), 생성 도구는 [`tools/plugin-compiler`](../../tools/plugin-compiler/).

## 3. 스칼라 확정값 (실측/소스)

| 항목                        | Claude                                  | Codex                                                                 | Antigravity                                  |
| --------------------------- | --------------------------------------- | --------------------------------------------------------------------- | -------------------------------------------- |
| MCP 설정                    | `.mcp.json` (매니페스트 참조/자동 발견) | 매니페스트 `mcpServers`(경로/인라인), 미선언 시 `.mcp.json` 자동 발견 | `mcp_config.json`                            |
| MCP 래퍼                    | `{"mcpServers": {...}}`                 | 동일 (파일형; 인라인은 서버맵 직접)                                   | 동일 (실측 ✅)                               |
| MCP 경로 전략               | `${CLAUDE_PLUGIN_ROOT}` args 전개       | **상대 args + cwd 기본값=플러그인 설치 루트** (소스 확정)             | 상대 args — 해석 기준 미문서화 (§4.4 게이트) |
| **도구명 (모델-facing)**    | `mcp__plugin_<plugin>_<server>__<tool>` | `mcp__<server>.<tool>` (0.144.1 실측 — 0.144.4 재확인 게이트)         | `mcp_<server>_<tool>` (바이너리 관찰)        |
| 도구명 (훅 matcher-facing)  | 모델-facing 과 동일                     | **`mcp__<server>__<tool>`** (Claude 더블언더스코어 — 소스 테스트)     | agy 도구명 regex                             |
| skill 상호참조              | `/<plugin>:<skill>`                     | `$<skill>` / `/skills` (문서, 재확인 필요)                            | 스킬명 직접 언급 (실측 게이트 잔존)          |
| 플러그인 루트 (hook 커맨드) | `${CLAUDE_PLUGIN_ROOT}` 치환            | `CLAUDE_PLUGIN_ROOT` env 주입 + 쉘 전개 (소스 확정)                   | cwd=hooks.json 위치 (변수 불필요)            |
| 훅 stdin                    | snake_case (`session_id`, `tool_input`) | **동일 snake_case Claude 계약** (+`turn_id`·`model` 추가)             | **camelCase** (`conversationId`, `stepIdx`)  |

- Codex `sanitize_name` 이 서버명 하이픈을 언더스코어로 정규화(`maencof-lens` → `maencof_lens`).
- Codex 플러그인 MCP 서버의 `cwd` 를 명시하면 플러그인 루트 기준 join + **루트 밖 금지**(소스: `codex-mcp/plugin_config.rs`). 생략 시 자동으로 플러그인 루트. 세션-cwd 를 얻을 방법이 없다 → `process.cwd()` 의존 런타임(deilen 파일 경로 해석)은 Codex 에서 의미가 바뀐다(§6 감사 항목).

## 4. 구조 분기 (실측/소스 확정)

### 4.1 Codex MCP — 인라인 선언 + 상대 args (게이트 해소)

`.mcp.json` args 의 `${CLAUDE_PLUGIN_ROOT}` 는 리터럴로 남는다(0.144.1 실측, 0.144.4 소스에서도 전개 코드 없음). 해소는 **`.codex-plugin/plugin.json` 인라인 `mcpServers`**:

```json
{
  "mcpServers": {
    "<plugin>": { "command": "node", "args": ["bridge/mcp-server.cjs"] }
  }
}
```

- cwd 생략 → 플러그인 설치 루트가 기본 (소스 확정: `environment_cwd(root, None) → root`).
- 매니페스트에 `mcpServers` 를 선언하면 `.mcp.json` 자동 발견을 **대체**한다(소스: `ext/mcp/executor_plugin/provider.rs` — 선언 있으면 그것만 읽음). Claude 형식 `.mcp.json` 이 Codex 에 노출되지 않는 차폐 지점.
- 서버명은 플러그인명으로 오버라이드 — ogham 서버명 `tools`×6·`t`×3 이 전역 충돌할 위험 회피(Codex 가 플러그인 스코프를 자동 부여하는지는 §6 게이트 — 부여해도 오버라이드는 무해).

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

부분 손실(정직 고지): (a) filid·imbas PreToolUse matcher `Read|Write|Edit` 는 Codex 에서 Write/Edit(apply_patch)만 발화 — 읽기 추적 손실. (b) maencof 훅 내부의 Claude full-form 도구명 매칭(recorder)은 Codex 도구명(`Bash`·`apply_patch`·`mcp__t__*`)과 불일치 — 러너/레코더 수준 정규화 전까지 부분 무동작. (c) `codex exec` 헤드리스에서 미신뢰 훅 거동 미실측.

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

**충돌 게이트**: ponytail 문서에 따르면 gemini/agy 계열이 `hooks/hooks.json` 경로를 자동 로드한다(ponytail 이 훅 파일명을 `claude-codex-hooks.json` 으로 지은 이유). ogham 은 Claude 훅이 바로 그 경로에 있다 — agy 설치 실측에서 오독이 확인되면 훅 파일 개명(+매니페스트 `hooks` 필드 명시)으로 회피한다. [migration-playbook.md](./migration-playbook.md) 게이트 G5.

### 4.4 Antigravity MCP — 공식 스키마 확정, 런타임 기동 미검증 (2026-07-11 유지)

- 스키마 2종: **Stdio** `{command(필수), args, env}` / **SSE** `{serverUrl}`. **`cwd` 필드 없음** — 상대 `args` 해석 기준(플러그인 디렉터리 vs 세션 cwd) 미문서화 → 실측 게이트 G4. 실패 시 대안: 설치 시 절대 경로 주입.
- `mcp_config.json` + `mcpServers` 래퍼 validate "processed" (실측 ✅). 단 `agy --print` 모드에서는 플러그인 MCP 서버 미스폰 — 인터랙티브 기동이 게이트.
- 설치: `agy plugin install <path|plugin@marketplace>` → `~/.gemini/config/plugins/<name>/` 통째 복사.

## 5. 배포 · 설치 채널

### 5.1 마켓플레이스/설치 (실측 + 소스)

| 호스트 | 매니페스트 탐색 순서                                                                                        | 설치                                                                                          | 설치 형태                                                              |
| ------ | ----------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Claude | `.claude-plugin/plugin.json`                                                                                | `/plugin marketplace add` → `/plugin install`                                                 | 관리 디렉터리 복사                                                     |
| Codex  | `.codex-plugin/plugin.json` → **`.claude-plugin/plugin.json`** (소스: `DISCOVERABLE_PLUGIN_MANIFEST_PATHS`) | `codex plugin marketplace add <path\|git>` → `codex plugin add <n>@<mp>` → TUI `/hooks` trust | `~/.codex/plugins/cache/<mp>/<n>/<version>/` 스냅샷 + `data/` 디렉터리 |
| agy    | Claude `.claude-plugin/marketplace.json` 규약 재사용 (superpowers 실측)                                     | `agy plugin install` / `import claude` / declared 등록                                        | `~/.gemini/config/plugins/<n>/` 통째 복사                              |

- Codex 마켓플레이스 매니페스트 탐색: `.agents/plugins/marketplace.json` → `.agents/plugins/api_marketplace.json` → **`.claude-plugin/marketplace.json`** (소스). Claude 형 문자열 `source: "./plugins/<n>"` 도 파싱된다(untagged) — 다만 명시적 `.agents/plugins/marketplace.json`(중첩 `source`/`policy` 스키마)을 두는 것이 정책·표시 제어에 유리.
- Codex 플러그인 매니페스트 컴포넌트(소스: `plugin/manifest.rs`): `skills`·`hooks`(경로/인라인)·`mcpServers`(경로/인라인)·`apps`·`interface`. **`agents`·`commands` 없음.**
- agy 의 declared 레이어: `.agents/plugins.json` `{"entries": [{"path": "<경로>"}]}` — 모노레포 클론만으로 활성화.
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

1. **G1 — Codex 플러그인 MCP 도구명·스코프**: 모델-facing 이름 형식(0.144.1 의 `mcp__<server>.<tool>` 재확인)과 플러그인 스코프 자동 부여 여부. 다중 ogham 플러그인 동시 설치로 실측. 서버명=플러그인명 오버라이드는 결과와 무관하게 유지(무해).
2. **G2 — Codex 훅 exec 헤드리스**: `codex exec` 에서 신뢰된/미신뢰 훅의 거동 (cennad 의 codex 위임 경로에 영향).
3. **G3 — Codex 훅 재신뢰 UX**: 플러그인 버전 업으로 훅 파일 해시가 바뀔 때 재승인 요구 여부·마찰 정도.
4. **G4 — agy MCP 상대 args 해석 기준** (§4.4).
5. **G5 — agy 의 `hooks/hooks.json` 자동 로드 오독** (§4.3) — 오독 시 훅 파일 개명으로 회피.
6. **G6 — skill 본문 full-form 도구명**: Claude full-form(`mcp__plugin_<p>_<s>__<t>`)은 Codex/agy 에서 무효 — 모델이 실도구를 자력 발견하는지, 서술형 참조로의 완화가 필요한지 실사용 관찰.
7. **G7 — `process.cwd()` 의존 런타임 감사**: Codex 플러그인 MCP 서버는 cwd=플러그인 루트 고정(§3) — deilen 등 세션-cwd 가정 로직의 Codex 거동 확인.
8. **G8 — Codex 규칙 파일 채널**: `~/.codex/rules` 디렉토리의 로드 규약·`AGENTS.md` 등가성 — filid `.claude/rules/` 배포·maencof `CLAUDE.md` 쓰기의 Codex 대상화(플레이북 Stage 4, `OGHAM_HOST` env 분기) 전제.

## 7. 기능 손실 매트릭스 (호스트별 잔여 격차)

| 기능 (사용 플러그인)                                          | Codex                                                                       | Antigravity                                             |
| ------------------------------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------- |
| SessionStart 컨텍스트 주입 (filid·maencof·cennad·imbas)       | 🟢 훅 지원 (additionalContext → developer 메시지)                           | 🟡 PreInvocation + 1회 가드 (러너 어댑터 — 잔여 Stage)  |
| PreToolUse 파일 가드 (filid·maencof)                          | 🟡 Write/Edit 발화·deny 지원 — **Read 추적만 손실** (별칭 없음)             | 🟡 matcher 번역 (agy 도구 어휘로, 커버리지 부분)        |
| PostToolUse 기록 (maencof)                                    | 🟡 이벤트는 발화 — 훅 내부 full-form 도구명 매칭 정규화 필요                | 🟡 동명 이벤트 + matcher 번역                           |
| UserPromptSubmit 상태 주입 (cennad·maencof)                   | 🟢 훅 지원                                                                  | 🟡 PreInvocation (매 호출 — 페이로드 경량화 필요)       |
| SessionEnd 정리                                               | 🟢 mcp-lifecycle 이관 완료 — 호스트 이벤트 불요 (전 호스트 공통)            | 🟢 동일                                                 |
| Subagent 격리 위원회 (filid·prawf·atlassian)                  | 🔴 agents 컴포넌트 없음 — 별도 설치·재설계 전까지 미이식                    | 🟡 agents .md 수용 실측됐으나 스폰 의미론 미검증        |
| 호스트 결합 쓰기 — maencof `CLAUDE.md`·filid `.claude/rules/` | 🟡 `OGHAM_HOST` env 분기로 `AGENTS.md`·Codex 규칙 채널 대상화 (Stage 4, G8) | 🟡 동일 분기 — agy 는 `.agents/rules/`·`GEMINI.md` 후보 |
| `user_invocable`·`argument-hint` 등 Claude frontmatter        | 드롭 여부 미실측 (수용은 확인 — G6 관찰 대상)                               | 드롭 여부 미실측 (수용은 확인)                          |
| Claude 전용 UX (deilen 뷰어 자동오픈 등 MCP 무관 기능)        | 🟢 MCP 경유라 손실 없음 (단 cwd 의미 변화 — §6.7)                           | 🟢 동일                                                 |

## 8. 출처 · 신뢰도

- ✅ **실측 확정 (2026-07-14, 로컬)**: codex-cli 0.144.4 — ponytail 설치(`codex plugin marketplace add`/`add`), `[hooks.state]` trusted_hash 3건, SessionStart 훅의 `PLUGIN_DATA` 플래그 기록, `codex features list`(hooks/plugins/plugin_sharing/remote_plugin=stable).
- ✅ **소스 검증 (openai/codex main, 2026-07-14)**: `config/hook_config.rs`(이벤트 10종·스키마), `hooks/engine/output_parser.rs`(stdout 계약), `hooks/engine/command_runner.rs`(실행·timeout), `hooks/engine/discovery.rs`(env 주입·trust 해시), `hooks/events/pre_tool_use.rs`(stdin·exit 2), `core/tools/hook_names.rs`(Write/Edit/Agent 별칭·Bash 직렬화), `utils/plugins/plugin_namespace.rs`(매니페스트 fallback), `core-plugins/marketplace.rs`(마켓플레이스 fallback·untagged source), `codex-mcp/plugin_config.rs`(cwd 기본=플러그인 루트·루트 밖 금지), `ext/mcp/executor_plugin/provider.rs`(mcpServers 선언 시 `.mcp.json` 대체), plugin-creator 스킬 `plugin-json-spec.md`(매니페스트/마켓플레이스 스키마).
- ✅ **실측 확정 (2026-07-11, 로컬 — agy 축 유지)**: agy plugin CLI 5종/컴포넌트 validate/설치 위치/hooks.json named-group 5이벤트/`--print` MCP 미기동, Codex 0.144.1 의 `mcp__<server>.<tool>` 도구명·args 미전개.
- 📖 **agy 공식 번들 문서** (`~/.gemini/antigravity-cli/builtin/skills/agy-customizations/docs/*.md`): 플러그인 구조·MCP 스키마·declared 레이어·훅 계약.
- 📄 **ponytail 저장소** (멀티호스트 플러그인 선행 사례): Claude/Codex 훅 파일 공유(`hooks/claude-codex-hooks.json`), `PLUGIN_DATA` 런타임 분기, gemini `hooks/hooks.json` 자동 로드 회피 관행.
- ⚠️ **미실측**: §6 게이트 G1–G6 전부, agy 인터랙티브 MCP·도구명·agents 스폰.
