# @ogham/cogair — Spec Index

Claude Code 플러그인. Gemini CLI / Codex CLI 를 Claude가 자율 위임 형태로 호출하도록 하는 MCP·Skill·Hook 패키지.

- 설계 원본: [vincent-kk/ogham#48](https://github.com/vincent-kk/ogham/issues/48)
- 구현 위치: `packages/cogair/`
- 빌드/디렉토리/훅 패턴: `packages/filid/` 와 동일
- `open_settings` web UI 패턴: `packages/atlassian/src/mcp/tools/setup/`
- 외부 CLI 인터페이스: 검증된 `~/.claude/skills/{codex-call,gemini-call}` 의 envelope / exit code / session 매핑

## 핵심 결정

- 패키지명: `@ogham/cogair` · 플러그인 이름: `cogair`
- MCP 서버 이름: `tools` (atlassian 동일 컨벤션)
- Agent 없음. 스킬 4개: `setup`, `codex`, `gemini`, `crosscheck` (플러그인 prefix 미사용)
- Hook 은 빌드 산출물(`bridge/*.mjs`) + `libs/run.cjs` 러너 — filid 동일
- 라우팅 판단은 Claude. MCP 는 디스패치만.

## 문서

| 파일                                           | 내용                                                           |
| ---------------------------------------------- | -------------------------------------------------------------- |
| [spec.md](./spec.md)                           | 책임 분리, 데이터 흐름, 비채택 사항                            |
| [architecture.md](./architecture.md)           | 모듈 트리 + 의존 방향 + 빌드 파이프라인                        |
| [mcp-tools.md](./mcp-tools.md)                 | `start_conversation`, `continue_conversation`, `open_settings` |
| [storage.md](./storage.md)                     | `~/.claude/plugins/cogair/` 디스크 레이아웃 + JSON 스키마      |
| [hooks.md](./hooks.md)                         | SessionStart / UserPromptSubmit 훅 (filid 패턴)                |
| [skills.md](./skills.md)                       | `setup`, `codex`, `gemini`, `crosscheck` 스킬                  |
| [web-ui.md](./web-ui.md)                       | 로컬 설정 웹 UI                                                |
| [provider-dispatch.md](./provider-dispatch.md) | codex-cli / gemini-cli 호출 매핑                               |
| [roadmap.md](./roadmap.md)                     | 단계별 구현 순서                                               |
