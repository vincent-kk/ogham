# 백로그 — Phase D (agy 심화) · Phase E (Codex 심화)

> **작성 2026-07-15.** Phase A(어댑터 정정)·B(CI·README) 완료 후 남긴 **선택 작업**. 지금 당장 필요하지 않지만, 착수할 때 근거를 다시 파지 않도록 실측 사실과 함정을 함께 적는다.
> 사실 정본 [host-capability-matrix.md](./host-capability-matrix.md) · 전체 계획 [transition-plan.md](./transition-plan.md).

---

## Phase D — agy 심화

### D1. agy 포맷 `hooks.json` emitter (= 기존 "Stage 3 러너 어댑터")

> **⚠ 2026-07-15 실측: 번역 어댑터는 완성·검증됐으나, agy 1.1.2 가 PreInvocation injectSteps 를 렌더하지 않아 컨텍스트 주입 훅은 아직 무가치.** 상세는 [m2-measurement-log.md](./m2-measurement-log.md) "agy 훅 어댑터(D1)".
>
> **완료·커밋된 것** (`01d1ca98`):
>
> - `@ogham/cross-platform/agy-hooks` — 순수 번역(agy PreInvocation payload → Claude SessionStart/UserPromptSubmit, additionalContext → injectSteps). 12 테스트.
> - `@ogham/cross-platform/agy-runner` — 런타임 래퍼(agy stdin 판독 → 번역 → 기존 `bridge/<hook>.mjs` 스폰 → 응답 역변환 → SessionStart once-guard). 9 테스트. Claude/Codex 경로 무영향.
>
> **라이브 검증 (agy 1.1.2, `agy plugin install` 로 등록)**:
> - ✅ agy 가 **agy-format hooks.json 을 로드**한다 — `jsonhook.go:189 … 1 named hooks, 1 total handlers`. (구 Claude 포맷은 `invalid hook "hooks"` 파싱 실패였다 — 아래.) `agy plugin validate` 도 `✔ hooks : 1 processed`.
> - ✅ agy 가 **PreInvocation 을 발화**하고 러너가 **정확히 번역**한다 — 핸들러가 올바른 Claude payload 를 받고, 러너가 정확히 `{"injectSteps":[{"ephemeralMessage":"…"}]}` 를 방출(stdout tee 로 확인).
> - ❌ **agy 1.1.2 는 그 PreInvocation injectSteps 를 적용하지 않는다** — 주입 텍스트가 모델 transcript 에 도달 안 함(--print 확정, 대화형은 tmux 불안정으로 미확정). 어댑터는 정확하며 **agy 자체의 injectSteps 처리 한계**(hooks 문서 "Current Limitations" 의 미구현 항목들과 부합).
>
> **배운 사실 3가지**:
> 1. agy 훅은 플러그인이 **등록(`agy plugin install <dir>`)돼야** 스캔된다 — `.agents/plugins/` 배치만으론 `agy plugin list` 에 안 잡히고 훅도 0개. (등록 후엔 `--print` 에서도 로드·발화.)
> 2. `agy plugin install` 은 **`bridge/` 를 복사하지 않는다**(hooks.json·plugin.json 만) — 훅 커맨드가 참조하는 번들이 설치 위치에 없어 무동작. 전체 플러그인 디렉터리를 `.agents/plugins/<n>/` 에 두고 그걸 install 해야 한다(= D2 배치와 결합).
> 3. agy 대화형은 **로그인돼 있다**(lunox298@gmail.com, Gemini 3.1 Pro) — `--print` 의 "not logged in" 은 print 모드 아티팩트.
>
> **결론 / 다음 작업**:
> - **컨텍스트 주입 훅(SessionStart·UserPromptSubmit)** 은 agy 가 injectSteps 를 렌더할 때까지 **보류**(어댑터는 준비됨). agy 업스트림 이슈로 추적.
> - **우회 후보 — 게이팅 훅(D1b)**: PreToolUse `decision`(도구 차단/승인)은 injectSteps 가 **아닌** 별도 채널이라 동작할 수 있다. D1b(도구-이벤트 번역: agy `toolCall` → Claude `tool_name`/`tool_input`, agy 도구명 매핑)를 구현하면 agy 가 filid 구조가드·maencof 레이어가드를 **강제**할 수 있다 — 미검증, 다음 작업.
> - emitter/빌드 배선은 위 결정(주입 보류 / 게이팅 채택 여부) 후 착수. 지금은 어댑터 기반만 커밋됨.

---

**아래는 원 배경 기록** (emitter 설계 — 게이팅 채택 시 유효):

**구 현상**: agy 가 우리 `hooks/hooks.json`(Claude 포맷)을 플러그인 루트로 복사한 뒤 최상위 키 `"hooks"` 를 **훅 이름**으로 오독해 파싱에 실패했다:

```
W hooks.go:44] Failed to parse hooks file …/maencof-lens/hooks.json:
  invalid hook "hooks": command hook must specify 'command'
I hooks_manager.go:53] loaded 0 named hooks from 0 hooks.json file(s)
```

**emitter 가 할 일**: 플러그인 루트에 **agy 포맷 `hooks.json`** 을 생성.

