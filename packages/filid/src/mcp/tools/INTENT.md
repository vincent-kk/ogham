# tools -- MCP 도구 핸들러

## Purpose

18개 FCA-AI MCP 도구의 비즈니스 로직 핸들러를 모은 fractal. 각 도구는 독립 sub-fractal로 구현되며 `mcp/server/server.ts`에서 등록되어 MCP 프로토콜을 통해 호출된다.

## Structure

- 18개 sub-fractal: `ast-analyze`, `ast-grep-search`, `ast-grep-replace`, `cache-manage`, `config-patch-validate`, `coverage-verify`, `debt-manage`, `doc-compress`, `drift-detect`, `fractal-navigate`, `fractal-scan`, `lca-resolve`, `project-init`, `review-manage`, `rule-docs-sync`, `rule-query`, `structure-validate`, `test-metrics`
- `utils/` organ: 도구 간 공유되는 파일 시스템 가드(`fs-guard`) 등
- 각 sub-fractal은 `handle*` 함수 하나를 주요 runtime export로 둔다

## Conventions

- 도구 응답: `toolResult()` / `toolError()` 래퍼 사용
- Zod 스키마로 모든 입력 검증
- I/O 경계는 `utils/fs-guard.ts`에서 공통화

## Boundaries

### Always do

- 새 도구 추가 시 sub-fractal + `INTENT.md` + barrel 생성
- `handle*` 네이밍으로 runtime export 유지

### Ask first

- 기존 도구 입력 스키마 변경 (클라이언트 호환성 영향)
- 새 `utils/` organ 파일 추가

### Never do

- 도구 sub-fractal 간 직접 import (공통 로직은 `../../core/`로 이동)
- 응답을 raw 객체로 반환 (래퍼 필수)

## Dependencies

- `../../core/`, `../../ast/`, `../../metrics/`, `../../compress/`, `../../types/`
