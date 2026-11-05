# maencofDelete — Contract

## Requirements

- L1은 정체성 보호 때문에 삭제를 거부한다. backlink가 있으면 명시적 force 없이 삭제하지 않는다.
- 참조 경고는 상한과 초과 개수로 요약해 대량 backlink가 컨텍스트를 압도하지 않게 한다. 강제 삭제 뒤에는 끊어진 참조 총수를 알린다.
- 성공 메시지는 path 필드를 반복하지 않는다. 이미 반환한 경로를 다시 쓰는 것은 컨텍스트 낭비다.
- vault 봉쇄를 유지하되 레이어 밖 문서도 삭제 검증 대상이다. allowNonLayerPath는 이 범위를 위한 선택이며 그래프 편입 자격은 색인 경계가 판단한다.

## API Contracts

정체성 문서는 삭제 경로에서 보호하고 backlink가 있는 문서는 명시적 force 없이 지우지 않는다. 대량 참조의 경고는 상한과 초과 총수로 요약한다. 성공 메시지는 path 필드를 중복하지 않아 컨텍스트 낭비를 막는다.

## Acceptance Criteria

행동별 결과와 경계값은 이 모듈을 검증하는 테스트가 고정한다.

## Last Updated

L1 삭제 금지, backlink의 force 요구 또는 대량 참조 경고 계약이 바뀔 때 갱신한다.
