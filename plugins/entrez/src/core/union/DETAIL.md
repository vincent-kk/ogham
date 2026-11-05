# union — Contract

## Requirements

- 여러 검색식의 결과를 합칠 때 레코드를 **제거하지 않는다**. 병합은 attribution 누적이지 필터가 아니다 — 누락 0 보장이 이 모듈의 책임이다.
- 순수 함수다 — 네트워크와 I/O 가 없다.

## API Contracts

호출 형태와 구체적인 반환 값은 공개 진입점과 테스트에서 확인한다.

## Acceptance Criteria

### AC-union-no-loss — 무손실 병합

- 병합 결과의 고유 레코드 수가 입력 고유 레코드 수보다 작지 않다.
- 같은 논문이 여러 검색식에서 나오면 하나로 합쳐지되 `hit_by` 에 모든 출처가 남는다.

## Last Updated

검색 합집합의 무손실 attribution과 dedup 정책이 바뀔 때 갱신한다.
