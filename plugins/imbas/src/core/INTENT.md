# core

## Purpose

imbas 파이프라인의 비즈니스 로직 계층. .imbas/ 디렉토리의 상태·설정·매니페스트를 관리.

## Conventions

provider 실행은 스킬 계층이 소유한다. core가 트래커 I/O를 도입해 파일·스키마 계약과 결합하지 않는다.

## Boundaries

### Always do

- 모든 파일 I/O는 lib/fileIo.ts 경유
- 상태 전이는 skills/\*/references/state-transitions.md 규칙 준수

### Ask first

- 전이 규칙 변경

### Never do

- 직접 fs.writeFileSync 호출 (atomic write 우회)
- Jira API 직접 호출 (provider 실행은 스킬 계층의 몫)
