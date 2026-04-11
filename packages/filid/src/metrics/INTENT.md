# metrics -- FCA-AI 품질 메트릭

## Purpose

FCA-AI 품질 규칙을 숫자 지표와 처방으로 연결하는 fractal. 테스트 케이스 카운팅 → 3+12 규칙 검증 → (위반 시) 모듈 분리 결정 트리 → test.ts 승격 적격성의 순수 계산 파이프라인을 제공한다.

## Structure

| 모듈 | 역할 |
|------|------|
| `test-counter` | `test.ts`/`spec.ts` 파일에서 `it`/`test` 호출을 basic/complex로 분류 |
| `three-plus-twelve` | `spec.ts` 총 케이스 > 15면 위반. `test.ts`는 면제 |
| `decision-tree` | 위반 시 `ok`/`split`/`compress`/`parameterize` 처방 결정 |
| `promotion-tracker` | 장기간 안정된 `test.ts`의 `spec.ts` 승격 적격성 판정 |

## Conventions

- 모든 함수는 순수 — 파일 I/O·Date 호출 금지 (호출자가 주입)
- 임계값은 `constants/quality-thresholds.ts`의 `THREE_PLUS_TWELVE_THRESHOLD`, `LCOM4_SPLIT_THRESHOLD`, `CC_THRESHOLD`, `DEFAULT_STABILITY_DAYS`에서만 import
- 모듈 간 직접 의존 금지 — 파이프라인은 상위 orchestrator(예: `mcp/tools/test-metrics`)가 조립
- 반환 객체에는 입력 값을 에코(`metrics`/`stableDays` 등)해 UI·로그 재활용

## Boundaries

### Always do

- 새 메트릭 추가 시 `src/index.ts` 재수출 + `types/metrics.ts` 확장
- 임계값 비교는 주석으로 연산자(`>` vs `>=`)와 이유를 명시

### Ask first

- 임계값 기본값 변경 (LCOM4 ≥ 2, CC > 15, 15 케이스, 90일)
- 결정 트리 분기 순서 재배치

### Never do

- `core/`, `mcp/`, `hooks/`, `ast/` 역방향 import
- `Date.now()` / `new Date()` 호출 (순수성 위반)

## Dependencies

- `../types/metrics.js`, `../constants/quality-thresholds.js`