| 항목        | Claude (정본)                                                      | agy                                                                                                  |
| ----------- | ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| 최상위 형식 | `{"hooks": {"<Event>": [...]}}`                                    | `{"<hookName>": {"enabled": bool, "<Event>": [...]}}` (named group)                                  |
| 이벤트      | SessionStart·UserPromptSubmit·PreToolUse·PostToolUse·SubagentStart | **PreToolUse · PostToolUse · PreInvocation · PostInvocation · Stop** 5종만                           |
| matcher     | Claude 도구명                                                      | agy 도구명 regex (`run_command`, `view_file`, `browser_.*`)                                          |
| stdin       | snake_case (`session_id`·`tool_input`)                             | **camelCase** (`conversationId`·`workspacePaths[]`·`stepIdx`)                                        |
| 응답 계약   | `hookSpecificOutput.additionalContext` 등                          | PreToolUse: `{decision, reason, permissionOverrides[]}` / Pre·PostInvocation: `{injectSteps: [...]}` |

**이벤트 매핑**: `SessionStart` → `PreInvocation` + **세션당 1회 가드**(conversationId 기록), `UserPromptSubmit` → `PreInvocation`, `PreToolUse`/`PostToolUse` → 동명 + matcher 번역, `SubagentStart` → 드롭.

**런타임**: `libs/run.cjs` 가 agy 의 camelCase stdin 을 Claude 계약으로 정규화하고, 응답을 agy 계약으로 역변환해야 한다.

> ⚠ **선행 확인 필수**: 루트 `hooks.json` 을 **Codex 가 자동 발견해 오독하지 않는지** 확인할 것. Codex 는 매니페스트의 `hooks` 필드로 `hooks/hooks.json` 을 명시 선언하지만, Codex plugin-json 스펙은 "명시 선언은 기본 발견을 **보완**한다(replace 가 아니다)" 고 적고 있다. 루트에 agy 포맷 파일을 두면 Codex 가 그것도 읽어 이벤트 파싱에 실패할 수 있다. **오독하면 파일명을 바꾼다**(ponytail 이 훅 파일을 `claude-codex-hooks.json` 으로 지은 이유가 바로 이것).

### D2. agy 설치 스크립트

**현 상태**: `agy plugin install` 은 플러그인을 `~/.gemini/config/plugins/<n>/` 에 넣는데, **agy 는 거기서 플러그인 MCP 를 절대 띄우지 않는다**(설치 로그는 `✔ mcpServers : 1 processed` 라고 거짓 안심을 준다). MCP 가 뜨는 위치는 **커스터마이제이션 루트**뿐이다:

| 위치                               | 플러그인 MCP |
| ---------------------------------- | ------------ |
| `~/.gemini/config/plugins/<n>/`    | ❌           |
| `~/.agents/plugins/<n>/`           | ✅           |
| `<workspace>/.agents/plugins/<n>/` | ✅           |

**우리 어댑터는 이미 맞다** — 상대 args(`bridge/mcp-server.cjs`)는 플러그인 디렉터리 기준으로 정상 해석되고, 루트 `plugin.json` 덕에 agy 가 `source: antigravity` 로 분류해 `mcp_config.json`(+ `OGHAM_HOST`)을 보존한다. **위치만 옮기면 된다.**

**해야 할 일**: `plugins/<n>/` → `~/.agents/plugins/<n>/` 복사/심링크 스크립트. 현재 README 는 사용자에게 `cp -R` 을 안내하고 있다.

**한계 고지**: 마켓플레이스로 설치하는 사용자는 이 단계를 수동으로 해야 한다. **agy CLI 가 자체 설치 위치에서 플러그인 MCP 를 로드하게 고칠 때까지 우리 쪽에서 해결할 방법이 없다.**

---

## Phase E — Codex 심화

### E1. 스킬 본문의 도구명 불일치 (G6)

스킬 본문이 Claude full-form(`mcp__plugin_deilen_tools__render_viewer`)을 쓰는데 **Codex 의 실제 도구명은 `mcp__deilen__render_viewer`** 다. 불일치가 **확정**됐다(추정 아님).

- 스킬 **로딩 자체는 정상** — Codex 가 `<plugin>:<skill>` 접두로 주입하고 설명·한국어 트리거도 보존된다.
- 완화안: 본문을 서술형 참조로 바꾸거나(정본 수정), 호스트별 안내를 `AGENTS.md` 로 보완.
- ⚠ **관련 기존 실패**: cennad `src/__tests__/acceptance/skill-contract.acceptance.test.ts` 4건이 **이미 깨져 있다** — 스킬 본문에서 full-form 도구명이 빠졌는데 acceptance 테스트는 아직 그걸 기대한다. E1 과 같은 주제이므로 함께 정리하는 것이 자연스럽다.

### E2. maencof 레코더의 도구명 정규화

훅 내부에서 Claude full-form 도구명으로 매칭하는데 Codex 도구명은 `Bash`·`apply_patch`·`mcp__<server>__<tool>` 이다 → 자동 기록이 부분 무동작.

### E3. filid·imbas 의 `Read` matcher

Codex 에 `Read` 별칭이 **없어서** PreToolUse matcher `Read|Write|Edit` 중 Write/Edit(→`apply_patch`)만 발화한다. 읽기 추적 손실. 생성기가 이미 warning 으로 노출 중(`codex-read-matcher`).

- 대안: Codex 의 read 계열 도구명을 실측해 matcher 를 확장하거나, 손실을 고지하고 대체 신호(PostToolUse `Bash` 관찰 등)를 설계.

### E4. 기타

- **`commandWindows`** — Codex 훅의 Windows 전용 커맨드 필드. `cmd /C` 는 `${VAR}` 를 전개하지 않으므로 Windows 지원 시 병기 필요.
- **agents 컴포넌트 부재** — Codex 에 `agents` 플러그인 컴포넌트가 없다. filid Phase D 위원회·prawf·atlassian 미디어 등 subagent 의존 스킬의 Codex 거동을 정의해야 한다(별도 설치 안내 또는 단일 에이전트 폴백).
