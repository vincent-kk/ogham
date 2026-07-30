## Purpose

`(scope, host, artifact kind)`를 실제 파일 후보 또는 CLI 대상으로 해석한다.
모든 상위 엔진이 공유하는 호스트 대상 매트릭스의 단일 진실 소스다.

## Structure

| Path         | Role                                       |
| ------------ | ------------------------------------------ |
| `index.ts`   | 내부 호환 barrel·패키지 루트 재노출 source |
| `targets.ts` | target 타입과 aggregate 호환 facade        |
| `maps/`      | scope × artifact 목적별 단일 resolver      |
| `types/`     | facade 순환을 막는 target 계약 organ       |

## Conventions

- Codex의 비어 있지 않은 `AGENTS.override.md`가 `AGENTS.md`보다 우선한다.
- project root는 절대 경로, user root는 host state root로만 해석한다.
- 외부 hook은 `@ogham/agent-artifacts` 루트에서 목적별 resolver만 고른다.
- `sideEffects: false` tree-shaking과 emitted byte·output forbidden-pattern
  guard가 선택하지 않은 artifact graph의 hook 번들 기여를 막는다.
- `maps/`는 facade가 아니라 `types/`의 내부 계약을 직접 사용한다.

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

## Dependencies

- 외부 `@ogham/cross-platform` 루트의 path·read 심볼.
