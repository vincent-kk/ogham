# Skills — `setup`, `codex`, `gemini`

플러그인 prefix 미사용. 디렉토리는 `skills/setup/`, `skills/codex/`, `skills/gemini/`. SKILL.md 의 `name` 도 prefix 없이 `setup` / `codex` / `gemini`. `user_invocable: true`.

플러그인 메타데이터 (`plugin.json`) 에는 `agents` 필드를 추가하지 않는다 (사용자 메모리 `feedback_plugin_json_agents.md`).

## 공통 컨벤션

- LLM 이 실행하는 스킬. 본문은 짧고 명령형 (사용자 메모리 `feedback_skill_llm_context.md` → in-context values, no extra filesystem reads).
- 도구 호출 표기: `mcp_tools_start_conversation`, `mcp_tools_continue_conversation`, `mcp_tools_open_settings`. (서버 이름이 `tools` 이므로 prefix `mcp_tools_`.)
- 모든 응답은 `ConversationResponse` JSON. Claude 가 그대로 받아서 다음 행동 결정.

## skill: `setup`

설정 UI 를 띄운다.

### Frontmatter
```yaml
---
name: setup
description: "[cogair] Open the local settings UI for ratio, intervention strength, keywords, and defaults. Trigger: \"cogair 설정\", \"open cogair settings\", \"개입 강도\""
user_invocable: true
argument-hint: ""
---
```

### Body
1. `mcp_tools_open_settings` 를 인자 없이 호출.
2. 응답의 `url` 을 사용자에게 출력.
3. 응답의 `reused` 가 `true` 면 "기존 설정 서버를 재사용했습니다" 안내.
4. headless / 브라우저 미오픈 가능성 명시 후 URL 직접 접속 요청.
5. 위 단계가 전부이며, Claude 가 추가 질문(URL/모델/키 등)을 하지 않는다.

## skill: `codex`

Codex CLI 위임.

### Frontmatter
```yaml
---
name: codex
description: "[cogair] Delegate to OpenAI Codex CLI via cogair. Use for heavy code generation/refactoring, sandboxed shell work, or independent second opinions from a different model family."
user_invocable: true
argument-hint: "[--continue <session_id>] [--model high|mid|low|auto] [--multi-agent] -- \"prompt\""
---
```

### When to use / when not
- codex-call SKILL.md 의 "When to use / not" 단락을 압축해 포함 (vault writes 항목은 제외 — 본 플러그인은 vault 와 무관).

### Body — 호출 매핑
- 인자에 `--continue <session_id>` 가 있으면 `mcp_tools_continue_conversation({ session_id, prompt })`.
- 그 외에는 `mcp_tools_start_conversation({ provider: 'codex', prompt, model?, multi_agent? })`.
- 응답 JSON 의 `session_id` 를 후속 호출에 쓸 수 있도록 출력에 그대로 노출.
- 실패 응답 (`status: 'failure'`) 이면 `error.code` 기준으로 다음 단계 안내:
  - `auth` → 사용자에게 `codex login` 실행 요청.
  - `rate_limit` / `budget_exhausted` → 잠시 후 재시도 또는 다른 provider 선택.
  - `network` / `cli_error` / `unknown` → 메시지 그대로 사용자에게 전달.

### Body — model alias 매핑
| cogair alias | codex 의도 |
|---|---|
| `high` | `gpt-5-codex` (또는 환경 변수 `COGAIR_CODEX_HIGH` 가 지정한 값) |
| `mid` | `gpt-5.1-codex` |
| `low` | `o3` |
| `auto` | dispatcher 가 codex-cli 기본값에 위임 |

스킬은 alias 만 그대로 전달. 실제 모델 ID 매핑은 dispatcher 의 `model-alias.ts` 가 담당.

## skill: `gemini`

Gemini CLI 위임.

### Frontmatter
```yaml
---
name: gemini
description: "[cogair] Delegate to Google Gemini CLI via cogair. Use for live web-grounded research, very-large-context synthesis, or knowledge past Claude's cutoff."
user_invocable: true
argument-hint: "[--continue <session_id>] [--model high|mid|low|auto] [--multi-agent] -- \"prompt\""
---
```

### When to use / when not
- gemini-call SKILL.md 압축. 동일하게 vault 항목 제외.

### Body — 호출 매핑
- codex 와 동일 구조. provider 만 `'gemini'` 로 바꿈.
- 실패 응답 처리도 동일. `auth` → `gemini auth login` 안내.

### Body — model alias 매핑
| cogair alias | gemini 의도 |
|---|---|
| `high` | `gemini-2.5-pro` (또는 환경 변수 `COGAIR_GEMINI_HIGH`) |
| `mid` | `gemini-2.5-flash` |
| `low` | `gemini-2.5-flash-lite` |
| `auto` | dispatcher 가 gemini-cli 기본값에 위임 |

## 스킬 ↔ 도구 매트릭스

| Skill | start_conversation | continue_conversation | open_settings |
|---|---|---|---|
| setup | — | — | O |
| codex | O (provider=codex) | O | — |
| gemini | O (provider=gemini) | O | — |

## 참고 자료 정책

- 검증된 `~/.claude/skills/codex-call/`, `gemini-call/` 의 `reference/`, `methods/` 디렉토리 구조를 cogair 스킬은 **재현하지 않는다**. cogair 스킬의 책임은 도구 호출 매핑뿐.
- 외부 CLI 동작 자체에 대한 상세는 dispatcher INTENT.md 와 `architecture.md` §dispatcher 에 둔다 (코드 옆 문서).
