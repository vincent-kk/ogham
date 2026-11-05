# insightStats — Contract

## Requirements

- `autoAdjustSensitivity` 는 제안만 반환한다(`adjusted: false`). 설정 파일을 직접 고치지 않는다 — 민감도 변경은 사용자가 볼 수 있는 결정이므로 호출자가 적용을 소유한다.
- `calculatePrecision` 은 순수 함수다. 파일도 시각도 읽지 않는다.
- 설정 파싱은 `InsightConfigSchema` 로 하고 실패 시 기본값으로 폴백한다. Zod 스키마와 수동 가드(`types/insightGuard.ts`)의 필드 집합은 같은 변경에서 함께 맞춘다 — 어긋나면 훅과 MCP 의 판정이 갈라진다.

## API Contracts

민감도 함수는 제안만 반환하며 적용 여부를 소유하지 않는다. 메타 프롬프트는 설정을 전달하고 지식의 의미 중복 판단은 insight 스킬이 소유한다.

## Acceptance Criteria

### AC-capture-policy — Capture routing

- The generated meta-prompt carries the configured category allowlist and routes pre-capture duplicate checks to the insight skill. It keeps novel capture separate from reviewed consolidation and forbids create/update bypass after rejection.
- The function formats configuration without reading or writing vault knowledge; semantic duplicate decisions remain skill-owned.

### AC-suggest-only-sensitivity — 제안 전용

- `autoAdjustSensitivity` 호출 뒤 설정 파일이 바뀌지 않는다.

### AC-precision-pure — 정밀도 순수성

- `calculatePrecision` 이 같은 입력에 같은 값을 낸다.

### AC-guard-schema-parity — 가드·스키마 동기

- 수동 가드와 Zod 스키마의 필드 집합이 일치한다.

## Boundary Exemptions

### `operations` — Hook bundle direct import

- **Consumers**: `**/src/hooks/**`
- **Direct import**: `allowed`
- **Reason**: 훅은 esbuild 번들로 배송되고 이벤트별 크기 가드를 받는다. 배럴을 거치면 재노출 그래프 전체가 번들에 끌려 들어와 가드를 넘긴다 — 배럴은 12개 연산을 재노출하는데 SessionStart 훅은 그중 다섯만 쓴다. 대기 알림과 민감도 판정을 훅이 자체 구현하면 MCP 쪽 통계와 어긋난다.

## Last Updated

민감도 제안·캡처 정책 전달·가드 동기화 계약이 바뀔 때 갱신한다.
