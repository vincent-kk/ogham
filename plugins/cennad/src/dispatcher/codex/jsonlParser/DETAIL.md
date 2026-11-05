# jsonlParser — Contract

## Requirements

- `codex exec`의 JSONL stdout을 라인 단위로 파싱한다.
- **알 수 없는 이벤트 shape 는 조용히 건너뛴다.** CLI 가 새 이벤트를 추가해도 파싱이 무너지지 않아야 한다.
- 순수 함수다 — 프로세스를 띄우지 않고 문자열만 다룬다.

## API Contracts

입출력 이름과 형태는 진입점과 검증 코드를 읽는다.

## Acceptance Criteria

검증 코드가 수용 기준을 고정하므로 별도 acceptance group을 선언하지 않는다.

## Last Updated

미지 이벤트 허용·thread 식별·최종 응답 선택 계약의 내용이나 적용 범위가 바뀔 때 갱신한다.
