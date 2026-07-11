# Host Capability Matrix — Claude Code · Codex · Antigravity

조사 결론(2026-07-11 갱신). 근거: **로컬 실측**(codex-cli 0.144.1 · agy 1.1.1, PoC 플러그인 설치/기동/도구호출) + 공식 문서 + agy 바이너리 내장 문서. 2026-06-28 문서 기반 조사에서 추정이던 항목을 실측으로 확정/정정했다.

## 1. 메커니즘 대응 (3 호스트)

| Claude 메커니즘                                      | Codex 대응                                                       | Antigravity(agy) 대응                                                |
| ---------------------------------------------------- | ---------------------------------------------------------------- | -------------------------------------------------------------------- |
| **MCP 서버** (`.mcp.json` → `bridge/mcp-server.cjs`) | 🟢 `.mcp.json` — **동일 `mcpServers` 래퍼** (실측)               | 🟢 `mcp_config.json` — 동일 래퍼, 파일명만 상이 (실측)               |
| **Skills** (`skills/<n>/SKILL.md`)                   | 🟢 동일 구조 `SKILL.md` (+ skill별 `agents/openai.yaml` 확장)    | 🟢 **무변환 수용** (Claude 형식 그대로 processed, 실측)              |
| **Agents** (`agents/<n>.md`)                         | 🟠 플러그인 컴포넌트 아님 → `.codex/agents/*.toml` 별도 설치     | 🟢 **동일 `.md` 형식 수용** (frontmatter 포함, 실측)                 |
| **Hooks** (`hooks/hooks.json`)                       | 🔴 **플러그인 훅 사용 불가** (`plugin_hooks`=removed, 실측 §4.2) | 🟡 루트 `hooks.json` — named-group 형식·이벤트셋 상이                |
| **Commands** (Claude: skills 로 통합됨)              | — (Skills 로 대체)                                               | 🟢 `commands/<n>.toml` (gemini 형식) → skills 자동 변환              |
| **Rules** (CLAUDE.md / .claude/rules)                | `AGENTS.md`                                                      | `GEMINI.md` · `AGENTS.md` · `.agents/rules/*.md` · 플러그인 `rules/` |
| **Marketplace** (`.claude-plugin/marketplace.json`)  | `.agents/plugins/marketplace.json` (스키마 §5.1)                 | Claude marketplace.json 규약 재사용 + `plugins.json` declared (§5.1) |

호환 레이어: Codex 는 hook 커맨드에 `PLUGIN_ROOT`/`CLAUDE_PLUGIN_ROOT` 별칭을 주입(공식 문서)하나 **MCP args/env 에는 어떤 주입도 없다**(실측 — poc_echo 가 env 4종 전부 null 반환). agy 는 `agy plugin import claude` 명령으로 Claude 플러그인 임포트 경로를 자체 제공한다.

## 2. 2층 차이 모델 (유지, 실측으로 보강)

| 층                 | 정의                   | 처리                                  | 결과                            |
| ------------------ | ---------------------- | ------------------------------------- | ------------------------------- |
| **L1 스칼라 치환** | 같은 의미, 표기만 다름 | 정본의 논리 토큰 → 프로파일 값 바인딩 | **완전 호환**                   |
| **L2 구조 분기**   | 한쪽에만 존재/부재     | 호스트별 emitter 분기·조건부 선언     | **빌드에 격리** (사라지진 않음) |

실측 후 재배치된 항목: `.mcp.json` 래퍼는 L2 → **L1 로 강등**(Codex 가 동일 래퍼 수용, 파일명/경로전략만 차이). 반대로 Codex hooks 는 L2 "재배선" → **L2 "전면 드롭 + 대체 채널"로 격상**(§4.2).

## 3. L1 — 스칼라 치환 (실측 확정값)

