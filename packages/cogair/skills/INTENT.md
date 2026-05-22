## Purpose

cogair 플러그인의 Claude Code 스킬 정의. 각 하위 디렉토리는 하나의
user-invokable 스킬이며, 런타임에 `.claude-plugin/plugin.json` 을 통해
Claude Code 가 자동 디스커버리한다. 빌드 단계 없음, TypeScript export 없음.

## Structure

| Path                  | Role                                        |
| --------------------- | ------------------------------------------- |
| `codex/SKILL.md`      | `/codex` 위임 스킬 (OpenAI Codex CLI)       |
| `gemini/SKILL.md`     | `/gemini` 위임 스킬 (Google Gemini CLI)     |
| `setup/SKILL.md`      | `/setup` 최초 설정 워크스루                 |
| `crosscheck/SKILL.md` | `/crosscheck` codex+gemini 병렬 위임 + 합성 |

## Conventions

- SKILL.md frontmatter 는 Claude Code 스킬 스키마를 따른다.
- 스킬 이름은 디렉토리 이름과 일치한다 (플러그인 prefix 없음).
- 스킬은 `mcp_tools_<name>` 형태로 MCP 도구를 호출한다 — MCP 레이어를
  우회하지 않는다.
- SKILL.md 본문은 영어로 작성한다 (LLM-실행 컨텍스트 일관성).

## Boundaries

### Always do

- SKILL.md 본문은 영어로 유지하고 MCP 도구는 등록된 이름으로 참조한다.

### Ask first

- 새 스킬 추가 (plugin.json 디스커버리 검증 + 필요 시 MCP 도구 와이어링).

### Never do

- 스킬 산문에 구체 모델 ID 를 박지 않는다 (dispatcher modelAlias 단일 소스).
- 스킬 본문에서 MCP 레이어를 우회해 외부 CLI 를 직접 호출하지 않는다.

## Dependencies

- 런타임 계약: `.claude-plugin/plugin.json`, `.mcp.json` (MCP 서버명 `tools`).
