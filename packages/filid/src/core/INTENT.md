# core — 핵심 비즈니스 로직

## Purpose

FCA-AI 핵심 알고리즘 구현. 트리 구축, 규칙 평가, 드리프트 감지, 의존성 분석, 커버리지 검증, PR 요약 생성을 7개 sub-fractal로 분리하여 제공한다.

## Structure

| sub-fractal | 포함 모듈 |
|---|---|
| `tree/` | `fractal-tree`, `organ-classifier`, `boundary-detector` |
| `rules/` | `rule-engine` (8 규칙), `fractal-validator`, `document-validator`, `drift-detector` |
| `analysis/` | `project-analyzer`, `dependency-graph`, `lca-calculator` |
| `module/` | `index-analyzer`, `module-main-analyzer` |
| `infra/` | `cache-manager`, `project-hash`, `change-queue`, `config-loader` |
| `coverage-verify/` | `usage-tracker`, `test-coverage-checker`, `import-resolver` |
| `pr-summary/` | PR 요약 parsers/aggregators/renderers |

## Conventions

- 외부 I/O 허용: `fractal-tree`, `rule-engine`, `cache-manager`, `project-hash`, `config-loader`, `import-resolver`, `usage-tracker`, `test-coverage-checker`
- 그 외 모듈은 순수 함수 지향 (입력 → 출력, 사이드 이펙트 없음)
- sub-fractal 간 직접 import 금지: `core/index.ts` 배럴 경유

## Boundaries

### Always do

- 새 규칙 추가 시 `rules/rule-engine/rule-engine.ts`의 `loadBuiltinRules`에 등록
- 공개 함수는 `core/index.ts`와 `src/index.ts`에 모두 re-export

### Ask first

- 내장 규칙 임계값 변경 (LCOM4 ≥ 2, CC > 15, 500줄)
- `classifyNode` 우선순위 로직 변경

### Never do

- `mcp/`, `hooks/`, `ast/`, `metrics/`, `compress/` 모듈 역방향 import
- `KNOWN_ORGAN_DIR_NAMES` 이름 기반 분류를 신규 코드 기본 전략으로 사용

## Dependencies

- `../types/`, `../ast/`, `../constants/`, `fast-glob`
