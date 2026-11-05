# errorLog — Contract

## Requirements

- 로그 파일 부재나 JSON 손상은 정상 경로다. read 는 빈 배열로 degrade 하고 throw 하지 않는다 — 진단용 로그 하나가 훅을 멈추게 하지 않는다.
- append 는 쓰기 전에 `ERROR_LOG_MAX_ENTRIES` 상한을 FIFO 로 유지한다. 오래된 항목이 먼저 나간다.
- `appendErrorLogSafe` 는 어떤 예외도 밖으로 내보내지 않는다. catch 블록 안에서 호출되는 것이 정상 사용이므로, 여기서 throw 하면 호출자의 원래 에러를 가린다.

## API Contracts

일반 append의 파일시스템 오류는 호출자가 다루지만 안전 append는 예외를 격리한다. 두 경로를 합쳐 원래 오류를 가리거나 진단 실패를 숨기는 방식으로 바꾸지 않는다.

## Acceptance Criteria

구체 동작의 수용 기준은 테스트가 고정하며 정책은 위 계약을 따른다.

## Boundary Exemptions

### `operations` — Hook bundle direct import

- **Consumers**: `**/src/hooks/**`
- **Direct import**: `allowed`
- **Reason**: 훅은 esbuild 번들로 배송되고 이벤트별 크기 가드를 받는다. 배럴을 거치면 재노출 그래프 전체가 번들에 끌려 들어와 가드를 넘긴다 — 배럴 경유는 선택지가 아니라 빌드 실패다. 훅이 자체 로깅을 다시 구현하는 대신 같은 함수를 직접 쓰는 편이 로그 포맷과 상한을 한 곳에 묶어 둔다.

## Last Updated

로그 보존 상한·안전 append·오류 격리 정책이 바뀔 때 갱신한다.
