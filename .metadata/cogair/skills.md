# Skills — `setup`, `codex`, `gemini`, `antigravity`, `crosscheck`

플러그인 prefix 미사용. 디렉토리는 `skills/setup/`, `skills/codex/`, `skills/gemini/`, `skills/antigravity/`, `skills/crosscheck/`. SKILL.md 의 `name` 도 prefix 없이 `setup` / `codex` / `gemini` / `antigravity` / `crosscheck`. `user_invocable: true`.

`plugin.json` 에는 `agents` 필드 추가하지 않는다.

## 공통 컨벤션

- LLM 이 실행하는 스킬. 본문은 짧고 명령형.
- 도구 호출 표기: `mcp_tools_start_conversation`, `mcp_tools_continue_conversation`, `mcp_tools_open_settings`, `mcp_tools_list_antigravity_models`. (MCP 서버 이름이 `tools` 이므로 prefix `mcp_tools_`.)
- 모든 응답은 `ConversationResponse` JSON. Claude 가 그대로 받아 다음 행동 결정.

## skill: `setup`

설정 UI 를 띄운다.

### Frontmatter

```yaml
---
name: setup
description: '[cogair] Open the local settings UI for ratio, intervention strength, keywords, and defaults. Trigger: "cogair 설정", "open cogair settings", "개입 강도"'
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
argument-hint: '[--continue <session_id>] [--model high|mid|low|auto] -- "prompt"'
---
```

### When to use / when not

- codex-call SKILL.md 의 "When to use / not" 단락을 압축 (vault 항목 제외).

### Body — 호출 매핑

- `--continue <session_id>` 있으면 → `mcp_tools_continue_conversation({ session_id, prompt })`.
- 그 외 → `mcp_tools_start_conversation({ provider: 'codex', prompt, model? })`.
- 권한 플래그(`yolo`/`sandbox`/`sandbox_backend`)와 그 외 dispatcher 옵션은 `/setup` 설정 UI 로만 관리한다 (MCP input 미노출).
- 응답 JSON 의 `session_id` 를 출력에 노출 (백틱으로 감싸 인라인 코드).
- 실패 응답 (`status: 'failure'`):
  - `auth` → 사용자에게 `codex login` 실행 요청.
  - `rate_limit` / `budget_exhausted` → 잠시 후 재시도 또는 다른 provider 선택.
  - `network` / `cli_error` / `unknown` → 메시지 그대로 사용자에게 전달.

### Body — model alias

| cogair alias | codex 모델                                                  |
| ------------ | ----------------------------------------------------------- |
| `high`       | codex-cli 기본값 (env `COGAIR_CODEX_HIGH` 설정 시 override) |
| `mid`        | codex-cli 기본값 (env `COGAIR_CODEX_MID` 설정 시 override)  |
| `low`        | codex-cli 기본값 (env `COGAIR_CODEX_LOW` 설정 시 override)  |
| `auto`       | codex-cli 기본값 (`-m` 생략)                                |

env 미설정 시 모든 tier 는 동일한 codex-cli 기본값으로 해결됨. 구체적 model ID 는 `src/dispatcher/codex/modelAlias.ts` 에서만 관리.

## skill: `gemini`

Gemini CLI 위임. gemini 와 antigravity 는 상호 배타적 Google 엔진이다 (Gemini CLI 서비스 종료 2026-06-18). 설정 UI 에서 둘 중 하나만 활성화 가능.

### Frontmatter

```yaml
---
name: gemini
description: "[cogair] Delegate to Google Gemini CLI via cogair. Use for live web-grounded research, very-large-context synthesis, or knowledge past Claude's cutoff."
user_invocable: true
argument-hint: '[--continue <session_id>] [--model high|mid|low|auto] -- "prompt"'
---
```

### When to use / when not

- gemini-call SKILL.md 압축 (vault 항목 제외).

### Body — 호출 매핑

- codex 와 동일 구조. provider 만 `'gemini'`.
- 실패 응답 처리: `auth` → `gemini auth login` 안내.

### Body — model alias

| cogair alias | gemini 모델                                                                |
| ------------ | -------------------------------------------------------------------------- |
| `high`       | gemini-cli 의 가장 강력한 tier (env `COGAIR_GEMINI_HIGH` 설정 시 override) |
| `mid`        | gemini-cli 의 균형 tier (env `COGAIR_GEMINI_MID` 설정 시 override)         |
| `low`        | gemini-cli 의 가장 가벼운 tier (env `COGAIR_GEMINI_LOW` 설정 시 override)  |
| `auto`       | gemini-cli 기본값 (`-m` 생략)                                              |

구체적 model ID 는 `src/dispatcher/gemini/modelAlias.ts` 에서만 관리.

## skill: `antigravity`

Antigravity CLI(`agy`) 위임. gemini 와 상호 배타적 Google 엔진 (Gemini CLI 서비스 종료 2026-06-18 이후 대체).

### Frontmatter

```yaml
---
name: antigravity
description: "[cogair] Delegate to the Antigravity CLI (agy) via cogair. Use as the Google-engine alternative to gemini for large-context synthesis, web-grounded research, or post-cutoff knowledge."
user_invocable: true
argument-hint: '[--continue <session_id>] [--model high|mid|low|auto] -- "prompt"'
---
```

