# claudemdMerge — Contract

## Requirements

- 호스트 instruction manager가 정한 maencof 소유 섹션만 관리한다. 호출자가 대상 파일을 정하지 않는다. 호스트가 읽지 않는 파일에 쓰면 파일은 생겨도 지침은 전달되지 않는 조용한 무효가 된다.
- had_existing_section은 계획 전 inspect에서 읽는다. 적용 후에는 항상 존재 상태라 호출 전 상태를 구별하는 신호가 사라진다.
- dry_run은 파일과 백업을 만들지 않는 계획 전용 경로다.
- 드리프트한 기존 소유 섹션은 교체하고 실제 쓰기에만 sibling 백업을 남긴다. 마커 밖 사용자 내용은 보존한다.

## API Contracts

부분 적용은 `changed: false`로 반환하지 않고 기존 MCP 오류 경로로 전달해 `isError: true`로 응답한다. 오류 메시지는 부분 적용 상태와 완료 경로, 실패 대상·오류, 미시도 경로, 실제 작성된 백업을 보존한다. 목적지 작성 후 원본 정리가 실패한 relocation을 성공이나 무변경으로 보고하면 복구 판단이 잘못된다.

호스트별 실제 지침 대상은 호출마다 instruction manager로 해석해 stale 영향 경로를 보고한다. 호출자 입력 content는 응답에 에코하지 않는다. 이미 가진 본문의 반복은 정보 없이 컨텍스트 비용만 늘린다.

## Acceptance Criteria

행동별 결과와 경계값은 이 모듈을 검증하는 테스트가 고정한다.

## Last Updated

호스트 지침의 소유 섹션 병합, 드리프트 교체 또는 dry_run·백업 계약이 바뀔 때 갱신한다.
