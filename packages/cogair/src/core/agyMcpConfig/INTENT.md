# agyMcpConfig — Antigravity MCP 설정 프로비저닝

## Purpose

agy 글로벌 `mcp_config.json`(`~/.gemini/antigravity-cli/`)에 youtube-transcript MCP 서버를 멱등 등록·해제한다. Antigravity는 Gemini CLI와 달리 YouTube 내장 조회가 없으나, agy는 헤드리스 `-p` 모드에서도 mcp_config.json의 서버를 스스로 호출하므로(agy 1.0.6 실측), 이 서버만 등록하면 dispatch 경로 변경 없이 YouTube 요약이 동작한다. `/setup` 토글 저장 시점에만 호출된다.

## Structure

| 파일                                | 역할                                                         |
| ----------------------------------- | ------------------------------------------------------------ |
| `operations/provisionYoutubeMcp.ts` | enabled→등록 / disabled→해제, 변경 시에만 atomicWrite        |
| `utils/readMcpConfig.ts`            | mcp_config.json 안전 read·정규화 (누락/손상 → 빈 레지스트리) |
| `constants/youtubeServer.ts`        | `youtube-transcript` 키 + npx 서버 정의                      |
| `index.ts`                          | barrel: `provisionYoutubeMcp`                                |

## Conventions

- 경로 기본값 `AGY_MCP_CONFIG_PATH`(constants/paths); 테스트는 `configPath` 인자로 주입
- 다른 서버·최상위 키 전부 보존; 기존 youtube-transcript 항목은 덮어쓰지 않음
- 변경 없으면 write 생략 (`action: 'unchanged'`)
- 모든 write 는 `atomicWrite`, 디렉토리 부재 시 `0o700` 생성

## Boundaries

### Always do

- read/write 실패를 throw 하지 않고 `{ ok: false }` + `logger.warn` 으로 degrade
- 사용자가 손수 넣은 youtube-transcript 정의 보존 (enable 시 미덮어쓰기)

### Ask first

- 등록 대상 npm 패키지·키 이름 변경
- 쓰기 대상 경로(추가 mcp_config.json) 확대

### Never do

- agy 세션·로그·대화 파일 수정 (mcp_config.json 외)
- mcpServers 외 키 임의 삭제·정규화

## Dependencies

- `node:fs/promises`, `node:path`
- `../../lib/atomicWrite`, `../../lib/logger`
- `../../constants/{paths,defaults}`, `../../utils/isFileNotFound`
