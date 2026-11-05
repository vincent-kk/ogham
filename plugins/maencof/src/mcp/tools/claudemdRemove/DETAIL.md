# claudemdRemove — Contract

## Requirements

- 병합과 같은 호스트 instruction manager의 대상에서 maencof 섹션만 제거한다. 사용자 내용과 지침 파일 자체는 남긴다.
- 지울 섹션이 없으면 파일·백업을 쓰지 않고 removed:false로 끝낸다. 무변경 적용은 공유 manager가 보장하며, 도구에 별도 쓰기 경로를 두지 않아 부재를 오류나 부수효과로 바꾸지 않는다.
- dry_run은 계획 전용이며 파일·백업을 만들지 않는다.
- 제거할 드리프트를 새 내용으로 교체하지 않는다. 실제 쓰기에만 sibling 백업을 남긴다.

## API Contracts

부분 적용은 구간 부재를 뜻하는 `removed: false`로 반환하지 않고 기존 MCP 오류 경로로 전달해 `isError: true`로 응답한다. 오류 메시지는 부분 적용 상태와 완료 경로, 실패 대상·오류, 미시도 경로, 실제 작성된 백업을 보존해 제거 실패와 무변경을 구분한다.

제거는 파일 삭제가 아니라 maencof 소유 섹션 제거다. 실제 호스트 대상과 영향 경로는 호출 시점 manager 해석 결과를 사용하며 상수로 고정하지 않는다.

## Acceptance Criteria

행동별 결과와 경계값은 이 모듈을 검증하는 테스트가 고정한다.

## Last Updated

제거 범위, 섹션 부재·dry_run 처리 또는 백업 정책이 바뀔 때 갱신한다.
