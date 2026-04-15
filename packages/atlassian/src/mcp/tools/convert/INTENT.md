## Purpose

ADF / Storage / Markdown 포맷 간 변환을 수행하는 순수 로컬 MCP 툴 핸들러.
HTTP 통신 없이 완전히 로컬에서 실행된다.

## Structure

| 파일 | 역할 |
|------|------|
| `convert.ts` | `handleConvert` — `converter` 모듈에 변환 위임, 오류를 결과 객체로 래핑 |
| `index.ts` | 배럴 — `handleConvert` 재내보내기 |

## Boundaries

### Always do

- 변환 로직은 `converter/index`에 위임한다 (`convert` 함수 경유)
- 오류를 예외로 전파하지 않고 `{ success: false, error }` 형태로 반환한다

### Ask first

- 지원 포맷(`ConvertFormat`) 추가 또는 제거
- 변환 결과 스키마(`ConvertResult`) 변경

### Never do

- 변환 알고리즘을 이 모듈에 직접 구현하지 않는다
- HTTP 요청 또는 파일 I/O를 수행하지 않는다
- Atlassian 도메인 지식(ADF 구조 세부사항 등)을 직접 다루지 않는다

## Dependencies

- `converter/index` — `convert` 함수 (실제 변환 로직)
- `types/index` — `ConvertFormat`
