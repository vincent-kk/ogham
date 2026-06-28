# Skills — `setup`, `codex`, `antigravity`, `claude`, `crosscheck`

플러그인 prefix 미사용. 디렉토리는 `skills/setup/`, `skills/codex/`, `skills/antigravity/`, `skills/claude/`, `skills/crosscheck/`. SKILL.md 의 `name` 도 prefix 없이 `setup` / `codex` / `antigravity` / `claude` / `crosscheck`. `user_invocable: true`.

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
description: '[cennad] Open the local settings UI for ratio, intervention strength, keywords, and defaults. Trigger: "cennad 설정", "open cennad settings", "개입 강도"'
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
description: "[cennad] Delegate to OpenAI Codex CLI via cennad. Use for heavy code generation/refactoring, sandboxed shell work, or independent second opinions from a different model family."
user_invocable: true
argument-hint: '[--continue <session_id>] [--tier high|mid|low] -- "prompt"'
---
```

### When to use / when not

- codex-call SKILL.md 의 "When to use / not" 단락을 압축 (vault 항목 제외).

### Body — 호출 매핑

- `--continue <session_id>` 있으면 → `mcp_tools_continue_conversation({ session_id, prompt })`.
- 그 외 → `mcp_tools_start_conversation({ provider: 'codex', prompt, tier? })`.
- 권한 플래그(`yolo`/`sandbox`/`sandbox_backend`)와 그 외 dispatcher 옵션은 `/setup` 설정 UI 로만 관리한다 (MCP input 미노출).
- 응답 JSON 의 `session_id` 를 출력에 노출 (백틱으로 감싸 인라인 코드).
- 실패 응답 (`status: 'failure'`):
  - `auth` → 사용자에게 `codex login` 실행 요청.
  - `rate_limit` / `budget_exhausted` → 잠시 후 재시도 또는 다른 provider 선택.
  - `network` / `cli_error` / `unknown` → 메시지 그대로 사용자에게 전달.

### Body — tier

| cennad tier | codex reasoning effort             |
| ----------- | ---------------------------------- |
| `high`      | `-c model_reasoning_effort=high`   |
| `mid`       | `-c model_reasoning_effort=medium` |
| `low`       | `-c model_reasoning_effort=low`    |

codex 는 단일 코딩 모델 + reasoning effort 구조라 tier 를 effort 로 매핑한다. 매핑은 `src/dispatcher/codex/operations/reasoningEffort.ts` 에서만 관리.

## skill: `antigravity`

Antigravity CLI(`agy`) 위임. Google 라우팅 전담 provider.

### Frontmatter

```yaml
---
name: antigravity
description: "[cennad] Delegate to the Antigravity CLI (agy) via cennad. Use for large-context synthesis, web-grounded research, or knowledge past the cutoff."
user_invocable: true
argument-hint: '[--continue <session_id>] [--tier high|mid|low] -- "prompt"'
---
```

### When to use / when not

- 대규모 컨텍스트 합성, 웹 기반 리서치, 지식 컷오프 이후 정보 조회.

### Body — 호출 매핑

- `--continue <session_id>` 있으면 → `mcp_tools_continue_conversation({ session_id, prompt })`.
- 그 외 → `mcp_tools_start_conversation({ provider: 'antigravity', prompt, tier? })`.
- 권한 플래그(`sandbox` / `skip_permissions`)는 `/setup` 설정 UI 로만 관리 (MCP input 미노출). sandbox-backend 없음.
- 응답 JSON 의 `session_id` 를 출력에 노출 (백틱으로 감싸 인라인 코드).
- `--continue` 재개 시 `externalSessionRef` 는 격리된 cwd 경로. agy 는 `--print` 모드에서 conversation id 를 노출하지 않아(Issue #7) cwd 격리로 세션을 식별.
- 실패 응답 (`status: 'failure'`):
  - `auth` → 사용자에게 `agy` 인증 확인 요청.
  - `cli_error` (Issue #76 empty-stdout) → transcript 폴백 실패 시 발생. agy 업데이트 또는 TTY 환경 권장 안내.
  - `rate_limit` / `budget_exhausted` → 잠시 후 재시도 또는 다른 provider 선택.
  - `network` / `unknown` → 메시지 그대로 사용자에게 전달.

### Body — tier

| cennad tier | agy 모델                                                  |
| ----------- | --------------------------------------------------------- |
| `high`      | config `model_map.antigravity.high` (미설정 시 `-m` 생략) |
| `mid`       | config `model_map.antigravity.mid` (미설정 시 `-m` 생략)  |
| `low`       | config `model_map.antigravity.low` (미설정 시 `-m` 생략)  |

모델 풀네임은 config `model_map.antigravity` 에서만 관리. env override 없음; 하드코딩 model 문자열 금지. 사용 가능한 모델 목록은 settings UI(`/setup`) 또는 내부 함수 `core/agyModels.getAvailableModels` 로 조회 (`agy models` 캐시, TTL 1시간).

## skill: `claude`

Anthropic Claude Code CLI 위임.

### Frontmatter

```yaml
---
name: claude
description: "[cennad] Delegate to the Anthropic Claude Code CLI via cennad. Use for reasoning, writing, analysis, and code review tasks where an independent Anthropic model opinion is valuable."
user_invocable: true
argument-hint: '[--continue <session_id>] [--tier high|mid|low] -- "prompt"'
---
```

### When to use / when not

- 추론, 글쓰기, 분석, 리뷰 작업에서 Anthropic 모델의 독립적 second opinion 이 필요할 때.
- secret 포함 프롬프트, 멀티턴 대화는 비추.

### Body — 호출 매핑

- `--continue <session_id>` 있으면 → `mcp_tools_continue_conversation({ session_id, prompt })`.
- 그 외 → `mcp_tools_start_conversation({ provider: 'claude', prompt, tier? })`.
- 권한 플래그(`permission_mode`)는 `/setup` 설정 UI 로만 관리 (MCP input 미노출). sandbox 플래그 없음; 격리는 permission-mode 로 처리.
- 응답 JSON 의 `session_id` 를 출력에 노출 (백틱으로 감싸 인라인 코드).
- `externalSessionRef` = 호출 시 주입한 `sessionId` (출력 파싱 불필요).
- 실패 응답 (`status: 'failure'`):
  - `auth` → 사용자에게 `claude` 인증 확인 요청.
  - `rate_limit` / `budget_exhausted` → 잠시 후 재시도 또는 다른 provider 선택.
  - `cli_error` / `network` / `unknown` → 메시지 그대로 사용자에게 전달.

### Body — permission_mode

| 값                  | 설명                         |
| ------------------- | ---------------------------- |
| `default`           | Claude Code 기본 동작        |
| `acceptEdits`       | 파일 편집 자동 수락 (기본값) |
| `auto`              | 도구 호출 자동 승인          |
| `dontAsk`           | 권한 요청 없이 진행          |
| `plan`              | 계획만 출력, 실행 안 함      |
| `bypassPermissions` | 모든 권한 우회               |

격리 플래그(`--strict-mcp-config`, `--safe-mode`)는 항상 첨부되어 부모 세션의 MCP 서버·hooks·CLAUDE.md·스킬을 상속하지 않는다.

### Body — tier

| cennad tier | 모델                                                | effort                                             |
| ----------- | --------------------------------------------------- | -------------------------------------------------- |
| `high`      | config `model_map.claude.high.model` (기본 `opus`)  | config `model_map.claude.high.effort` (기본 `max`) |
| `mid`       | config `model_map.claude.mid.model` (기본 `opus`)   | config `model_map.claude.mid.effort` (기본 `high`) |
| `low`       | config `model_map.claude.low.model` (기본 `sonnet`) | config `model_map.claude.low.effort` (기본 `high`) |

모델 aliases: `opus`, `sonnet`, `haiku`, `fable`, `best`, `opus[1m]`, `sonnet[1m]`. effort 스케일: `low` < `medium` < `high` < `xhigh` < `max`. 모델별 effort 상한: opus/fable/best/opus[1m] 전체 5단계; sonnet/sonnet[1m] xhigh 제외; haiku effort 미지원. env override: `CENNAD_CLAUDE_<TIER>_MODEL` / `CENNAD_CLAUDE_<TIER>_EFFORT`.

## skill: `crosscheck`

codex + antigravity 병렬 위임. 두 응답을 합성.

### Frontmatter

```yaml
---
name: crosscheck
description: '[cennad] Cross-validate a prompt by dispatching to codex AND antigravity in parallel, then synthesize the two answers. Trigger: "crosscheck", "cross check", "교차검증", "양쪽에 물어봐"'
user_invocable: true
argument-hint: '[--tier high|mid|low] -- "prompt"'
---
```

### When to use / when not

- 두 모델 패밀리의 독립적 second opinion 이 가치 있는 결정 / 설계 리뷰.
- 단일 provider 가 강점이 명확한 작업, 멀티턴, secret 포함 프롬프트는 비추.

### Body — 호출 매핑

- `--continue` 미지원 (항상 두 fresh 세션). 사용자가 전달하면 `/cennad:codex --continue <id>` 또는 `/cennad:antigravity --continue <id>` 로 안내.
- 두 호출을 **병렬** (단일 메시지 두 tool use):
  - `mcp_tools_start_conversation({ provider: 'codex', prompt, tier? })`
  - `mcp_tools_start_conversation({ provider: 'antigravity', prompt, tier? })`
- 부분 실패: 살아남은 응답 + 실패측 `error.code`/`message` 동시 노출. 양쪽 실패: 두 오류 노출 후 합성 skip.

### Body — 합성 포맷 (양쪽 성공)

4개 섹션 — `## Agreed` / `## Conflicting` / `## Final direction` / `## Action checklist`. `artifact_path` 가 있으면 `## Artifacts` 추가.

## 스킬 ↔ 도구 매트릭스

| Skill       | start_conversation               | continue_conversation | open_settings |
| ----------- | -------------------------------- | --------------------- | ------------- |
| setup       | —                                | —                     | O             |
| codex       | O (provider=codex)               | O                     | —             |
| antigravity | O (provider=antigravity)         | O                     | —             |
| claude      | O (provider=claude)              | O                     | —             |
| crosscheck  | O × 2 (codex + antigravity 병렬) | —                     | —             |

## 참고 자료 정책

- 검증된 `~/.claude/skills/codex-call/` 의 `reference/`, `methods/` 디렉토리 구조를 cennad 스킬은 재현하지 않는다. 스킬 책임은 도구 호출 매핑뿐.
- 외부 CLI 동작 자체에 대한 상세는 dispatcher INTENT.md 와 `provider-dispatch.md` 에 둔다 (코드 옆 문서).
