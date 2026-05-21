# Skills — `setup`, `codex`, `gemini`

플러그인 prefix 미사용. 디렉토리는 `skills/setup/`, `skills/codex/`, `skills/gemini/`. SKILL.md 의 `name` 도 prefix 없이 `setup` / `codex` / `gemini`. `user_invocable: true`.

`plugin.json` 에는 `agents` 필드 추가하지 않는다.

## 공통 컨벤션

- LLM 이 실행하는 스킬. 본문은 짧고 명령형.
- 도구 호출 표기: `mcp_tools_start_conversation`, `mcp_tools_continue_conversation`, `mcp_tools_open_settings`. (MCP 서버 이름이 `tools` 이므로 prefix `mcp_tools_`.)
- 모든 응답은 `ConversationResponse` JSON. Claude 가 그대로 받아 다음 행동 결정.

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
3. `reused: true` 면 "기존 설정 서버 재사용" 안내.
4. headless / 브라우저 미오픈 가능성 명시 후 URL 직접 접속 요청.
5. 추가 질문(URL/모델/키 등)을 Claude 가 하지 않는다.

## skill: `codex`

Codex CLI 위임.

### Frontmatter
```yaml
---
name: codex
description: "[cogair] Delegate to OpenAI Codex CLI via cogair. Use for heavy code generation/refactoring, sandboxed shell work, or independent second opinions from a different model family."
user_invocable: true
argument-hint: "[--continue <session_id>] [--model high|mid|low|auto] [--option key=value]... -- \"prompt\""
---
```

### When to use / when not
- codex-call SKILL.md 의 "When to use / not" 단락을 압축 (vault 항목 제외).

### Body — 호출 매핑
- `--continue <session_id>` 있으면 → `mcp_tools_continue_conversation({ session_id, prompt })`.
- 그 외 → `mcp_tools_start_conversation({ provider: 'codex', prompt, model?, options? })`.
- `--option key=value` 는 여러 번 누적 가능. parsing 결과를 `options` 객체로 전달.
  - 예: `--option multi_agent=true` → `options: { multi_agent: true }`.
  - 값이 `true`/`false`/숫자/JSON 문자열인지 단순 추론.
- 응답 JSON 의 `session_id` 와 `meta.ignored_options` 를 출력에 노출.
- 실패 응답 (`status: 'failure'`):
  - `auth` → 사용자에게 `codex login` 실행 요청.
  - `rate_limit` / `budget_exhausted` → 잠시 후 재시도 또는 다른 provider 선택.
  - `network` / `cli_error` / `unknown` → 메시지 그대로 사용자에게 전달.

### Body — model alias
| cogair alias | codex 모델 |
|---|---|
| `high` | `gpt-5-codex` (env `COGAIR_CODEX_HIGH` override) |
| `mid` | `gpt-5.1-codex` |
| `low` | `o3` |
| `auto` | codex-cli 기본값 (`-m` 생략) |

## skill: `gemini`

Gemini CLI 위임.

### Frontmatter
```yaml
---
name: gemini
description: "[cogair] Delegate to Google Gemini CLI via cogair. Use for live web-grounded research, very-large-context synthesis, or knowledge past Claude's cutoff."
user_invocable: true
argument-hint: "[--continue <session_id>] [--model high|mid|low|auto] [--option key=value]... -- \"prompt\""
---
```

### When to use / when not
- gemini-call SKILL.md 압축 (vault 항목 제외).

### Body — 호출 매핑
- codex 와 동일 구조. provider 만 `'gemini'`.
- 실패 응답 처리: `auth` → `gemini auth login` 안내.

### Body — model alias
| cogair alias | gemini 모델 |
|---|---|
| `high` | `gemini-2.5-pro` (env `COGAIR_GEMINI_HIGH` override) |
| `mid` | `gemini-2.5-flash` |
| `low` | `gemini-2.5-flash-lite` |
| `auto` | `-m` 생략 |

## 스킬 ↔ 도구 매트릭스

| Skill | start_conversation | continue_conversation | open_settings |
|---|---|---|---|
| setup | — | — | O |
| codex | O (provider=codex) | O | — |
| gemini | O (provider=gemini) | O | — |

## 참고 자료 정책

- 검증된 `~/.claude/skills/codex-call/`, `gemini-call/` 의 `reference/`, `methods/` 디렉토리 구조를 cogair 스킬은 재현하지 않는다. 스킬 책임은 도구 호출 매핑뿐.
- 외부 CLI 동작 자체에 대한 상세는 dispatcher INTENT.md 와 `provider-dispatch.md` 에 둔다 (코드 옆 문서).
