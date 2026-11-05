# claudemdRead — Contract

## Requirements

- 병합과 같은 호스트 instruction manager를 사용한다. 다른 지침 파일을 읽으면 실제 주입 상태와 조회 결과가 갈라진다.
- 읽기 전용이며 KG freshness와 무관하다. 지침 조회 때문에 파일이나 그래프 캐시를 바꾸지 않는다.
- 파일 부재와 섹션 부재는 구별한다. 한 플래그로 합치면 호출자가 미설치와 병합 실패를 구별하지 못한다.

## API Contracts

파일 부재와 섹션 부재는 다른 상태다. 호출자가 미설치와 병합 실패를 구별할 수 있어야 하며 KG freshness와 무관한 읽기 전용 경계를 유지한다.

## Acceptance Criteria

행동별 결과와 경계값은 이 모듈을 검증하는 테스트가 고정한다.

## Last Updated

병합과 공유하는 호스트 대상, 파일·섹션 부재 구분 또는 읽기 전용 경계가 바뀔 때 갱신한다.
