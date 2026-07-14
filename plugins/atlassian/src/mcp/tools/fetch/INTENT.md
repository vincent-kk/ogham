## Purpose

HTTP GET/POST/PUT/PATCH/DELETE를 통합 처리하는 MCP 툴 핸들러.
ADF 자동 변환, 바이너리 에셋 다운로드, Markdown→ADF/Storage/Wiki 변환을 조율한다.

## Structure

| 파일                      | 역할                                                          |
| ------------------------- | ------------------------------------------------------------- |
| `fetch.ts`                | `handleFetch` — 메서드별 분기, 유틸 조율                      |
| `index.ts`                | 배럴 — `handleFetch` 재내보내기                               |
| `utils/assetFetch.ts`     | 바이너리 파일 다운로드 및 파일시스템 캐싱                     |
| `utils/autoConvertAdf.ts` | GET 응답에서 ADF 필드를 Markdown으로 자동 변환                |
| `utils/pickBodyFormat.ts` | service+apiVersion → ADF/Storage/Wiki 결정                    |
| `utils/renderByFormat.ts` | 선택된 포맷으로 markdown 렌더                                 |
| `utils/convertBody.ts`    | POST/PUT/PATCH body의 Markdown → wire 포맷 변환               |
| `utils/normalizeBody.ts`  | 문자열로 도착한 JSON body를 객체로 파싱 (harness 직렬화 대응) |

## Boundaries

### Always do

- 원시 `body`는 `normalizeBody`로 정규화한 뒤 변환·전송한다
- HTTP 전송은 `core/httpClient`의 `executeRequest`에 위임한다
- GET + `save_to_path` 조합은 `assetFetch` 유틸로 라우팅하며, 진입 시 선택 인자 `project_root`를 `rememberProjectRoot`로 시드한다 (저장 경로 allow-root 좌표)
- GET 응답의 ADF 필드는 `autoConvertAdf`로 자동 Markdown 변환한다
- 절대 URL endpoint는 `stripBaseUrl`로 base-상대 경로로 축약한 뒤 `transformRequest`(V2 logical → V1/DC physical) → `attachPrefix`(service+버전 prefix) 순으로 처리한다
- DC(`ctx.requires_xsrf_bypass`) non-GET 요청에는 `X-Atlassian-Token: no-check` 헤더를 주입한다

### Ask first

- 새 HTTP 메서드 지원 추가
- `utils/` 하위 유틸 파일 추가 또는 제거
- 에셋 캐싱 전략 변경

### Never do

- HTTP 요청을 `executeRequest` 없이 직접 수행하지 않는다
- Jira / Confluence 도메인 비즈니스 로직(이슈 필드 해석 등)을 포함하지 않는다
- `utils/` 내 파일을 이 모듈 외부에서 직접 import하지 않는다

## Dependencies

- `@ogham/cross-platform/host-paths` — `rememberProjectRoot`
- `core/httpClient` — `executeRequest`
- `types/index` — `FetchContext`, `McpResponse`, `FetchParams`, `AssetFetchParams`
- `converter/index` — ADF/Storage/Wiki ↔ Markdown 변환 (utils 경유)
- `utils/index` — `validateSavePath`, `stripBaseUrl`, `attachPrefix`, `transformRequest`, `detectService` (폴백)
- `lib/fileIo` — `writeBinary`
