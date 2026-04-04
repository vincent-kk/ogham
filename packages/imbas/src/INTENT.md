# src

## Purpose

imbas 플러그인 소스 코드 루트. 기획문서 검증→분할→개발 티켓화 파이프라인의 전체 구현.

## Structure

| Directory | Role |
|---|---|
| `types/` | Zod 스키마 및 타입 정의 |
| `core/` | 상태·설정·매니페스트·캐시 비즈니스 로직 |
| `ast/` | @ast-grep/napi 기반 코드 분석 |
| `mcp/` | MCP 서버 및 15+1 도구 핸들러 |
| `hooks/` | 5개 Claude Code lifecycle hook 구현체 |
| `lib/` | 공통 유틸리�� (logger, stdin, file-io) |

## Boundaries

### Always do

- 새 모듈 추가 시 types/index.ts 배럴에 타입 re-export 추가
- 파일 쓰기는 반드시 lib/file-io.ts의 atomic write 사용

### Ask first

- 새 디렉토리(fractal node) 추가
- 외부 의존성 추가

### Never do

- types/ 외부에서 Zod 스키마 직접 정의
- 전역 상태(global mutable state) 사용
