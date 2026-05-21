## Purpose

외부 CLI exit code / stderr 패턴 / Node 에러 코드를 `ErrorCode` 값 (`auth`, `rate_limit`, `network`, `cli_error`, `timeout`, `unknown`) 으로 정규화하는 단일 매핑 계층. dispatcher 내 어떤 곳에서도 `ErrorCode` 를 독자 결정하지 않도록 중앙화.

## Structure

| 파일                    | 역할                                                                     |
| ----------------------- | ------------------------------------------------------------------------ |
| `errorMap.ts`           | 단일 진입점 — `DispatchFailure` → `ErrorCode` 결정                       |
| `constants/codeMaps.ts` | exit code → `ErrorCode` 테이블, stderr 정규식 패턴 목록                  |
| `utils/classify.ts`     | Node 에러 코드 분류 (`ENOENT` → `cli_error`, `ETIMEDOUT` → `network` 등) |
| `index.ts`              | barrel: `mapError`                                                       |

## Conventions

- 모든 `ErrorCode` 결정은 이 모듈의 `mapError` 경유 — dispatcher 내 다른 위치에서 직접 결정 금지
- 알 수 없는 패턴은 `unknown` 으로 귀결 (throw 금지)
- `classify.ts` 는 pure function — 입출력 외 부작용 없음
- exit code → stderr 패턴 → Node 에러 코드 순서로 우선순위 적용

## Boundaries

### Always do

- 매핑 결과를 단일 테이블(`codeMaps.ts`)에서 관리
- 인식 불가 패턴은 `unknown` 반환

### Ask first

- 새 exit code 추가 또는 stderr 패턴 변경
- 매핑 우선순위 변경 (exit code vs stderr vs Node 코드 순서)

### Never do

- `ErrorCode` 열거형 외의 값 반환
- `mapError` 내부에서 throw — 에러는 반드시 `ErrorCode` envelope 로만 표현
- `dispatcher/` 외부 모듈에서 `codeMaps.ts` 직접 import

## Dependencies

- `../../types` (`ErrorCode`, `DispatchFailure`)
