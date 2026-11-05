## Purpose

`@ogham/agent-artifacts`는 Claude Code와 Codex의 규칙 문서, 지침 구간, MCP
등록을 프로젝트/사용자 범위별로 계획하고 적용하는 내부 워크스페이스다.
호스트별 대상 선택과 소유권 정책을 담당하고, 시스템 호출은
`@ogham/cross-platform`에 위임한다.

## Structure

패키지 루트와 소스 루트는 다르다. package export는 소스 진입점을 빌드한 결과를 가리키므로, 루트에 소스 구현을 추가하지 않는다.

## Conventions

- `smol-toml`은 Codex 프로젝트 TOML 검증에만 사용하며 전체 문서 재직렬화를 피한다.

- 판단 우선순위: 1. 사용자 콘텐츠 보존 2. 소유권 격리 3. 호스트 호환성.
- 소비자는 `@ogham/agent-artifacts` 패키지 루트만 사용한다.
- 프로젝트와 사용자 범위는 서로 다른 생성자 타입으로 구분한다.
- package-root module-entry 검사는 실제 `src/index.ts` 배치를 명시적으로 예외 처리한다.

## Boundaries

### Always do

- 경로·파일 시스템·CLI 작업을 `@ogham/cross-platform`에 위임한다.
- 변경 전에 대상 리비전을 확인하고 소유 아티팩트만 수정한다.

### Ask first

- 공개 action/result 어휘, 대상 매트릭스, 소유 마커 형식 변경.
- Claude Code/Codex 외 호스트 지원 추가.

### Never do

- 프로덕션 소스에서 `node:fs`, `node:path`, `node:os`, `node:child_process` 사용.
- 알 수 없는 호스트를 Claude로 암묵 매핑하거나 사용자 범위에 출력 경로 노출.
