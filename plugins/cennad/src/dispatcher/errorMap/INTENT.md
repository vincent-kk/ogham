## Purpose

외부 CLI exit code / stderr 패턴 / CLI 가 구조화 출력으로 보고한 실패 메시지(`cliMessage`) / Node 에러 코드를 종료 코드와 무관하게 `ErrorCode`로 정규화하는 단일 매핑 계층. 같은 진단이 provider마다 다른 코드로 갈리는 것을 막는다.

## Conventions

- CLI 종료·진단·취소 신호는 종료 코드와 무관하게 `mapError`를 경유한다. 어댑터의 직접 코드는 CLI 가 사유를 보고하지 않은 Codex 세션 참조 누락의 `unknown`과 복구 불가능한 Antigravity 빈 출력의 `cli_error`에 한정한다
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
