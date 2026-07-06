# companionNormalize

## Purpose

companion-identity raw JSON을 정본 최소 형태(`CompanionIdentityMinimal`)로 정규화하는 Zod-free 커널. 레거시(v1, 고정 8필드)·정본·부분 파일을 모두 수용한다. 렌더 경로(turnContext), 파일 마이그레이션(companionMigration), 편집 도구(companionEdit)가 레거시→정본 매핑을 공유하는 단일 진실 원천이라 core LCA에 둔다.

## Boundaries

### Always do

- Zod를 import하지 않는다 (hook 번들 크기 보전 — turnContext 렌더러가 소비)
- name·greeting 부재 시 null 반환 (graceful)
- 코어는 name·greeting만; v1 필드(role·personality·principles·taboos·origin)는 균일 section으로 매핑
- role이 코어였던 과도기 정본 파일은 role을 section으로 승격 (전환 안전, 중복 방지)

### Ask first

- 레거시→정본 매핑 규칙(key·inject·salience) 변경
- 반환 형태(`CompanionIdentityMinimal`) 변경

### Never do

- 파일 I/O 수행 (순수 변환만; I/O는 호출자)
- mcp/ · hooks/ 직접 의존
