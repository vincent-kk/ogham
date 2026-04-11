# module-main-analyzer -- 진입점 탐색과 모듈 정보 조립

## Purpose

모듈 디렉토리의 진입점 파일을 탐색하고, import 경로를 추출하며, 공개 API(types/functions/classes)를 분류해 최종 `ModuleInfo`를 반환한다. `project-analyzer`가 전체 프로젝트를 병렬 분석할 때 노드당 이 함수를 호출한다.

## Structure

- `module-main-analyzer.ts` — `findEntryPoint`, `extractImports`, `extractPublicApi`, `analyzeModule`

## Conventions

- 진입점 탐색 순서: `ENTRY_CANDIDATES` → (없으면) 디렉토리 내 유일한 `.ts` 파일 → null
- import 추출은 정규식(`RE_IMPORT`, `RE_DYNAMIC_IMPORT`, `RE_REQUIRE`)만 사용
- 상대 경로 import만 `dependencies`에 포함 (절대 해석), 외부 패키지는 `imports`에만 남김
- 파일/디렉토리 실패 시 빈 `ModuleInfo`(entryPoint null) 반환 — 예외 전파 금지
- named export 추가 분류(`RE_FUNC_EXPORT` 등)는 이 파일 내 전용 정규식으로만 처리

## Boundaries

### Always do

- `index-analyzer.extractModuleExports`를 재사용해 기본 export 정보 확보
- `findEntryPoint` 호출 결과가 null이면 analysis를 short-circuit

### Ask first

- 진입점 후보 순서 변경 (`constants/entry-candidates.ts`)
- import 해석 방식을 `resolveImportPath` 기반으로 교체

### Never do

- AST 파서 도입 (정규식 유지)
- 외부 패키지 의존성을 `dependencies` 배열에 섞기

## Dependencies

- `../index-analyzer/` (`extractModuleExports`)
- `node:fs/promises`, `node:path`
- `../../../types/fractal.js` (`ModuleInfo`, `PublicApi`, `ModuleExportInfo`)
- `../../../constants/entry-candidates.js` (`ENTRY_CANDIDATES`, `RE_IMPORT`, `RE_DYNAMIC_IMPORT`, `RE_REQUIRE`)
