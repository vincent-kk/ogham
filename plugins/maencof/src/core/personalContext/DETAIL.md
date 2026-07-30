# personalContext — Contract

## Requirements

- 훅 도달 파일(normalize·read·write·render·prune·evict)은 zod-free 이고 Node builtin 만 쓴다. SessionStart 번들에 들어가므로 런타임 의존이 하나 늘면 크기 가드를 넘긴다.
- 필드 길이·형식 검증은 MCP 입력 스키마(`capture_personal_context`)가 소유한다. 여기서는 구조 정규화와 수명주기 규칙만 다룬다.
- `id` 는 `sanitizeSegment(label)` 로만 만든다 — dedup 키가 결정적이어야 재강화가 같은 항목을 찾는다.
- 수치 정책(캡·TTL·보존 기간)은 `constants/personalContext.ts` 에서만 가져온다.
- 렌더에 런타임 컷을 두지 않는다. 예산은 저작 게이트가 통제한다.
- 캡처·해소를 표면화하는 배너나 통지를 만들지 않는다 — 은닉이 이 층의 계약이다.

## API Contracts

- `personalContextPath(cwd)` — envelope 파일 경로.
- `readPersonalContext(cwd)` · `writePersonalContext(cwd, envelope)` — envelope IO.
- `defaultPersonalContext()` — 빈 envelope.
- `normalizePersonalContext(raw)` — zod-free graceful 정규화.
- `renderPersonalContextBlock(envelope)` — SessionStart `<personal-context>` 블록. 만료 항목은 렌더 시점 lazy-filter 로 빠진다.
- `prunePersonalContext(envelope)` — 세션 경계 정리(만료 제거·due 자동 resolve·보존 캡). `PersonalContextPruneResult`.
- `evictTopicsOverCap(envelope)` — topics 보존 캡 집행. resolved 우선. `TopicEvictionResult`.
- `applyPersonalContextMutation(...)` — MCP 캡처/재강화/해소 upsert. 훅 번들에 들어가지 않는 유일한 공개 함수다.

## Acceptance Criteria

### AC-hook-path-zod-free — 훅 경로 zod-free

- 훅이 도달하는 파일에서 zod import 가 0건이다.

### AC-lazy-expiry-render — 만료 lazy-filter

- 만료된 항목이 렌더 결과에 나타나지 않는다(파일은 그대로).

### AC-deterministic-id — 결정적 id

- 같은 label 이 같은 `id` 로 정규화된다.

## Boundary Exemptions

### `readPersonalContext.ts` — Hook bundle direct import

- **Consumers**: `**/src/hooks/**`
- **Direct import**: `allowed`
- **Reason**: 훅은 esbuild 번들로 배송되고 이벤트별 크기 가드를 받는다. 배럴을 거치면 `applyPersonalContextMutation` 을 포함한 재노출 그래프 전체가 번들에 끌려 들어오는데, 그 함수는 MCP 전용이라 훅에 들어갈 이유가 없다.

### `renderPersonalContextBlock.ts` — Hook bundle direct import

- **Consumers**: `**/src/hooks/**`
- **Direct import**: `allowed`
- **Reason**: 위와 같다. SessionStart 가 블록을 렌더하려면 이 파일만 필요하고, 배럴 경유는 mutation 경로까지 번들에 넣어 가드를 넘긴다.

## Last Updated

2026-07-30 — zod-free 훅 경로·수명주기 계약과 훅 직접 import 면책을 문서화했다.
