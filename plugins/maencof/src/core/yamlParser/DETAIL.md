# yamlParser — Contract

## Requirements

- 외부 YAML 라이브러리를 쓰지 않는다. frontmatter 는 훅 번들에도 들어가는 경로라 의존을 하나 더 얹으면 크기 가드를 넘긴다.
- 파싱은 순수 함수다. 파일도 시각도 읽지 않는다.
- 직렬화는 `quoteYamlValue` 를 반드시 경유한다 — 콜론·해시·선행 공백 같은 특수문자가 인용 없이 나가면 다음 파싱에서 값이 달라진다.
- 스칼라 해석은 `parseScalarValue` 한 곳에서만 한다. 호출자가 따로 숫자·불리언 변환을 하지 않는다. **배열 항목도 스칼라와 같은 경로를 지난다** — 호출자가 인용 제거를 대신하면 escape 처리가 두 번 갈라진다.
- 왕복 불변식: 모든 문자열 `s` 에 대해 `parseScalarValue(quoteYamlValue(s)) === s`. 숫자·불리언·null 로 오독될 문자열은 직렬화 시 인용되어야 이 등식이 성립한다.

## API Contracts

배열 항목도 스칼라와 같은 인용 해제 경로를 사용한다. 호출자가 따로 인용을 제거하면 escape 처리가 갈라져 저장 후 되읽기의 스키마 검증이 실패한다.

## Acceptance Criteria

### AC-frontmatter-parsing — frontmatter 파싱

- 인라인 배열과 블록 배열이 같은 배열 값으로 파싱된다.
- frontmatter 가 없거나 닫히지 않은 입력에서 빈 맵을 반환하고 throw 하지 않는다.

### AC-yaml-serialization — 직렬화 안전성

- 특수문자를 담은 값이 인용되어 나가고, 다시 파싱하면 같은 값이 된다.
- 스칼라 해석이 숫자·불리언·문자열을 구분한다.

### AC-yaml-round-trip — 왕복 불변식

- 숫자 배열이 `number[]` 로 되읽히고, 숫자꼴 문자열 배열이 `string[]` 로 되읽힌다.
- 인라인 배열과 블록 배열이 이 규칙에서 동일하게 동작한다.
- 인용 항목의 escape 해제가 스칼라 경로와 같은 결과를 낸다.

## Last Updated

스칼라와 배열의 해석·문자열 왕복·훅 번들 제약이 바뀔 때 갱신한다.
