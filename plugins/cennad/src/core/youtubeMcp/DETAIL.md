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

## Acceptance Criteria

### AC-idempotent-provisioning — 멱등 등록

- 이미 등록된 대상에 다시 등록해도 중복 항목이 생기지 않는다.
- 해제 후 재등록이 처음 등록과 같은 결과를 낸다.

### AC-target-isolation — 대상별 격리

- claude·codex 는 목적별 사용자 MCP target 과 manager 를 쓰고, antigravity 는 글로벌 `mcp_config.json` 을 관리한다.
- 체크되지 않은 대상 CLI 의 설정은 건드리지 않는다.

### AC-language-passthrough — 언어 전달

- 공통 `language`(en/ko)가 서버 env `YTDLP_LANG` 로 전달된다.
- 등록·해제는 `/setup` 저장 시점에만 실행된다.

## Last Updated

2026-07-30 — 기존 계약을 acceptance group 으로 명시했다(내용 변경 없음).
