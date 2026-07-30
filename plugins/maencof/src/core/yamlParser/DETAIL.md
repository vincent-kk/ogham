# yamlParser — Contract

## Requirements

- 외부 YAML 라이브러리를 쓰지 않는다. frontmatter 는 훅 번들에도 들어가는 경로라 의존을 하나 더 얹으면 크기 가드를 넘긴다.
- 파싱은 순수 함수다. 파일도 시각도 읽지 않는다.
- 직렬화는 `quoteYamlValue` 를 반드시 경유한다 — 콜론·해시·선행 공백 같은 특수문자가 인용 없이 나가면 다음 파싱에서 값이 달라진다.
- 스칼라 해석은 `parseScalarValue` 한 곳에서만 한다. 호출자가 따로 숫자·불리언 변환을 하지 않는다.

## API Contracts

- `parseYamlFrontmatter(source)` — frontmatter 블록을 키-값 맵으로. 인라인 배열(`[a, b]`)과 블록 배열을 모두 인식하고, 값은 `parseScalarValue` 로 해석한다.
- `parseScalarValue(raw)` — 스칼라 문자열을 문자열·숫자·불리언으로 해석한다.
- `quoteYamlValue(value)` — 직렬화 안전 인용. 특수문자를 담은 값에 인용을 씌운다.

## Acceptance Criteria

### AC-frontmatter-parsing — frontmatter 파싱

- 인라인 배열과 블록 배열이 같은 배열 값으로 파싱된다.
- frontmatter 가 없거나 닫히지 않은 입력에서 빈 맵을 반환하고 throw 하지 않는다.

### AC-yaml-serialization — 직렬화 안전성

- 특수문자를 담은 값이 인용되어 나가고, 다시 파싱하면 같은 값이 된다.
- 스칼라 해석이 숫자·불리언·문자열을 구분한다.

## Last Updated

2026-07-30 — 파싱·직렬화 계약과 spec 이 주장할 acceptance group 2개를 정의했다.
