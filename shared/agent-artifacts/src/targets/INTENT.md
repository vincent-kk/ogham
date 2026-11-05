## Purpose

`(scope, host, artifact kind)`를 실제 파일 후보 또는 CLI 대상으로 해석한다.
모든 상위 엔진이 공유하는 호스트 대상 매트릭스의 단일 진실 소스다.

## Conventions

- `targets.ts`는 target 타입과 aggregate resolver의 호환 facade이고, 형제 모듈은 `index.ts`를 진입점으로 사용한다.
- Codex의 비어 있지 않은 `AGENTS.override.md`가 `AGENTS.md`보다 우선한다.
- project root는 절대 경로, user root는 host state root로만 해석한다.
- 외부 hook은 `@ogham/agent-artifacts` 루트에서 목적별 resolver만 고른다.
- `sideEffects: false` tree-shaking과 emitted byte·output forbidden-pattern
  guard가 선택하지 않은 artifact graph의 hook 번들 기여를 막는다.
- 목적별 resolver는 aggregate facade가 아니라 내부 target 타입을 직접 사용해 facade 역참조 순환을 막는다.

## Boundaries

### Always do

- 경로 결합 전에 owner·filename·server name을 검증한다.
- 모든 파일 target을 허용된 root 내부로 제한한다.
- aggregate resolver는 목적별 resolver 결과만 조합한다.

### Ask first

- 대상 매트릭스 또는 유효 지침 후보 우선순위 변경.

### Never do

- 파일 시스템 변경 또는 아티팩트 본문 편집.
- 알 수 없는 host의 target을 추측.
- 목적별 resolver에서 다른 artifact manager를 import.