| 항목                        | Claude                                  | Codex                                      | Antigravity                                                             |
| --------------------------- | --------------------------------------- | ------------------------------------------ | ----------------------------------------------------------------------- |
| MCP 설정 파일명             | `.mcp.json`                             | `.mcp.json`                                | `mcp_config.json`                                                       |
| MCP 래퍼                    | `{"mcpServers": {...}}`                 | 동일 (실측 ✅)                             | 동일 (실측 ✅)                                                          |
| **도구명 (모델-facing)**    | `mcp__plugin_<plugin>_<server>__<tool>` | `mcp__<server>.<tool>` (실측 ✅)           | `mcp_<server>_<tool>` (바이너리 관찰)                                   |
| skill 상호참조              | `/<plugin>:<skill>`                     | `$<skill>` / `/skills` (문서, 재확인 필요) | 스킬명 직접 언급 (실측 게이트 잔존)                                     |
| 플러그인 루트 (hook 커맨드) | `${CLAUDE_PLUGIN_ROOT}`                 | `${PLUGIN_ROOT}` + Claude 별칭 (문서)      | cwd=hooks.json 위치 (변수 불필요)                                       |
| 플러그인 루트 (MCP args)    | `${CLAUDE_PLUGIN_ROOT}` 전개됨          | **전개 안 됨** → `cwd: "."` 전략 (§4.1)    | **공식 스키마에 cwd 없음** — 상대 args 해석 기준 미문서화 (§4.4 게이트) |

- **도구명 조립 규칙**: 정본은 논리 tool 명만 참조. Codex 는 서버명 하이픈을 언더스코어로 정규화(`yt-dlp-mcp` → `mcp__yt_dlp_mcp.<tool>`), 플러그인 스코프 없음 — 서버명 전역 충돌 가능성 있음(ogham 서버명 `tools` 다수 → §6 리스크). Codex `non_prefixed_mcp_tool_names` feature 가 개발 중 — 형식 추가 변동 가능.
- 서버명 비균일성(`deilen=tools`, `filid=t`)이 정본 논리참조를 요구하는 근거는 유지.

## 4. L2 — 구조 분기 (실측 확정)

### 4.1 Codex MCP 경로 전략 — `cwd: "."` (게이트 #1 해소)

실측: `.mcp.json` args 의 `${CLAUDE_PLUGIN_ROOT}` 는 리터럴로 남아 세션 workdir 기준 상대경로가 되어 **서버 기동 실패**. 그러나 서버 항목의 **`cwd` 필드는 플러그인 설치 루트 기준으로 join 되어 절대화**된다(실측 — `cwd: "."` 로 기동 성공, `POCMCP_PROBE` stderr 확인).

| emit        | Claude                                                                      | Codex                                                           |
| ----------- | --------------------------------------------------------------------------- | --------------------------------------------------------------- |
| `.mcp.json` | `{"command":"node","args":["${CLAUDE_PLUGIN_ROOT}/bridge/mcp-server.cjs"]}` | `{"command":"node","args":["bridge/mcp-server.cjs"],"cwd":"."}` |

**Claude 도 `cwd` 를 지원한다** (공식 plugins-reference 확정 — 예시에 `"cwd": "${CLAUDE_PLUGIN_ROOT}"` 명시; `${CLAUDE_PLUGIN_ROOT}` 는 command/args/env/cwd 전 필드에서 전개, plugin.json 인라인 mcpServers 도 지원). 따라서 3-호스트 MCP 설정을 `cwd + 상대 args` 로 사실상 동형화할 수 있으나, **Claude emit 은 현행 변수-args 형태를 유지**한다 — cwd 를 바꾸면 서버 프로세스의 작업 디렉터리가 세션 디렉터리에서 플러그인 루트로 변해 무결손 원칙(요구 1)에 리스크가 생기기 때문. cwd 동형화는 `process.cwd()` 의존 감사(§6) 통과 후의 선택적 단순화로 남긴다.

### 4.2 Codex Hooks — 전면 불가 (기존 가정 폐기)

