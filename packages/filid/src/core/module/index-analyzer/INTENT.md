# index-analyzer -- index.ts 배럴 패턴 분석

## Purpose

`index.ts` 파일 내용에서 export 구문을 정규식으로 추출하고, 모든 export가 re-export이며 직접 선언이 0개인지로 순수 배럴 여부(`isPureBarrel`)를 판정한다. `index-barrel-pattern` 규칙의 판정 데이터 소스.

## Structure

- `index-analyzer.ts` — `extractModuleExports`, `analyzeIndex`

## Conventions

- 추출 대상: `type re-export` / `named re-export` / `star re-export` / `named declaration` / `default export` / `type declaration`
- 순서가 중요: type re-export를 먼저 매치해 named re-export 정규식과 겹치는 문제를 피함
- named re-export 처리 시 `^export\s+type\s+\{`로 시작하면 스킵 (이미 type에서 처리)
- `as` 별칭은 꺾쇠 뒤 이름만 최종 이름으로 채택 (`X as Y` → `Y`)
- AST 파서 사용 금지 — `content.matchAll`만 사용

## Boundaries

### Always do

- 새 export 형태 지원 시 `ModuleExportInfo['kind']` 유니온과 동시 확장
- `isPureBarrel` 정의 유지: `declarationCount === 0 && reExportCount > 0`

### Ask first

- 정규식 기반 추출을 `@ast-grep/napi` AST 매칭으로 교체
- barrel 순수성 기준 완화 (타입 선언 허용 등)

### Never do

- 파일 I/O 수행 (인자는 항상 string content)
- `module-main-analyzer` 외부에서 직접 호출 시 import 그래프 형성

## Dependencies

- `../../../types/fractal.js` (`BarrelPattern`, `ModuleExportInfo`)
