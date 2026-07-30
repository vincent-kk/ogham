# errorLog — Contract

## Requirements

- 로그 파일 부재나 JSON 손상은 정상 경로다. read 는 빈 배열로 degrade 하고 throw 하지 않는다 — 진단용 로그 하나가 훅을 멈추게 하지 않는다.
- append 는 쓰기 전에 `ERROR_LOG_MAX_ENTRIES` 상한을 FIFO 로 유지한다. 오래된 항목이 먼저 나간다.
- `appendErrorLogSafe` 는 어떤 예외도 밖으로 내보내지 않는다. catch 블록 안에서 호출되는 것이 정상 사용이므로, 여기서 throw 하면 호출자의 원래 에러를 가린다.
- 경로 해석(`logPath`)은 organ 내부 단위이며 공개 표면이 아니다.

## API Contracts

- `readErrorLog(cwd)` — 항목 배열. 파일이 없거나 파싱 불가면 `[]`.
- `appendErrorLog(cwd, entry)` — 항목 추가. 디렉터리를 만들고, 상한 초과분을 앞에서 버린다. 파일시스템 오류는 전파된다.
- `appendErrorLogSafe(cwd, entry)` — 위의 fire-and-forget 래퍼. 반환값도 예외도 없다.
- 타입 `ErrorLogEntry` — `hook`·`error`·`timestamp`.

## Acceptance Criteria

### AC-safe-append-never-throws — 안전 append 무예외

- 파일시스템 오류 상황에서 `appendErrorLogSafe` 가 throw 하지 않는다.

### AC-read-degrades — 손상 내성

- 파일 부재·JSON 손상에서 `readErrorLog` 가 `[]` 를 반환한다.

### AC-fifo-cap — FIFO 상한

- 항목 수가 상한을 넘으면 가장 오래된 항목부터 제거된다.

## Boundary Exemptions

### `operations` — Hook bundle direct import

- **Consumers**: `**/src/hooks/**`
- **Direct import**: `allowed`
- **Reason**: 훅은 esbuild 번들로 배송되고 이벤트별 크기 가드를 받는다. 배럴을 거치면 재노출 그래프 전체가 번들에 끌려 들어와 가드를 넘긴다 — 배럴 경유는 선택지가 아니라 빌드 실패다. 훅이 자체 로깅을 다시 구현하는 대신 같은 함수를 직접 쓰는 편이 로그 포맷과 상한을 한 곳에 묶어 둔다.

## Last Updated

2026-07-30 — 로그 상한·degrade 계약과 훅 직접 import 면책을 문서화했다.
