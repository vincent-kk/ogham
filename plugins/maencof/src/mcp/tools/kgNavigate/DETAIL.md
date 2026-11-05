# kgNavigate — Contract

## Requirements

- 그래프 이웃 탐색을 소유하며 응답 폭주를 막기 위해 이웃 목록과 siblings의 별도 상한을 유지한다.
- 절단 여부와 원총수는 호출자가 누락된 이웃을 전체 결과로 오해하지 않도록 보고한다.
- 그래프 부재에는 재색인을 안내하고 노드 부재와 구별한다.

## API Contracts

허브에서 전체 노드 배열이 응답을 압도하지 않도록 목록별 상한과 절단 전 총수를 유지한다. siblings 전체 요청만 별도 opt-in으로 상한을 해제하며 다른 이웃 목록까지 함께 무제한으로 바꾸지 않는다.

## Acceptance Criteria

행동별 결과와 경계값은 이 모듈을 검증하는 테스트가 고정한다.

## Last Updated

이웃·siblings 상한, 전체 siblings opt-in 또는 절단 전 총수 보고 계약이 바뀔 때 갱신한다.
