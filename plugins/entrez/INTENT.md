# entrez — NCBI 검색 플러그인

## Purpose

`@ogham/entrez` 패키지 루트. Claude를 NCBI E-utilities(PubMed·PMC·MeSH) "학술 논문 검색 전문가"로 만드는 Claude Code 플러그인. 유일한 책임은 검색 **누락 방지(recall)**. 설계 정본은 [`.metadata/entrez/`](../../.metadata/entrez/).

## Conventions

- 빌드(도메인 스크립트 조합): `clean → version:sync → pages → compile → mcp → compile-plugin`.
- 의존성 단방향: Dispatcher → Agent → Skill → MCP → httpClient → NCBI.
- FCA·1함수1파일·문자열 리터럴 상수화·hook 미사용.

## Boundaries

### Always do

- 빌드 산출물은 생성 명령으로 갱신해 함께 커밋. 모든 outbound 요청에 SSRF allowlist 적용.

### Ask first

- 새 인증 방식 추가, credentials 저장 경로·포맷 변경.

### Never do

- 생성된 배포 산출물 손편집, SSRF guard 우회, `api_key`를 stdout/log 노출, 생성 버전 파일 직접 수정.
