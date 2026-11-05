## Purpose

자막/캡션 도메인 수직 슬라이스. transcript·subtitles·list-subtitle-languages 도구와 추출 operation, 자막 전용 후처리를 한 모듈에 응집한다.

## Conventions

- 자막 도구는 공용 실행 래퍼와 `throttle: 'subtitle'` 페이싱을 사용하여 자막 호출의 오류 표면과 요청 간격이 갈라지지 않게 한다.
- 공유 도메인 타입을 복제하지 않는다. 자막 결과와 다른 도구의 타입 계약이 어긋나는 것을 막는다.
- 자막 목록만 공용 info-json 추출을 사용하고, 본문·큐 추출은 이 슬라이스에서 완결한다.

## Boundaries

### Always do

- 자막 호출은 `throttle: 'subtitle'`로 페이싱한다
- 추출 실패는 타입드 `YtDlpMcpError`로 표면화한다

### Ask first

- 새 자막 도구 추가

### Never do

- cache-key 접두를 바꿔 자막 페이싱을 깨뜨린다
