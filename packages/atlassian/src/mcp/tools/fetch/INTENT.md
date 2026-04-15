## Purpose

HTTP GET/POST/PUT/PATCH/DELETE를 통합 처리하는 MCP 툴 핸들러.
ADF 자동 변환, 바이너리 에셋 다운로드, Markdown→ADF 변환을 조율한다.

## Structure

| 파일 | 역할 |
|------|------|
| `fetch.ts` | `handleFetch` — 메서드별 분기, 유틸 조율 |
| `index.ts` | 배럴 — `handleFetch` 재내보내기 |
| `utils/asset-fetch.ts` | 바이너리 파일 다운로드 및 파일시스템 캐싱 |
| `utils/auto-convert-adf.ts` | GET 응답에서 ADF 필드를 Markdown으로 자동 변환 |
| `utils/convert-body-to-adf.ts` | POST body의 Markdown → ADF 변환 |
| `utils/convert-body-for-update.ts` | PUT/PATCH body의 Markdown → ADF/Storage 변환 (엔드포인트 감지) |

## Boundaries

### Always do

- HTTP 전송은 `core/http-client`의 `executeRequest`에 위임한다
- GET + `save_to_path` 조합은 `asset-fetch` 유틸로 라우팅한다
- GET 응답의 ADF 필드는 `autoConvertAdf`로 자동 Markdown 변환한다

### Ask first

- 새 HTTP 메서드 지원 추가
- `utils/` 하위 유틸 파일 추가 또는 제거
- 에셋 캐싱 전략 변경

### Never do

- HTTP 요청을 `executeRequest` 없이 직접 수행하지 않는다
- Jira / Confluence 도메인 비즈니스 로직(이슈 필드 해석 등)을 포함하지 않는다
- `utils/` 내 파일을 이 모듈 외부에서 직접 import하지 않는다

## Dependencies

- `core/http-client` — `executeRequest`
- `types/index` — `HttpClientConfig`, `McpResponse`, `FetchParams`, `AssetFetchParams`
- `converter/index` — ADF ↔ Markdown 변환 (utils 경유)
- `utils/index` — `validateSavePath`, `detectService`
- `lib/file-io` — `writeBinary`
