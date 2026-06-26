## Purpose

`fetch-fulltext` 도구. PMID/PMCID → idconv→oa.fcgi→PMC OA 본문(PDF/XML/TAR) 다운로드. "OA면 저장, 비OA·license 미확인이면 링크만". per-format 실패 격리.

## Structure

| 파일                             | 역할                                   |
| -------------------------------- | -------------------------------------- |
| `fetchFulltext.ts`               | `runFetchFulltext` — id별 처리(메인)   |
| `operations/resolvePmcid.ts`     | PMID→PMCID(idconv), doi 폴백           |
| `operations/downloadFulltext.ts` | oa 판별·license 게이트·다운로드·sha256 |

## Conventions

- 다운로드 경로는 `safeOutputPath`로 outDir 밖 탈출 거부. ftp 링크는 https로 승격.
- license 미확인 본문은 저장 보류(재배포 위험 차단), 링크만 리포트.

## Boundaries

### Always do

- OA + license 확인된 본문만 저장. sha256·bytes 기록. 비OA/실패는 unavailable.
- 다운로드 호스트만 임시 allowlist 추가(SSRF 유지).

### Ask first

- 저장 경로 정책·파일명 규칙 변경, XML 본문(efetch db=pmc) 경로 추가.

### Never do

- 경로 traversal 허용. license 없는 본문 저장. injectAuth로 PMC 호스트에 api_key 전송.

## Dependencies

- `../../../adapters/eutils` (idconv·oaService) · `../../../core/httpClient`
- `../../../lib/fileIo` · `../../../utils/{sha256,path}` · `../shared` · `../../../types/{tool,enums}`
