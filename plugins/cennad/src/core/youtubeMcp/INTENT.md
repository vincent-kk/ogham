## Purpose

`@ogham/yt-dlp-mcp`(키 `yt-dlp-mcp`) MCP 서버를 LLM과 분리된 독립
addon으로 대상 CLI(claude·codex·antigravity)에 멱등 등록·해제한다.
claude·codex는 목적별 사용자 MCP target과 manager를 사용하고, antigravity는
글로벌 `mcp_config.json`을 관리한다. 공통 `language`
(en/ko)는 서버 env `YTDLP_LANG`로 전달하며 `/setup` 저장 시점에만 실행한다.

## Structure

| 경로                             | 역할                                               |
| -------------------------------- | -------------------------------------------------- |
| `operations/`                    | 세 대상 orchestration·적용·결과 매핑               |
| `operations/provisionUserMcp.ts` | Claude·Codex 사용자 MCP manager와 Cennad 정책 연결 |
| `utils/`, `constants/`           | 상태 결정·Antigravity JSON read·서버 정식 정의     |

## Conventions

- 효과적 대상 활성 = `enabled && targets.<cli>`; 언어 변경 시 enabled 대상에 재적용
- antigravity 경로 기본값 `AGY_MCP_CONFIG_PATH`(constants/paths); 테스트는 인자 주입
- 다른 서버·최상위 키 전부 보존; 변경 없으면 write/spawn 생략
- 모든 file write 는 `atomicWrite`, 디렉토리 부재 시 `0o700` 생성
- claude·codex argv는 agent-artifacts 계약을 사용하고 테스트 runner로 정확히 검증

## Boundaries

### Always do

- read/write/spawn 실패를 throw 하지 않고 `{ ok: false }` 로 degrade
- 사용자 CLI ENOENT는 경고 없이 `{ ok: false, action: 'unchanged' }`; 그 외 실패만 warn
- enabled 동안 yt-dlp-mcp 항목은 cennad 가 소유(canonical 정의로 덮어씀)

### Ask first

- 등록 대상 npm 패키지·키 이름 변경
- 새 대상 CLI 추가 또는 쓰기 대상 경로 확대

### Never do

- CLI 세션·로그·대화 파일 수정 (mcp_config.json / 사용자 CLI `mcp` 명령 외)
- codex·claude 사용자 MCP 파일 직접 편집 (반드시 각 CLI `mcp` 서브커맨드 경유)
- mcpServers 외 키 임의 삭제·정규화

## Dependencies

- `node:fs/promises`, `node:path`, `@ogham/agent-artifacts`
- `../../lib`, `../../constants`, `../../types`, `../../utils/isFileNotFound`
