# paperSearch — Contract

## Requirements

- agent 가 만든 QueryRole 다중 검색식을 받아 결정론 union 을 만든다. 기본 전략(날짜 분할)에서 분할이 상한 이하로 끝나면 **누락 0** 이 계약이고, 수집이 줄어드는 경우는 호출자가 WARN·ABORT·maxRecords 를 선택했거나 분할 한계(capped)에 닿았을 때뿐이다.
- 기본 상한 전략은 날짜 분할이다. 호출자가 선택한 WARN·ABORT와 maxRecords를 존중하되 제한·부분 결과 신호를 남겨 불완전한 검색을 전수 수집으로 오인하지 않게 한다.
- 메타데이터 수집은 배치로 하며 일부 실패를 전체 실패로 만들지 않는다(부분 복구).
- 대량 검색은 호출자인 스킬·agent가 명시적으로 async start를 선택한다. 동기 호출을 자동 전환하지 않아 반환 계약을 예측 가능하게 유지한다.
- 결과에는 `SearchManifest` 를 남긴다 — 어떤 검색식이 어떤 레코드를 맞혔는지 재현 가능해야 한다.

## API Contracts

호출 형태와 구체적인 반환 값은 공개 진입점과 테스트에서 확인한다.

## Acceptance Criteria

### AC-search-no-loss — 누락 0

- 여러 검색식의 결과가 union 되고 어떤 레코드도 병합 과정에서 사라지지 않는다.
- Count 가 10,000 을 넘는 검색식은 기본 전략에서 분할되어 전수가 수집된다.
- 상한 초과 검색은 기본 DATE_SEGMENT 전략으로 분할하며, 분할 한계의 capped 결과·WARN·ABORT·maxRecords 제한을 무제한 전수 수집으로 해석하지 않는다.

### AC-search-partial-recovery — 부분 복구

- 메타데이터 배치 일부가 실패해도 나머지 결과가 반환된다.

### AC-search-manifest — 재현 가능성

- 결과에 각 레코드의 출처 검색식(`hit_by`)이 남는다.

### AC-search-async — 대량 처리

- async job 은 `start` 이후 `status` 로 진행률을, `results` 로 cursor 페이지를 제공한다.

## Last Updated

검색 누락 방지·부분 복구와 manifest·비동기 job 계약이 바뀔 때 갱신한다.
