# src — filid 소스 루트

## Purpose

`@ogham/filid`의 소스 루트. FCA-AI 규칙 강제를 위한 core, MCP 서버, AST 분석, 메트릭, 압축, 훅 구현을 모은 패키지 진입 모듈이다.

## Structure

| 경로 | 역할 |
|------|------|
| `index.ts` | 공개 API 엔트리포인트 (함수/상수 + 타입 re-export) |
| `version.ts` | 자동 생성 버전 상수 (직접 수정 금지) |
| `core/` | 7개 sub-fractal: tree/rules/analysis/module/infra/coverage-verify/pr-summary |
| `ast/` | `@ast-grep/napi` 기반 AST 분석 (LCOM4, CC, 의존성) |
| `mcp/` | MCP 서버 + 17개 도구 핸들러 |
| `hooks/` | Claude Code 훅 구현체 |
| `metrics/` | 테스트 밀도 · 모듈 분리 결정 메트릭 |
| `compress/` | 컨텍스트 압축 (가역/손실) |
| `constants/` | 공유 상수 organ (임계값·이름 패턴·기본값) |
| `types/` | 공유 TypeScript 타입 organ |
| `lib/` | 런타임 유틸 organ (`logger`, `stdin`) |

## Conventions

- ESM (`"type": "module"`), import 확장자 `.js`
- 공개 API는 `index.ts`에서 re-export
- `version.ts`는 `yarn version:sync`로만 갱신

## Boundaries

### Always do

- 새 모듈 추가 시 `index.ts`에 export 추가
- `core/` 변경 후 관련 `__tests__/unit/core/` 테스트 갱신

### Ask first

- 새 하위 디렉토리 추가 (아키텍처 결정 필요)
- 공개 API 제거·시그니처 변경 (breaking change)

### Never do

- `version.ts` 직접 수정
- `types/`·`constants/`에 비즈니스 로직 추가
- 순환 의존성 도입 (core ↔ mcp ↔ hooks)

## Dependencies

- Node.js `>=20`, TypeScript 5.7, `@modelcontextprotocol/sdk`, `zod`, `fast-glob`
