# YouTube MCP Addon

## Requirements

- 설정 저장 시 `@ogham/yt-dlp-mcp`를 선택된 사용자 CLI에 멱등 등록하거나 해제한다.
- Claude와 Codex는 `resolveUserMcpTarget` 및 shared MCP manager를 사용한다.
- Antigravity는 전용 global `mcp_config.json` adapter를 유지한다.
- `targets.claude`는 신규·기존 설정 모두 기본적으로 비활성화한다.
- 대상 CLI가 없거나 적용에 실패해도 설정 저장은 실패시키지 않는다.

## API Contracts

- `provisionYoutube(next, prev?)`는 `claude`, `codex`, `antigravity`별 결과를 반환한다.
- 사용자 CLI 적용 함수는 `codex | claude`, 활성 여부, 언어와 선택적 runner를 입력받는다.
- 활성 상태는 `addons.youtube.enabled && addons.youtube.targets[host]`이다.
- 활성 대상의 언어가 바뀌면 canonical 서버 정의를 다시 적용한다.
- Claude 설치는 `claude mcp ... --scope user`, Codex 설치는 `codex mcp ...`를 사용한다.

## Last Updated

2026-07-26
