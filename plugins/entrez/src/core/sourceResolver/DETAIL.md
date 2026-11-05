# sourceResolver — Contract

## Requirements

- 이 플러그인이 다루는 db 계열은 `pubmed`·`pmc`·`mesh` 뿐이며, 그 범위를 코드로 강제한다.
- 미러 base URL override 는 허용한다.
- `Db`·`EutilFn`·base URL 문자열은 `types/enums`·`constants/defaults` 에서만 가져온다.

## API Contracts

호출 형태와 구체적인 반환 값은 공개 진입점과 테스트에서 확인한다.

## Acceptance Criteria

구체적인 입출력 수락 기준은 해당 모듈 테스트가 고정한다.

## Last Updated

지원 DB 범위와 미러 URL 해석 정책이 바뀔 때 갱신한다.