- `codex features list`: `plugin_hooks` = **removed**. (사용자 레벨 `hooks` feature 는 stable=true 로 별개.)
- 실측: `.codex-plugin/plugin.json` 에 `"hooks"` 필드를 선언하자 **세션이 시작조차 못 하고 행**(exec 3분 타임아웃, 필드 제거 즉시 회복).
- → 기존 문서의 "hooks 거의 보존, SessionEnd 만 재배선" 가정은 **폐기**. Codex 프로파일은 훅을 **전량 드롭**하고 대체 채널(§4.5)로 보상한다. hooks emitter 는 Codex 산출물에 hooks 관련 필드/파일을 **생성하지 않는다** (선언 자체가 유해).

### 4.3 Antigravity Hooks — 별도 어휘 (바이너리 내장 문서 + validate 실측)

| 항목        | Claude                                                                    | Antigravity                                                                                                                                                             |
| ----------- | ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 파일 위치   | `hooks/hooks.json` (plugin.json 이 참조)                                  | 플러그인 루트 `hooks.json` (규약 발견)                                                                                                                                  |
| 최상위 형식 | `{"hooks": {"<Event>": [...]}}`                                           | `{"<hookName>": {"enabled": bool, "<Event>": [...]}}` (named group)                                                                                                     |
| 이벤트      | SessionStart/End, UserPromptSubmit, Pre/PostToolUse, Stop, SubagentStart… | **PreToolUse · PostToolUse · PreInvocation · PostInvocation · Stop** 5종                                                                                                |
| matcher     | Claude 도구명 (`Read\|Write\|Edit`)                                       | agy 도구명 regex (`run_command`, `view_file`, `browser_.*`)                                                                                                             |
| stdin       | snake_case (`session_id`, `hook_event_name`)                              | **camelCase** (`conversationId`, `workspacePaths[]`, `stepIdx`)                                                                                                         |
| 실행        | 커맨드 그대로                                                             | `sh -c` (Unix) / `cmd /c` (Windows), `~` 전개, **cwd = hooks.json 위치**                                                                                                |
| 응답 계약   | `hookSpecificOutput` 등                                                   | PreToolUse: `{decision: allow\|deny\|ask\|force_ask, reason, permissionOverrides[]}` / Pre·PostInvocation: `{injectSteps: [{ephemeralMessage\|userMessage\|toolCall}]}` |
| timeout     | 초 단위 명시                                                              | 기본 30s                                                                                                                                                                |

이벤트 매핑(프로파일 번역표): `SessionStart(컨텍스트 주입)` → `PreInvocation` + 세션당 1회 가드(런타임 분기), `UserPromptSubmit` → `PreInvocation`(매 모델 호출마다 — 의미 확장 주의), `SessionEnd` → `Stop`(대화 종료가 아닌 실행 루프 종료 — 의미 축소) 또는 drop, `PreToolUse` → matcher 를 agy 도구명으로 번역(`Write|Edit` ≈ `write_to_file|replace_file_content` 계열 — 정확 어휘는 Stage 1 실측), `SubagentStart` → 대응 없음(drop).

### 4.4 Antigravity MCP — 공식 스키마 확정, 런타임 기동 미검증

공식 번들 문서(`~/.gemini/antigravity-cli/builtin/skills/agy-customizations/docs/mcp_servers.md` — 설치본과 버전 일치가 보장되는 최고 신뢰 소스) 기준:

- 스키마 2종: **Stdio** `{command(필수), args, env}` / **SSE** `{serverUrl}` (원격은 `url` 아닌 `serverUrl`).
- **`cwd` 필드가 공식 스키마에 없음** — Codex 의 `cwd: "."` 전략을 그대로 쓸 수 없다. 플러그인 MCP 의 상대 `args` 해석 기준(플러그인 디렉터리인지 세션 cwd 인지)이 미문서화 → **Stage 1 실측 게이트**. 실패 시 대안: setup 스킬이 설치 후 절대 경로 주입.
- `mcp_config.json` + `mcpServers` 래퍼가 validate 에서 "processed" (실측 ✅). 내장 문서: "MCP Servers … are **launched**, and their tools are made available."
- 단, **`agy --print` 모드에서는 플러그인 MCP 서버가 스폰되지 않음**(stderr 마커 부재 실측). hooks.json 은 같은 조건에서 로드됨(로그 확인). → 인터랙티브 모드 기동 여부가 Stage 1 실측 게이트.
- 설치: `agy plugin install <path|plugin@marketplace>` → `~/.gemini/config/plugins/<name>/` 통째 복사, `import_manifest.json` 에 컴포넌트 기록.
- 공식 plugins.md 의 플러그인 구조에는 `agents/` 가 없으나 **실측으로 수용 확인** (문서 지연으로 판단 — `agy agents` 리스팅에도 노출).

