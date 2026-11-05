# dialogueConfig — Contract

## Requirements

- 설정 파싱은 수동 가드(`dialogueConfigGuard`)로 한다. SessionStart 훅 번들이 이 모듈을 직접 가져가므로 Zod 런타임이 들어오면 크기 가드를 넘긴다. Zod 스키마를 고치면 같은 변경에서 수동 가드도 맞춘다 — 둘이 어긋나면 훅과 MCP 의 판정이 갈라진다.
- 파싱 실패는 `DEFAULT_DIALOGUE_CONFIG` 로 폴백한다. 설정 하나가 세션 시작을 막지 않는다.
- env `MAENCOF_DISABLE_DIALOGUE === "1"` 이 config 보다 먼저 평가된다 — 사용자가 파일을 고치지 않고 한 세션만 끌 수 있어야 하기 때문이다.
- 알 수 없는 키는 정규화에서 무시한다. 은퇴한 필드가 남은 파일도 계속 읽힌다.
- meta-skill 본문을 알거나 가공하지 않는다. 여기는 on/off 판정만 소유하고 문서는 호출자가 다룬다.

## API Contracts

환경변수 off-switch는 파일을 수정하지 않고 한 세션만 주입을 끄는 경로다. 설정 손상은 기본값으로 폴백하며 meta-skill 본문의 소유권은 호출자에게 남긴다.

## Acceptance Criteria

### AC-env-precedence — env 우선

- env off-switch 가 config 의 `injection.enabled` 보다 먼저 평가된다.

### AC-guard-schema-parity — 가드·스키마 동기

- 수동 가드와 Zod 스키마의 필드 집합이 일치한다.

### AC-config-fallback — 폴백

- 파싱 불가 설정에서 기본값으로 동작한다.

## Boundary Exemptions

### `operations` — Hook bundle direct import

- **Consumers**: `**/src/hooks/**`
- **Direct import**: `allowed`
- **Reason**: 훅은 esbuild 번들로 배송되고 이벤트별 크기 가드를 받는다. 배럴을 거치면 재노출 그래프 전체가 번들에 끌려 들어와 가드를 넘긴다 — 배럴 경유는 선택지가 아니라 빌드 실패다. off-switch 판정을 SessionStart 훅이 자체 구현하면 env 우선순위가 두 곳에서 갈라진다.

## Last Updated

off-switch 우선순위·가드 동기화·설정 폴백 정책이 바뀔 때 갱신한다.
