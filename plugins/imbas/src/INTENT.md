# src

## Purpose

imbas 플러그인 소스 코드 루트. 기획문서 검증→분할→개발 티켓화 파이프라인의 전체 구현.

## Structure

| Directory    | Role                                                             |
| ------------ | ---------------------------------------------------------------- |
| `constants/` | 파일명·경로·파이프라인·에이전트 상수                             |
| `utils/`     | 순수 유틸리티 함수 (collections, objects)                        |
| `types/`     | Zod 스키마 및 타입 정의                                          |
| `core/`      | 상태·설정·매니페스트·캐시 비즈니스 로직                          |
| `ast/`       | @ast-grep/napi 기반 코드 분석                                    |
| `mcp/`       | MCP 서버 및 17개 도구 핸들러 (ping 포함) + 설정 페이지 정적 자산 |
| `hooks/`     | 4개 Claude Code lifecycle hook 구현체                            |
| `lib/`       | 공통 유틸리티 (logger, stdin, fileIo)                            |
| `providers/` | 이슈 트래커 프로바이더 파싱 로직 (github 등)                     |

## Conventions

- 설정은 user·project 두 계층이다 — `core/configManager` 의 `loadConfig` 가 병합된 유효 설정을, `loadConfigByScope`·`loadConfigScope` 가 계층별 값과 재정의 상태를 준다.
- 계층에 쓰는 표면(`config_set` 도구, 설정 페이지 `/save`)은 `scope` 를 필수로 받는다. 기본값을 두면 프로젝트 결정이 사용자 파일에 들어가거나 그 반대가 된다.
- 설정 페이지 상태(`types/settings.ts`)는 단일 `config` 가 아니라 `configByScope` 와 계층 문서·재정의 경로를 담은 `scope` 를 싣는다.

## Boundaries

### Always do

- 새 모듈 추가 시 types/index.ts 배럴에 타입 re-export 추가
- 파일 쓰기는 반드시 lib/fileIo.ts의 atomic write 사용

### Ask first

- 새 디렉토리(fractal node) 추가
- 외부 의존성 추가

### Never do

- types/ 외부에서 Zod 스키마 직접 정의
- 전역 상태(global mutable state) 사용
- 계층 경로 해석·병합 규칙 재구현 — `@ogham/cross-platform` 가 소유

## Dependencies

- `@ogham/cross-platform` — 호스트 좌표(`host-paths`)·계층 설정(`config-scope`)·`error-log`·`launcher`
- `@modelcontextprotocol/sdk` · `zod` — MCP 서버와 스키마
- `@ast-grep/napi` — `ast/` 코드 분석