### 4.5 Codex 훅 부재의 대체 채널 (설계 결정)

훅이 담당하던 기능의 Codex 보상 경로. 완전 동등은 불가 — **기능 손실 매트릭스**(§7)에 명시.

| 훅 기반 기능                           | 대체 채널                                                                                                                                                                                                                     |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SessionStart 컨텍스트 주입 (filid 등)  | (a) 각 skill 본문 도입부에 lazy-init 지시 삽입(emit 시), (b) `AGENTS.md` emit                                                                                                                                                 |
| PreToolUse 구조 가드 (filid)           | **호스트 파일 도구(apply_patch)는 가로챌 수 없음 — 강제력 상실을 정직하게 고지.** AGENTS.md 서술은 soft guard(모델이 무시 가능). 부분 보상: 자사 MCP 도구 경유 작업은 **서버 미들웨어 가드**로 강제 가능 (교차검증 제안 반영) |
| SessionEnd 정리 (filid/maencof/imbas)  | MCP 서버 시작 시 stale sweep (서버는 세션마다 새로 뜸 — 자연스러운 후킹 지점)                                                                                                                                                 |
| UserPromptSubmit 주입 (cennad/maencof) | 드롭 + skill 명시 호출로 대체                                                                                                                                                                                                 |

### 4.6 Agents

| 정본                 | Claude          | Codex                                               | Antigravity                   |
| -------------------- | --------------- | --------------------------------------------------- | ----------------------------- |
| 산출물               | `agents/<n>.md` | `.codex/agents/<n>.toml` (**번들 불가, 별도 설치**) | `agents/<n>.md` **그대로**    |
| 본문                 | md body         | `developer_instructions`                            | md body                       |
| `tools` 화이트리스트 | 그대로          | `sandbox_mode` + MCP allowlist 근사                 | 그대로 (해석 수준 미실측)     |
| `model`              | sonnet/opus     | 프로파일 명시 매핑                                  | 미실측 (agy 자체 모델 슬러그) |
| `maxTurns`           | 지원            | 드롭(전역 설정만)                                   | 미실측                        |

Codex 만 L2 (bundle: standalone→`.codex/agents/` 설치 스텝, embed→skill 인라인). agy 는 L0(무변환).

## 5. 배포 · 설치 채널 (실측)

### 5.1 마켓플레이스/설치 명령

| 호스트 | 마켓플레이스 매니페스트                                                     | 설치                                                                                                               | 설치 형태                                                                   |
| ------ | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| Claude | `.claude-plugin/marketplace.json`                                           | `/plugin marketplace add` → `/plugin install`                                                                      | 관리 디렉터리 복사                                                          |
| Codex  | `.agents/plugins/marketplace.json`                                          | `codex plugin marketplace add <path\|git>` → `codex plugin add <n>@<mp>`                                           | `~/.codex/plugins/cache/<mp>/<n>/<version>/` 스냅샷, config.toml 에 enabled |
| agy    | **Claude `.claude-plugin/marketplace.json` 규약 재사용** (superpowers 실측) | `agy plugin install <path\|plugin@marketplace>` / `import [claude\|gemini]` / `.agents/plugins.json` declared 등록 | `~/.gemini/config/plugins/<n>/` 통째 복사, import_manifest 기록             |

