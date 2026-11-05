# core — Contract

## Requirements

- core 는 디스크 저장소 게이트웨이다: config·counter·session·project-hash 의 읽기·쓰기 경로를 소유한다.
- 모든 쓰기는 `lib/atomicWrite`(tmp → rename)를 거친다. 직접 `fs.writeFile` 을 부르지 않는다.
- 디스크 JSON 키는 snake_case 다(외부 인터페이스).
- 외부 CLI 조회 캐시(`agyModels`·`codexModels`)는 실패를 정상 경로로 다룬다 — 조회 실패가 UI 나 dispatch 를 막지 않는다.
- 세션 토큰은 공유 `@ogham/http-kit` 이 소유한다 — core 가 재구현하지 않는다.

## API Contracts

- 저장소 API의 이름과 인자는 각 자식 모듈의 진입점을 읽는다. 이 계층은 저장소 정책을 소유하며 외부 CLI 자체 세션은 소유하지 않는다.

## Acceptance Criteria

### AC-atomic-writes — 원자적 쓰기

- core 하위에 `fs.writeFile` 직접 호출이 없다.

### AC-cache-degradation — 캐시 실패 내성

- 모델 카탈로그 조회 실패가 예외로 전파되지 않는다.

## Last Updated

저장소 소유권·원자 쓰기·조회 실패 정책의 내용이나 적용 범위가 바뀔 때 갱신한다.
