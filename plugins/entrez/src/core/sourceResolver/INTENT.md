## Purpose

`db` 파라미터 해석과 E-utility 엔드포인트 URL 조립. entrez의 단일 db 계열(pubmed·pmc·mesh) 범위를 코드로 강제한다.

## Structure

| 파일                         | 역할                                                        |
| ---------------------------- | ----------------------------------------------------------- |
| `operations/resolveDb.ts`    | `resolveDb` — 입력→`Db`(미지정=pubmed, 미지원 throw)        |
| `operations/buildBaseUrl.ts` | `buildBaseUrl` — `<base><fn>.fcgi` 조립(미러 override 허용) |
| `index.ts`                   | 배럴                                                        |

## Conventions

- `Db`·`EutilFn`·base URL은 `types/enums`·`constants/defaults`에서만 가져온다.
- base URL은 항상 trailing slash로 정규화.

## Boundaries

### Always do

- 미지원 db는 명시적으로 거부(NCBI 외 소스는 형제 plugin 소관).

### Ask first

- 새 db 또는 새 E-utility 엔드포인트 추가.

### Never do

- 상위(mcp/adapters) 모듈 import. 인라인 호스트/엔드포인트 문자열 사용.

## Dependencies

- `../../types/enums` — `Db`, `EutilFn`
- `../../constants/defaults` — `DEFAULT_DB`, `DEFAULT_EUTILS_BASE`