- Codex marketplace.json 스키마(실측): `{name, interface.displayName, plugins: [{name, source: {source: "local", path}, policy: {installation, authentication}, category}]}` — Claude 스키마와 필드 구조 상이(중첩 source/policy).
- **agy 의 세 번째 배포 경로 — `plugins.json` declared 레이어** (공식 json_configs.md): `.agents/plugins.json` 의 `{"entries": [{"path": "<임의 경로>"}]}` 가 기본 발견 위치 밖 플러그인을 등록. **모노레포 특효**: repo 에 `.agents/plugins.json` 을 체크인해 `plugins/<pkg>/targets/agy` 를 지목하면 **클론만으로 활성화**(설치 명령 불요). `include_only`/`exclude` regex 와 `inherits`(팀 공유 config) 지원. 우선순위: Workspace > Declared > Global > Built-in.
- **설치는 세 호스트 모두 "지정 디렉터리 통째 복사"** — 배포 격리(정본만 전달)는 소스 저장소가 **호스트별 배포 트리를 분리**해야 달성된다 → [compiler-architecture.md](./compiler-architecture.md) §4.
- Gemini CLI 는 agy 로 대체 진행 중(2026-06-18 무료/Google One 티어 전환 — 웹 리서치) — gemini-extension.json 별도 타깃의 추가 가치는 낮고, 필요 시 `agy plugin import gemini` 역방향으로 흡수.

### 5.2 Windows / POSIX (신규 축)

| 관심사            | Claude                                                                        | Codex                         | Antigravity                  |
| ----------------- | ----------------------------------------------------------------------------- | ----------------------------- | ---------------------------- |
| hook 실행         | 커맨드 문자열 (ogham 은 `node …/run.cjs` 직호출)                              | (플러그인 훅 없음)            | `sh -c` / `cmd /c` 자동 분기 |
| Windows 전용 필드 | (없음 — run.cjs 가 process.execPath 로 우회)                                  | hooks `commandWindows` (문서) | (자동 분기라 불필요)         |
| MCP 기동          | `command: "node"` PATH 해석                                                   | 동일 + `cwd` join             | 동일 추정                    |
| ogham 현 자산     | `libs/run.cjs` (Windows PATH/쉘 우회 러너), `@ogham/cross-platform`(spawnCli) | —                             | —                            |

원칙: **훅/서버 진입은 항상 `node <script>` 직접 호출**(쉘 스크립트 금지 — superpowers 의 폴리글랏 .cmd 같은 우회가 불필요해짐), 경로는 변수 또는 cwd 상대, 경로 구분자는 Node 가 흡수. 검증은 CI `windows-latest` 매트릭스(Stage 3).

Windows 함정 (교차검증 지적 반영): agy 훅 커맨드는 `cmd /c` 를 경유하므로 (a) 커맨드 문자열은 공백 경로 인용이 필요 없는 형태로 emit — cwd 가 hooks.json 위치로 고정되는 규약을 활용해 `node libs/run.cjs …` 상대 경로만 사용, (b) 훅 stdin/stdout 은 UTF-8 명시(코드페이지 CP949 오염 방지), (c) `cmd /c` 의 이스케이프 규칙을 피해 인자에 특수문자 미사용.

## 6. 리스크 / 열린 실측

1. **Codex 서버명 전역 충돌**: 도구명에 플러그인 스코프가 없어(`mcp__tools.*`) ogham 플러그인 다수가 서버명 `tools` 를 공유하면 충돌 위험. → 정본 `mcp.server` 를 **호스트별 오버라이드 가능**하게 (Codex emit 시 `<plugin>` 을 서버명으로: `mcp__deilen.render_viewer`). Stage 1 에서 다중 플러그인 동시 설치로 실측.
2. **agy 인터랙티브 MCP 기동** (§4.4) — Stage 1 게이트.
3. **agy MCP cwd 해석** — 설치 루트 기준인지 실측 필요 (아니면 mcp_config.json 위치 기준 — 훅과 동일 규약이면 후자).
4. **Codex skills 의 모델 노출 형식**(`$<skill>` 호출 구문 포함) — exec 응답에서 미확인, TUI 실측 필요.
5. **agy 도구명 실측** — `mcp_<server>_<tool>` 은 바이너리 문자열 관찰 기반 추정.
6. MCP 서버의 `process.cwd()` 의존 여부 점검 — `cwd: "."` 전략 채택 시 세션 cwd 를 쓰는 로직(deilen 파일 경로 해석 등)이 플러그인 루트로 바뀌는 부작용 감사.
7. Codex `interface` 필드(스토어 메타) — 선택이지만 스토어 노출 품질을 위해 정본 `plugin.yaml` 에 반영 여부.

