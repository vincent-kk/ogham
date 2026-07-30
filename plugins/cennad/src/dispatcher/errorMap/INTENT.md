## Purpose

외부 CLI exit code / stderr 패턴 / CLI 가 구조화 출력으로 보고한 실패 메시지(`cliMessage`) / Node 에러 코드를 `ErrorCode` 값 (`auth`, `rate_limit`, `network`, `timeout`, `cli_error`, `cancelled`, `budget_exhausted`, `disabled`, `unknown`) 으로 정규화하는 단일 매핑 계층. dispatcher 내 어떤 곳에서도 `ErrorCode` 를 독자 결정하지 않도록 중앙화.

## Structure

| 파일                    | 역할                                                                           |
| ----------------------- | ------------------------------------------------------------------------------ |
| `errorMap.ts`           | 단일 진입점 — `DispatchFailure` → `ErrorCode` 결정                             |
| `constants/codeMaps.ts` | exit code → `ErrorCode` 테이블, stderr 정규식 패턴 목록                        |
| `utils/classify.ts`     | Node 에러 코드 분류 (`ENOENT` → `cli_error`, spawn `ETIMEDOUT` → `timeout` 등) |
| `index.ts`              | barrel: `mapError`                                                             |

## Conventions

- 모든 `ErrorCode` 결정은 이 모듈의 `mapError` 경유 — dispatcher 내 다른 위치에서 직접 결정 금지
- 알 수 없는 패턴은 `unknown` 으로 귀결 (throw 금지)
- `classify.ts` 는 pure function — 입출력 외 부작용 없음
- `cancelled` → exit code → 패턴(`cliMessage` + stderr 합본) → Node 에러 코드 순서로 우선순위 적용. `cancelled` 가 최상위인 이유는 중단이 스트림 도중에 꽂히기 때문 — 버퍼에 남은 출력은 중단 사유가 아니라 중단 시점에 하던 일을 말한다. retry-storm 의 `abortedByCaller`(→`rate_limit`)와는 별개 신호다
- `cliMessage` 는 CLI 가 stderr 가 아닌 구조화 출력으로 보고한 실패 사유 (codex JSONL `error`/`turn.failed`, agy `event:"result"` 의 `status:"ERROR"`+`error`) — 분류에 함께 쓴다. 메시지 우선순위는 `cliMessage` → `spawnError.message` → stderr: 앞의 둘은 실패에 대한 진술이고 stderr 는 그 시점에 마침 남아 있던 출력이다. **두 CLI 모두 실패 시 stderr 를 비우거나 무관한 문구만 남긴다**(codex: stdin 안내, agy: 빈 stderr). 이게 없으면 `unknown` + "Unclassified failure." 가 나간다

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
