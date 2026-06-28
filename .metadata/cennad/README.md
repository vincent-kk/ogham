# @ogham/cennad — Spec Index

Claude Code 플러그인. Codex CLI / Antigravity CLI(`agy`) / Claude CLI 를 Claude가 자율 위임 형태로 호출하도록 하는 MCP·Skill·Hook 패키지.

- 설계 원본: [vincent-kk/ogham#48](https://github.com/vincent-kk/ogham/issues/48)
- 구현 위치: `packages/cennad/`
- 빌드/디렉토리/훅 패턴: `packages/filid/` 와 동일
- `open_settings` web UI 패턴: `packages/atlassian/src/mcp/tools/setup/`
- 외부 CLI 인터페이스: 검증된 `~/.claude/skills/codex-call` 의 envelope / exit code / session 매핑

## 핵심 결정

- 패키지명: `@ogham/cennad` · 플러그인 이름: `cennad`
- MCP 서버 이름: `tools` (atlassian 동일 컨벤션)
- Agent 없음. 스킬 5개: `setup`, `codex`, `antigravity`, `claude`, `crosscheck` (플러그인 prefix 미사용)
- Hook 은 빌드 산출물(`bridge/*.mjs`) + `libs/run.cjs` 러너 — filid 동일
- 라우팅 판단은 Claude. MCP 는 디스패치만.

## 문서

| 파일                                             | 내용                                                                                                                                   |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| [spec.md](./spec.md)                             | 책임 분리, 데이터 흐름, 비채택 사항                                                                                                    |
| [architecture.md](./architecture.md)             | 모듈 트리 + 의존 방향 + 빌드 파이프라인                                                                                                |
| [mcp-tools.md](./mcp-tools.md)                   | `start_conversation`, `continue_conversation`, `open_settings` (3개)                                                                   |
| [storage.md](./storage.md)                       | `${CLAUDE_PLUGIN_DATA}/` 디스크 레이아웃 + JSON 스키마                                                                                 |
| [hooks.md](./hooks.md)                           | SessionStart / UserPromptSubmit 훅 (filid 패턴)                                                                                        |
| [skills.md](./skills.md)                         | `setup`, `codex`, `antigravity`, `claude`, `crosscheck` 스킬                                                                           |
| [web-ui.md](./web-ui.md)                         | 로컬 설정 웹 UI (codex / antigravity / Anthropic 3-lane, per-provider 토글·슬라이더, claude permission-mode·모델·effort 드롭다운 포함) |
| [provider-dispatch.md](./provider-dispatch.md)   | codex-cli / claude-cli / agy (Antigravity CLI) 호출 매핑                                                                               |
| [agy-upstream-watch.md](./agy-upstream-watch.md) | agy 업스트림 결함(#76, #7) 추적 — 워크어라운드 해제 조건 + 검증 로그 + 재검증 절차                                                     |
| [roadmap.md](./roadmap.md)                       | 단계별 구현 순서                                                                                                                       |