## 7. 기능 손실 매트릭스 (호스트별 불가 기능과 대체)

"완전 호환" 은 L1 한정. 아래는 **사용자에게 고지할 손실과 대체**의 정본.

| 기능 (사용 플러그인)                                    | Codex                                                     | Antigravity                                          |
| ------------------------------------------------------- | --------------------------------------------------------- | ---------------------------------------------------- |
| SessionStart 컨텍스트 주입 (filid·maencof·cennad·imbas) | ❌ 훅 불가 → skill lazy-init + AGENTS.md (수동 밀도 저하) | 🟡 PreInvocation + 1회 가드 (매 invocation 오버헤드) |
| PreToolUse 파일 가드 (filid·maencof)                    | ❌ 드롭 → AGENTS.md 규칙 서술 (강제력 없음)               | 🟡 matcher 번역 (agy 도구 어휘로, 커버리지 부분)     |
| SessionEnd 정리/recap (filid·maencof·imbas)             | 🟡 MCP 서버 기동 시 sweep (다음 세션 시점으로 지연)       | 🟡 Stop 재배선 (의미 축소: 실행 루프 종료마다)       |
| UserPromptSubmit 상태 주입 (cennad·maencof)             | ❌ 드롭                                                   | 🟡 PreInvocation (매 호출 — 페이로드 경량화 필요)    |
| Subagent 격리 위원회 (filid·prawf·atlassian)            | 🟡 `.codex/agents/*.toml` 별도 설치 + maxTurns 상실       | 🟡 agents .md 수용 실측됐으나 스폰 의미론 미검증     |
| `user_invocable`·`argument-hint` 등 Claude frontmatter  | 드롭 (Codex frontmatter: name/description 만)             | 드롭 여부 미실측 (수용은 확인)                       |
| Claude 전용 UX (deilen 뷰어 자동오픈 등 MCP 무관 기능)  | 🟢 MCP 경유라 손실 없음                                   | 🟢 동일                                              |

## 8. 출처 · 신뢰도

- ✅ **실측 확정** (2026-07-11, 로컬): Codex 마켓플레이스 스키마/설치 캐시/`mcpServers` 래퍼/`cwd: "."` 기동/도구명 `mcp__<server>.<tool>`/args 변수 미전개/env 미주입/플러그인 훅 행, agy plugin CLI 5종/컴포넌트 5종 validate/설치 위치/hooks.json named-group 5이벤트/`--print` MCP 미기동.
- 📖 **agy 공식 번들 문서** (`~/.gemini/antigravity-cli/builtin/skills/agy-customizations/docs/{plugins,hooks,rules,skills,mcp_servers,json_configs}.md` — 설치본과 버전 일치, 웹 SPA 문서보다 신뢰): 플러그인 구조·MCP 스키마(Stdio/SSE)·declared 레이어(plugins.json/skills.json)·훅 계약 전문.
- 🌐 **웹 리서치 교차확인** (2026-07-11): agy 마켓플레이스가 Claude marketplace.json 규약 재사용(superpowers), Gemini CLI→agy 대체 일정, `AGENTS.md` 네이티브 지원(v1.20.3+), 원격 MCP `serverUrl`(SSE).
- 📄 **외부 문서** (2026-06-28 조사분 유지): Codex hook 커맨드 변수 주입, custom prompts deprecation, `.codex/agents` 필드 매핑, `commandWindows`.
- ⚠️ **미실측** (§6): agy 인터랙티브 MCP·도구명·agents 스폰, Codex skills 노출 형식.
