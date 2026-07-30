# sourceResolver — Contract

## Requirements

- 이 플러그인이 다루는 db 계열은 `pubmed`·`pmc`·`mesh` 뿐이며, 그 범위를 코드로 강제한다.
- `db` 를 지정하지 않으면 `pubmed` 로 해석한다. 지원하지 않는 값은 throw 한다.
- base URL 은 항상 trailing slash 로 정규화한 뒤 `<base><fn>.fcgi` 를 조립한다. 미러 override 는 허용한다.
- `Db`·`EutilFn`·base URL 문자열은 `types/enums`·`constants/defaults` 에서만 가져온다.

## API Contracts

- `resolveDb(input?): Db` — 입력을 `Db` 로 해석한다. 미지정은 `pubmed`, 미지원은 throw.
- `buildBaseUrl(...): string` — `<base><fn>.fcgi` 엔드포인트 URL 조립.

## Acceptance Criteria

### AC-db-resolution — db 해석

- 미지정 입력은 `pubmed` 로 해석된다.
- 지원 범위 밖 db 는 throw 한다.

### AC-url-normalization — URL 정규화

- trailing slash 유무와 무관하게 같은 엔드포인트 URL 이 나온다.

## Last Updated

2026-07-30 — db 해석과 엔드포인트 조립 계약을 문서화했다.
