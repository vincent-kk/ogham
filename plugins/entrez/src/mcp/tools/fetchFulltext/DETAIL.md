# fetchFulltext — Contract

## Requirements

- 경로는 PMID/PMCID → idconv → oa.fcgi → PMC OA 본문(PDF/XML/TAR) 이다.
- 정책은 하나다: **OA 면 저장하고, 비OA 이거나 license 를 확인할 수 없으면 링크만 돌려준다.** 접근 권한을 추정해 내려받지 않는다.
- 포맷별 실패는 격리한다 — PDF 를 못 받아도 XML 은 받는다.
- id 하나의 실패가 나머지 id 처리를 멈추지 않는다.
- 저장 경로는 `safeOutputPath` 로 outDir 밖 탈출을 거부한다. ftp 링크는 https 로 승격한다.
- 저장한 본문은 sha256 과 바이트 수를 기록한다.
- PMC 호스트에는 `api_key` 를 전송하지 않는다. 다운로드 호스트만 SSRF allowlist 에 임시로 더한다.

## API Contracts

- `runFetchFulltext(...)` — id 목록을 받아 id 별 처리 결과를 돌려주는 진입점.
- `operations/resolvePmcid.ts` — PMID→PMCID(idconv), doi 폴백.
- `operations/downloadFulltext.ts` — OA 판별·license 게이트·다운로드·sha256.

## Acceptance Criteria

### AC-oa-policy — OA 판정 정책

- OA 로 확인된 항목만 본문이 저장된다.
- 비OA·license 미확인 항목은 저장 없이 링크만 반환된다.

### AC-failure-isolation — 실패 격리

- 한 포맷의 다운로드 실패가 다른 포맷 결과를 지우지 않는다.
- 한 id 의 실패가 다른 id 처리를 중단시키지 않는다.

### AC-path-containment — 저장 경로 격리

- outDir 밖으로 탈출하는 경로는 거부된다.
- 저장된 본문마다 sha256 과 바이트 수가 기록된다.

## Last Updated

2026-07-30 — OA 본문 확보 정책과 실패 격리 계약을 문서화했다.
