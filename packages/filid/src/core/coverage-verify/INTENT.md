# coverage-verify -- 서브트리 테스트 커버리지 검증 파이프라인

## Purpose

공유 모듈의 프랙탈 서브트리 사용처를 추적(`usage-tracker`)하고,
각 사용처의 대표 테스트 파일 존재 여부를 검증(`test-coverage-checker`)한다.
import 경로 해석(`import-resolver`)은 추적 단계의 내부 의존성이다.

## Structure

| 서브모듈 | 역할 |
|---|---|
| `usage-tracker` | `FractalTree` 순회로 타겟 모듈을 import하는 peer 파일 수집 → `UsageSite[]` |
| `test-coverage-checker` | 3-Strategy(co-located / mirror / integration)로 테스트 파일 탐지 → `UsageCoverage[]` + 경고 |
| `import-resolver` | 상대 경로·ESM `.js↔.ts`·index 해석 (내부 전용) |

실행 순서: `findSubtreeUsages` → `checkTestCoverage` → `generateCoverageWarnings`.

## Boundaries

### Always do
- 추적 결과는 `UsageSite`, 커버리지 결과는 `UsageCoverage` 타입으로 반환
- 타입-only import는 사용처에서 제외 (런타임 테스트 불필요)
- AST 파싱/파일 읽기 실패는 silent skip, 예외 전파 금지

### Ask first
- 테스트 발견 전략(co-located/mirror/integration) 추가·변경·우선순위 조정
- `SKIP_PATTERNS` 외의 파일 필터 규칙 추가
- 테스트 파일 존재 외에 커버리지 수치(lines/branches) 반영

### Never do
- 테스트 파일 직접 실행
- `import-resolver` 외부 노출 (서브모듈 내부에서만 사용)
- node_modules 패키지·tsconfig paths·barrel re-export 해석 시도 (v1 scope 이탈)

## Dependencies
- `../tree/fractal-tree/` — `scanProject`, `getDescendants`, `getFractalsUnderOrgans`
- `../../ast/dependency-extractor/` — `extractDependencies`
- `../../metrics/test-counter/` — `countTestCases`
- `../../constants/scan-defaults.js` — `SKIP_PATTERNS`
- `../../types/coverage.js` — `UsageSite`, `UsageCoverage`
- `../../types/fractal.js` — `FractalTree`
