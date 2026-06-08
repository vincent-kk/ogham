# youtubeMcp — YouTube MCP addon 프로비저닝

## Purpose

`@ogham/yt-dlp-mcp`(youtube-transcript) MCP 서버를 LLM과 분리된 독립 addon으로, 대상 CLI(antigravity·codex)에 멱등 등록·해제한다. antigravity는 글로벌 `mcp_config.json`에, codex는 `codex mcp add|remove`로 `config.toml`에 기록한다(codex가 TOML 소유, 직접 편집 안 함). 두 CLI 모두 헤드리스 모드에서 서버를 스스로 호출하므로 dispatch 경로 변경은 없다. `language`(en/ko)는 서버 env `YTDLP_LANG`로 전달. gemini는 내장 YouTube + fade-out으로 제외. `/setup` 저장 시점에만 호출.

## Structure

| 파일                                 | 역할                                                         |
| ------------------------------------ | ------------------------------------------------------------ |
| `operations/provisionYoutube.ts`     | orchestrator: addon config(next/prev) → antigravity + codex  |
| `operations/provisionAntigravity.ts` | mcp_config.json 멱등 write (command/args/env, 변경 시만)     |
| `operations/provisionCodex.ts`       | `codex mcp add\|remove` (runner 주입 가능, never throw)      |
| `operations/provisionResult.ts`      | `ProvisionResult` / `ProvisionAction` 타입                   |
| `utils/resolveCodexAction.ts`        | codex add/remove/skip 결정 (불필요한 spawn 회피, pure)       |
| `utils/readMcpConfig.ts`             | mcp_config.json 안전 read·정규화 (누락/손상 → 빈 레지스트리) |
| `constants/youtubeServer.ts`         | key + npx command/args + `youtubeMcpEnv(language)`           |

## Conventions

- 효과적 대상 활성 = `enabled && targets.<cli>`; 언어 변경 시 enabled 대상에 재적용
- antigravity 경로 기본값 `AGY_MCP_CONFIG_PATH`(constants/paths); 테스트는 인자 주입
- 다른 서버·최상위 키 전부 보존; 변경 없으면 write/spawn 생략
- 모든 file write 는 `atomicWrite`, 디렉토리 부재 시 `0o700` 생성

## Boundaries

### Always do

- read/write/spawn 실패를 throw 하지 않고 `{ ok: false }` 로 degrade
- codex 미설치(ENOENT)는 조용히 degrade (warn 없음); 그 외 실패만 `logger.warn`
- enabled 동안 youtube-transcript 항목은 cogair 가 소유(canonical 정의로 덮어씀)

### Ask first

- 등록 대상 npm 패키지·키 이름 변경
- 새 대상 CLI 추가 또는 쓰기 대상 경로 확대

### Never do

- CLI 세션·로그·대화 파일 수정 (mcp_config.json / `codex mcp` 외)
- codex `config.toml` 직접 편집 (반드시 `codex mcp` 서브커맨드 경유)
- mcpServers 외 키 임의 삭제·정규화

## Dependencies

- `node:fs/promises`, `node:path`, `@ogham/cross-platform` (spawnCli)
- `../../lib/{atomicWrite,logger}`, `../../constants/{paths,defaults}`
- `../../types` (`YoutubeAddonConfig`, `YoutubeAddonLanguage`), `../../utils/isFileNotFound`
