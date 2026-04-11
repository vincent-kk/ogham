# module -- 모듈 진입점 및 배럴 분석

## Purpose

각 fractal 노드의 진입점(index.ts / main.ts)을 탐색하고, `index.ts` 배럴 패턴을 검증하며, 모듈의 public API(exports, types, functions, classes)와 import 의존성을 추출한다. `rule-engine`의 `index-barrel-pattern` 및 `module-entry-point` 규칙이 이 결과를 소비한다.

## Structure

| 모듈 | 역할 |
|------|------|
| `index-analyzer` | 정규식 기반 export 구문 추출. barrel 순수성(직접 선언 0개) 판정 |
| `module-main-analyzer` | 진입점 파일 탐색, import 파싱, `extractPublicApi`, 최종 `ModuleInfo` 조립 |

## Conventions

- AST 파서 사용 금지 — 정규식 기반 추출만 허용 (속도·의존성 최소화)
- 진입점 후보는 `constants/entry-candidates.ts`의 `ENTRY_CANDIDATES` 순서로 탐색
- 외부 패키지 import는 `imports`에만 포함하고 `dependencies`에는 누락 (상대 경로만 dependency)
- 파일/디렉토리 읽기 실패 시 빈 배열/`null` 반환 — 예외로 던지지 않음

## Boundaries

### Always do

- export 분류(type/named/default/re-export) 로직 변경 시 `ModuleExportInfo` 유니온과 동기화
- 진입점 탐색 순서 변경 시 `ENTRY_CANDIDATES` 상수만 수정

### Ask first

- 정규식 기반 추출을 AST 파서(`@ast-grep/napi`)로 교체
- 진입점 폴백 규칙(단일 .ts 파일) 제거

### Never do

- `mcp/`, `hooks/`, `ast/` 모듈 역방향 import
- 파일 내용 직접 수정 (읽기 전용 분석)

## Dependencies

- `../../types/fractal.js` (`ModuleInfo`, `PublicApi`, `BarrelPattern`, `ModuleExportInfo`)
- `../../constants/entry-candidates.js` (후보 파일 목록 + import 정규식)
