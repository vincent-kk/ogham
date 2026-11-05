# mcp/shared — Contract

## Requirements

- 응답 포맷과 backlink 유틸을 공동 소유하며 도구 특화 로직을 두지 않는다.
- 응답은 LLM 컨텍스트로 들어가므로 들여쓰기·개행을 추가하지 않는 compact JSON을 유지한다. 포맷 문자는 정보 없이 토큰 비용만 늘린다.
- Map·Set 결과를 잃지 않도록 공통 replacer를 사용하고 에러는 isError와 사람이 읽는 메시지로 보고한다.

## API Contracts

성공 응답은 compact JSON, 오류 응답은 사람이 읽는 텍스트다. 둘을 같은 JSON 파싱 경로로 취급하지 않는다. 직렬화 결과의 구체적인 필드와 컬렉션 변환은 테스트가 고정한다.

## Acceptance Criteria

행동별 결과와 경계값은 이 모듈을 검증하는 테스트가 고정한다.

## Last Updated

compact JSON·오류 텍스트의 구분 또는 Map·Set 직렬화 보존 계약이 바뀔 때 갱신한다.
