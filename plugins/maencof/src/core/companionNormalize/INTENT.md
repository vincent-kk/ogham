# companionNormalize

## Purpose

companion-identity raw JSON을 v2 최소 형태(`CompanionIdentityV2Minimal`)로 정규화하는 Zod-free 커널. v1(고정 8필드)·v2·부분 파일을 모두 수용한다. 렌더 경로(turnContext), 파일 마이그레이션(companionMigration), 편집 도구(companionEdit)가 v1→v2 매핑을 공유하는 단일 진실 원천이라 core LCA에 둔다.

## Boundaries

### Always do

- Zod를 import하지 않는다 (hook 번들 크기 보전 — turnContext 렌더러가 소비)
- name·greeting 부재 시 null 반환 (graceful)
- v1 필드 매핑은 companion-identity-v2 설계 §7-2와 동일하게 유지

### Ask first

- v1→v2 매핑 규칙(key·inject·salience) 변경
- 반환 형태(`CompanionIdentityV2Minimal`) 변경

### Never do

- 파일 I/O 수행 (순수 변환만; I/O는 호출자)
- mcp/ · hooks/ 직접 의존
