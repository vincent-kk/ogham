# maencofCaptureInsight — DETAIL

## Requirements

- `capture_insight` MCP 도구는 auto-insight 레코드를 벌트에 영속화하기 **이전에** `config.category_filter` 를 반드시 적용한다. 금지된 카테고리에 대한 호출은 파일 쓰기 없이 즉시 거절된다.
- Users toggle `.maencof-meta/insight-config.json::category_filter.<key>` through the `insight` skill's `--category <key> --accept|--reject` options.
- `insightInjector` 훅은 이 필터에 대한 표면 배너를 노출할 뿐이며 실제 차단은 이 MCP 도구의 책임이다. 따라서 이 파일의 enforcement 로직이 바뀌면 `insightInjector` 의 배너 문구도 동기화해야 한다.
- 레이어 라우팅: `layer: 2`(내재화된 인사이트/원리)는 vault-relative `02_Derived` 런타임 루트에, `layer: 5`(미분류 단편)는 `buffer_type: 'conversation'` 으로 위임되어 vault-relative `05_Context` 런타임 루트에 생성된다. 두 이름은 저장소 경로가 아니며 `vaultPath` 가 위치를 정한다. L5 는 서브레이어를 갖지 않는다.

## API Contracts

### Layer routing contract

- 입력 `layer`는 `2 | 5`만 허용한다 (Zod literal union).
- `layer === 5`이면 `handleMaencofCreate` 위임 시 `buffer_type: 'conversation'` 을 함께 전달한다. `layer === 2`는 buffer 필드 없이 위임한다. 어느 쪽도 `sub_layer` 를 전달하지 않는다 — L5 는 서브레이어를 갖지 않고, L2 는 서브레이어 대상이 아니다.

### Rejection contract (category_filter)

`maencofCaptureInsight.ts` 의 거절 로직은 다음 응답을 반환한다:

```ts
{
  success: false,
  path: '',
  message: `Category "${category}" is rejected by config.category_filter. Use the insight skill with --category ${flag} --accept to allow.`,
}
```

- 조건: `config.category_filter[category] === false` (기본값: `refuted_premise`, `ephemeral_candidate` 이 false).
- 거절 시 `handleMaencofCreate` 는 호출되지 않으며 `pending-insight-notification.json` 에 어떠한 엔트리도 추가되지 않는다.

### Category enum

- `principle` — 장기 보존 가치의 원리/전제 (기본 accept).
- `refuted_premise` — Socratic Phase 2.5.b 에서 반박된 전제 (기본 reject).
- `ephemeral_candidate` — ToT 폐기 후보, 중간 산출물 (기본 reject).

### Enforcement sites (grep guard)

`rg -n 'category_filter\[' plugins/maencof/src/` 결과는 정확히 1 개의 enforcement site (`maencofCaptureInsight.ts`) 만 반환해야 한다. 이 수가 증가하면 다중 enforcement 로 인한 문서/코드 drift 가능성이 있으므로 DETAIL.md 와 SKILL.md 둘 다 업데이트할 것.

## Acceptance Criteria

### AC-filter-blocks-before-write — 쓰기 이전 차단

- `config.category_filter[category] === false` 인 호출은 `handleMaencofCreate` 를 호출하지 않고, 벌트 파일도 `pending-insight-notification.json` 엔트리도 만들지 않은 채 `success: false` 로 끝난다.

### AC-l5-routes-to-flat-buffer — L5 평면 배치

- `layer: 5` 위임은 `buffer_type: 'conversation'` 을 전달하고 `sub_layer` 를 전달하지 않아, 문서가 vault-relative `05_Context` 런타임 루트에 생성된다. `layer: 2` 위임은 buffer 필드 없이 vault-relative `02_Derived` 런타임 루트로 간다.

### AC-single-enforcement-site — 단일 집행 지점

- `category_filter` 를 읽어 차단을 수행하는 지점이 `maencofCaptureInsight.ts` 하나뿐이다.

## History

- 2026-08-04 — L5 재정의로 임시 수용소가 서브레이어 위임을 버리고 평면 배치가 되면서, 위임 필드가 `sub_layer: 'buffer'` 에서 `buffer_type: 'conversation'` 으로 바뀌었다.

## Last Updated

2026-08-28 — L2·L5 목적지가 `vaultPath` 아래의 런타임 디렉터리이며 저장소 경로가 아님을 명확히 했다.
