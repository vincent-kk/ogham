# manifestSave — Contract

## Requirements

- MCP 도구 `manifest_save` 의 핸들러다. 등록은 `mcp/server` 가 `wrapHandler` 로 감싸므로, 여기서 던진 예외는 MCP `isError: true` 응답이 된다.
- 저장은 전체 교체다. 기존 매니페스트와 병합하지 않으므로 호출자는 완결된 문서를 넘겨야 한다.
- `manifest` 는 MCP 경계에서 optional 이지만 계약상 필수다. 검증 스키마가 `type` 에 따라 달라져 단일 `inputSchema` 로는 조건부 검증을 표현할 수 없기에 열어 둔 자리이며, 누락 검사와 타입별 검증을 핸들러가 맡는다.
- `manifest` 는 객체 또는 그 JSON 문자열 인코딩을 받는다. MCP 클라이언트는 스키마가 object 타입을 선언하지 않으면 객체 인자를 문자열로 직렬화할 수 있으므로, `inputSchema` 가 object|string 을 선언하고 핸들러가 문자열을 JSON 으로 해독한 뒤 같은 검증을 태운다.
- 디스크에 닿는 것은 스키마를 통과한 값뿐이다 — 검증 실패는 파일을 남기지 않는다.
- 요약 계산은 `manifestParser` 가 소유한다.

- 핸들러 직접 호출만으로는 MCP 클라이언트의 문자열 직렬화 문제를 검증할 수 없다. 실제 SDK 전송을 지나는 회귀 검증으로 스키마 광고와 입력 해독을 함께 확인한다.

## API Contracts

- 방출 JSON Schema는 object|string을 명시한다. unknown만 쓰면 빈 스키마로 방출되어 클라이언트가 객체를 문자열로 직렬화할 수 있다.
- 디스크에는 스키마 parse 결과를 기록하므로 기본값이 채워질 수 있다. 요약도 이 저장본을 기준으로 한다.
- 누락·잘못된 JSON 문자열·스키마 오류는 쓰기 전에 거부한다. 실행 디렉터리가 없어도 원자적 쓰기가 생성한다.

## Acceptance Criteria

### AC-full-replace — 전체 교체

- 저장 후 파일 내용은 넘긴 문서(스키마 기본값 적용본)와 일치한다 — 이전 내용의 잔재가 남지 않는다.

### AC-object-schema-advertised — object 타입 광고

- `manifest_save` 가 방출하는 JSON Schema 에서 `manifest` 는 object 를 포함한 타입 선언을 갖는다 — 빈 스키마(`{}`)로 방출되지 않으며, 여전히 `$ref` 0건이다.

## Last Updated

전송 인코딩·스키마 검증·전체 교체 계약의 내용과 근거가 바뀔 때 갱신한다.
