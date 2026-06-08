## Purpose

yt-dlp 바이너리를 안전하게 획득·실행하여 자막·트랜스크립트·메타데이터·댓글·썸네일·다운로드를 MCP 도구로 노출하는 서버.

## Structure

| 파일/디렉터리                 | 역할                                                                 |
| ----------------------------- | -------------------------------------------------------------------- |
| `index.ts`                    | 런타임 결선 진입점(`main`)·stdio 연결·종료 처리                      |
| `version.ts`                  | 서버 버전·이름 단일 출처(`VERSION`/`SERVER_NAME`)                    |
| `config/`                     | 환경변수 → 검증된 `Config`                                           |
| `paths/`                      | `~/.yt-dlp` 경로 트리 해석·생성                                      |
| `ytdlp/`                      | 바이너리 획득·실행·도메인 연산                                       |
| `mcp/`                        | 도구 정의·레지스트리·서버                                            |
| `features/`                   | 기능별 수직 슬라이스(현재 `subtitle/`)                               |
| `core/` (organ)               | 캐시·요청 페이싱(throttle)·동시성 결합 실행 Service(`createService`) |
| `domain/` (organ)             | 도메인 타입·에러 분류                                                |
| `postprocess/` (organ)        | 자막/텍스트 후처리                                                   |
| `cache/` `obs/` (organ)       | TtlLruCache·pino 로거                                                |
| `constants/` `utils/` (organ) | 상수·coerce 헬퍼                                                     |

## Conventions

- 모든 모듈 인스턴스화는 `createX(deps)` 팩토리로 의존성을 주입받으며, 결선은 오직 `index.ts`의 `main()`에서만 수행한다.
- 서버 버전·이름은 `version.ts` 한 곳에서만 읽고, 다른 모듈은 이를 import해 재선언하지 않는다.
- 부팅 순서는 config → logger → paths → versionResolver → binaryManager → runner → service → server를 따르며 paths는 `ensureBaseDirs()`로 선행 보장한다.
- 전송은 `StdioServerTransport` 한 종류만 쓰고 SIGINT/SIGTERM에서 `server.close()`로 정상 종료한다.

## Boundaries

### Always do

- 실패는 타입이 있는 `YtDlpMcpError`로 표면화한다
- 신뢰 경계에서 yt-dlp 출력은 coerce 후 사용한다

### Ask first

- 새 MCP 도구나 최상위 모듈 추가
- 바이너리 획득·검증 정책 변경

### Never do

- 무음 `|| ''` fallback으로 에러를 숨긴다
- 체크섬 검증 없이 바이너리를 설치한다

## Dependencies

- 내부: `config`, `paths`, `core/service`, `mcp/registry`, `mcp/server`, `obs/logger`, `ytdlp/binary`, `ytdlp/runner`, `version`
- 외부: `@modelcontextprotocol/sdk`(stdio transport)
