# manifestValidator — Contract

## Requirements

- 매니페스트 로드는 `manifestParser` 의 `loadManifest` 에만 의존한다. 파일명 조립과 Zod 파싱을 여기서 다시 구현하지 않는다.
- 로드 실패(파일 부재·JSON 오류·스키마 불일치)는 예외로 새어 나가지 않는다. `valid: false` 와 `Schema validation failed: <원인>` error 한 건으로 환원하고, 그 뒤 무결성 검사는 수행하지 않는다 — 로드되지 않은 매니페스트에는 검사할 참조가 없다.
- `valid` 는 `errors` 가 비었는지만 본다. `warnings` 는 결과를 뒤집지 못한다 — 경고는 계약 위반이 아니라 사람이 판단할 신호다.
- 읽기 전용이다. 입력 매니페스트를 변형하지 않고 파일을 쓰지 않는다.

## API Contracts

- 오류는 계약 위반이며 경고는 사람이 판단할 신호다. 경고만으로 유효성을 뒤집지 않는다.
- 참조 오류는 첫 항목에서 멈추지 않고 모아 보고한다. 타입별 분류와 문구는 구현과 테스트에서 확인한다.

## Acceptance Criteria

구체 판정과 입력별 결과는 이 모듈의 테스트가 고정한다.

## Last Updated

오류·경고의 의미와 참조 무결성 계약의 내용과 근거가 바뀔 때 갱신한다.
