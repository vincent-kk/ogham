## Purpose

도구 핸들러 응답 헬퍼 모듈. 평문 데이터를 MCP 결과로 직렬화하고, throw 를 에러 봉투로 변환하며, `extra`(signal) 를 핸들러에 전달한다.

## Conventions

- 이미 MCP content 형태인 결과는 변형 없이 통과시킨다. 이중 직렬화하면 호출자가 기대하는 응답 봉투가 깨진다.
- throw는 공통 오류 봉투로 바꾸고 취소 신호는 핸들러에 전달한다. 응답 형식과 호출자 문맥이 각 도구에서 달라지지 않게 한다.

## Boundaries

### Always do

- 핸들러 throw 를 `toolError` 봉투로 변환
- pre-built content 결과는 변형 없이 passthrough

### Ask first

- 에러 봉투 형식 변경

### Never do

- 핸들러 throw 를 그대로 전파 (서버 크래시)
