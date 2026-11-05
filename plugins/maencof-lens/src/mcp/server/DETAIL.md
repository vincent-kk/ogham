# server — Contract

## Requirements

- 등록 표면은 읽기 전용으로 유지한다. 재색인·mutation은 maencof 세션이 소유한다.
- 설정 부재는 도구 호출 시점에 보고하여 복구 안내를 받을 서버까지 기동 불가가 되지 않게 한다. 워크스페이스 미노출과 설정 파일 부재를 구분하고 환경변수·setup 복구 수단을 알린다.
- 볼트 해석과 그래프 캐시는 서버 인스턴스에서 공유한다. 콜백별 재구성으로 이름 해석이나 로드 상태가 갈라지지 않게 한다.
- 콜백 예외와 응답 조립은 공통 오류·결과 봉투를 경유한다. MCP 밖으로 예외가 새거나 도구마다 봉투가 달라지는 것을 막는다.
- 서브레이어 모델은 maencof가 소유한다. `SubLayerSchema`를 공유하여 폐기값이 통과한 뒤 빈 결과가 되는 실패를 막는다.

## API Contracts

- search·context만 호출별 레이어 필터를 받으며 navigate·read는 볼트 상한을 사용한다. status 집계는 볼트 전체의 인덱스 건강 상태를 알리기 위해 필터를 적용하지 않는다.
- seed와 cluster의 상호배타 검증은 maencof가 소유한다. 열거 결과에도 볼트 상한을 유지한다.
- read 결과의 오류 필드만 MCP `isError`로 승격한다. 다른 조회의 결과 오류는 본문으로 돌려주므로 소비자는 이 차이를 구분해야 한다.

## Acceptance Criteria

### AC-tool-registry — 툴 등록 범위

- 등록되는 툴이 정확히 5개이고, 이름이 `McpToolName` 값과 일치한다.
- mutation·재색인 계열 툴이 등록되지 않는다.

### AC-error-envelope — 에러 봉투

- 툴 콜백에서 던져진 예외가 `toolError` 응답으로 변환되어 서버 밖으로 전파되지 않는다.
- `read` 의 레이어 차단 결과가 `isError` 로 표시된다.

### AC-single-graph-cache — 그래프 캐시 단일화

- 그래프를 사용하는 툴은 같은 `GraphCache` 인스턴스를 통해 그래프를 얻는다.
- 볼트 경로가 같으면 툴 호출마다 그래프를 다시 로드하지 않는다.

### AC-sublayer-from-maencof — 서브레이어 값 위임

- `search`·`context` 의 `sub_layer` 가 maencof 가 현재 인정하는 서브레이어 값을 받는다.
- 폐기된 값(v2 의 L5 `buffer`·`boundary`)은 스키마 단계에서 거절된다 — 조용히 빈 결과로 흘러가지 않는다.
- 이 패키지 소스 어디에도 서브레이어 값 리터럴이 없다.

## Last Updated

도구 등록·오류 표면·서버 수명주기 계약의 내용이나 적용 범위가 바뀔 때 갱신한다.
