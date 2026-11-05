# claudemdRemove — Contract

## Requirements

- 병합과 같은 호스트 instruction manager의 대상에서 maencof 섹션만 제거한다. 사용자 내용과 지침 파일 자체는 남긴다.
- 지울 섹션이 없으면 적용하지 않고 removed:false로 끝내는 정책이다. 부재를 오류로 다루지 않는다.
- dry_run은 계획 전용이며 파일·백업을 만들지 않는다.
- 제거할 드리프트를 새 내용으로 교체하지 않는다. 실제 쓰기에만 sibling 백업을 남긴다.

## API Contracts

제거는 파일 삭제가 아니라 maencof 소유 섹션 제거다. 실제 호스트 대상과 영향 경로는 호출 시점 manager 해석 결과를 사용하며 상수로 고정하지 않는다.

## Acceptance Criteria

행동별 결과와 경계값은 이 모듈을 검증하는 테스트가 고정한다.

## Last Updated

제거 범위, 섹션 부재·dry_run 처리 또는 백업 정책이 바뀔 때 갱신한다.