### When to use / when not

- gemini 와 동일 사용 시나리오. 설정 UI 에서 Google 엔진을 `antigravity` 로 선택한 경우에 호출.
- gemini 가 활성화된 상태에서는 사용하지 않는다 (상호 배타적).

### Body — 호출 매핑

- `--continue <session_id>` 있으면 → `mcp_tools_continue_conversation({ session_id, prompt })`.
- 그 외 → `mcp_tools_start_conversation({ provider: 'antigravity', prompt, model? })`.
- 권한 플래그(`sandbox` / `skip_permissions`)는 `/setup` 설정 UI 로만 관리 (MCP input 미노출). sandbox-backend 없음.
- 응답 JSON 의 `session_id` 를 출력에 노출 (백틱으로 감싸 인라인 코드).
- `--continue` 재개 시 `externalSessionRef` 는 격리된 cwd 경로. agy 는 `--print` 모드에서 conversation id 를 노출하지 않아(Issue #7) cwd 격리로 세션을 식별.
- 실패 응답 (`status: 'failure'`):
  - `auth` → 사용자에게 `agy` 인증 확인 요청.
  - `cli_error` (Issue #76 empty-stdout) → transcript 폴백 실패 시 발생. agy 업데이트 또는 TTY 환경 권장 안내.
  - `rate_limit` / `budget_exhausted` → 잠시 후 재시도 또는 다른 provider 선택.
  - `network` / `unknown` → 메시지 그대로 사용자에게 전달.

### Body — model alias

| cogair alias | agy 모델                                                  |
| ------------ | --------------------------------------------------------- |
| `high`       | config `model_map.antigravity.high` (미설정 시 `-m` 생략) |
| `mid`        | config `model_map.antigravity.mid` (미설정 시 `-m` 생략)  |
| `low`        | config `model_map.antigravity.low` (미설정 시 `-m` 생략)  |
| `auto`       | `-m` 생략 (agy 기본값)                                    |

모델 풀네임은 config `model_map.antigravity` 에서만 관리. env override 없음; 하드코딩 model 문자열 금지. 사용 가능한 모델 목록은 `mcp_tools_list_antigravity_models` 로 조회 (`agy models` 캐시, TTL 1시간).

## skill: `crosscheck`

codex + Google 엔진(gemini 또는 antigravity) 병렬 위임. 두 응답을 합성.

### Frontmatter

```yaml
---
name: crosscheck
description: '[cogair] Cross-validate a prompt by dispatching to codex AND the active Google engine (gemini or antigravity) in parallel, then synthesize the two answers. Trigger: "crosscheck", "cross check", "교차검증", "양쪽에 물어봐"'
user_invocable: true
argument-hint: '[--model high|mid|low|auto] -- "prompt"'
---
```

### When to use / when not

- 두 모델 패밀리의 독립적 second opinion 이 가치 있는 결정 / 설계 리뷰.
- 단일 provider 가 강점이 명확한 작업, 멀티턴, secret 포함 프롬프트는 비추.

### Body — 호출 매핑

- `--continue` 미지원 (항상 두 fresh 세션). 사용자가 전달하면 `/cogair:codex --continue <id>` 또는 활성 Google 엔진 스킬(`/cogair:gemini` / `/cogair:antigravity`) `--continue <id>` 로 안내.
- 두 호출을 **병렬** (단일 메시지 두 tool use):
  - `mcp_tools_start_conversation({ provider: 'codex', prompt, model? })`
  - `mcp_tools_start_conversation({ provider: 'gemini', prompt, model? })` — 또는 설정상 활성 Google 엔진이 antigravity 이면 `provider: 'antigravity'`
- 부분 실패: 살아남은 응답 + 실패측 `error.code`/`message` 동시 노출. 양쪽 실패: 두 오류 노출 후 합성 skip.

### Body — 합성 포맷 (양쪽 성공)

4개 섹션 — `## Agreed` / `## Conflicting` / `## Final direction` / `## Action checklist`. `artifact_path` 가 있으면 `## Artifacts` 추가.

## 스킬 ↔ 도구 매트릭스

| Skill       | start_conversation                    | continue_conversation | open_settings | list_antigravity_models |
| ----------- | ------------------------------------- | --------------------- | ------------- | ----------------------- |
| setup       | —                                     | —                     | O             | —                       |
| codex       | O (provider=codex)                    | O                     | —             | —                       |
| gemini      | O (provider=gemini)                   | O                     | —             | —                       |
| antigravity | O (provider=antigravity)              | O                     | —             | O (모델 목록 조회 시)   |
| crosscheck  | O × 2 (codex + 활성 Google 엔진 병렬) | —                     | —             | —                       |

## 참고 자료 정책

- 검증된 `~/.claude/skills/codex-call/`, `gemini-call/` 의 `reference/`, `methods/` 디렉토리 구조를 cogair 스킬은 재현하지 않는다. 스킬 책임은 도구 호출 매핑뿐.
- 외부 CLI 동작 자체에 대한 상세는 dispatcher INTENT.md 와 `provider-dispatch.md` 에 둔다 (코드 옆 문서).
