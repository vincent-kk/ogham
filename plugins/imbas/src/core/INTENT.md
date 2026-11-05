# core

## Purpose

imbas 파이프라인의 비즈니스 로직 계층. .imbas/ 디렉토리의 상태·설정·매니페스트를 관리.

## Conventions

provider 실행은 스킬 계층이 소유한다. core가 트래커 I/O를 도입해 파일·스키마 계약과 결합하지 않는다.

## Boundaries

### Always do

- 상태·매니페스트 JSON은 lib/fileIo, 설정 계층 I/O는 cross-platform을 경유하여 원자적 쓰기와 계층 해석을 각각 한 곳에서 보장한다. 실행 ID 발급에 필요한 디렉터리 생성·조회는 직접 수행할 수 있다.
- 상태 전이는 skills/\*/references/state-transitions.md 규칙 준수

### Ask first

- 전이 규칙 변경

### Never do

- 직접 fs.writeFileSync 호출 (atomic write 우회)
- Jira API 직접 호출 (provider 실행은 스킬 계층의 몫)
