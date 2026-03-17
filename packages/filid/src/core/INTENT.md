# core — 핵심 비즈니스 로직

## Purpose

FCA-AI 핵심 알고리즘 구현. 20개 모듈: 프랙탈 트리 구축, 드리프트 감지, 규칙 평가, 커버리지 검증 등.

## Structure

| 카테고리 | 모듈 |
|----------|------|
| 트리/분류 | `fractal-tree`, `organ-classifier`, `boundary-detector` |
| 규칙/검증 | `rule-engine`(8규칙), `fractal-validator`, `document-validator`, `drift-detector` |
| 분석/그래프 | `project-analyzer`, `dependency-graph`, `lca-calculator` |
| 모듈 분석 | `index-analyzer`, `module-main-analyzer` |
| 인프라 | `cache-manager`, `project-hash`, `change-queue` |
| 커버리지 | `usage-tracker`, `test-coverage-checker`, `import-resolver` |
| 유틸리티 | `peer-file-registry`, `pr-summary-generator` |

## Conventions

- 외부 I/O: `fractal-tree`, `rule-engine`, `cache-manager`, `project-hash`, `import-resolver`, `usage-tracker`, `test-coverage-checker`에만 허용
- 나머지 모듈은 순수 함수 지향 (입력 → 출력, 사이드 이펙트 없음)

## Boundaries

### Always do

- 새 규칙 추가 시 `rule-engine.ts`의 `loadBuiltinRules`에 등록
- 공개 함수는 `src/index.ts`에 re-export

### Ask first

- 내장 규칙 임계값 변경 (LCOM4 ≥ 2, CC > 15, 500줄)
- `classifyNode` 우선순위 로직 변경

### Never do

- `mcp/`, `hooks/`, `ast/` 모듈 직접 import (역방향 금지)
- `ORGAN_DIR_NAMES` 이름 기반 분류를 신규 코드에 사용

**Dependencies**: `../types/`, `../ast/`, `fast-glob`
