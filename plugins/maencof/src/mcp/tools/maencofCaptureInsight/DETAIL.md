# maencofCaptureInsight — DETAIL

## Requirements

- `capture_insight` MCP 도구는 auto-insight 레코드를 벌트에 영속화하기 **이전에** `config.category_filter` 를 반드시 적용한다. 금지된 카테고리에 대한 호출은 파일 쓰기 없이 즉시 거절된다.
- 사용자는 `/maencof:insight --category <key> --accept|--reject` 를 통해 `.maencof-meta/insight-config.json::category_filter.<key>` 를 토글할 수 있다.
- `insightInjector` 훅은 이 필터에 대한 표면 배너를 노출할 뿐이며 실제 차단은 이 MCP 도구의 책임이다. 따라서 이 파일의 enforcement 로직이 바뀌면 `insightInjector` 의 배너 문구도 동기화해야 한다.
- 레이어 라우팅: `layer: 2`(내재화된 인사이트/원리)는 `02_Derived/` 루트에, `layer: 5`(미분류 단편)는 반드시 `sub_layer: 'buffer'`로 위임되어 `05_Context/buffer/`에 생성된다. L5 캡처가 `05_Context/` 루트에 떨어지면 organize/cleanup의 buffer 스캔에서 누락되는 고아 문서가 되므로 금지.

## API Contracts

### Layer routing contract

- 입력 `layer`는 `2 | 5`만 허용한다 (Zod literal union).
- `layer === 5`이면 `handleMaencofCreate` 위임 시 `sub_layer: 'buffer'`를 함께 전달한다. `layer === 2`는 `sub_layer` 없이 위임한다.

### Rejection contract (category_filter)

`maencofCaptureInsight.ts` 의 거절 로직은 다음 응답을 반환한다:

```ts
{
  success: false,
  path: '',
  message: `Category "${category}" is rejected by config.category_filter. Use /maencof:insight --category ${flag} --accept to allow.`,
}
```

- 조건: `config.category_filter[category] === false` (기본값: `refuted_premise`, `ephemeral_candidate` 이 false).
- 거절 시 `handleMaencofCreate` 는 호출되지 않으며 `pending-insight-notification.json` 에 어떠한 엔트리도 추가되지 않는다.

### Category enum

- `principle` — 장기 보존 가치의 원리/전제 (기본 accept).
- `refuted_premise` — Socratic Phase 2.5.b 에서 반박된 전제 (기본 reject).
- `ephemeral_candidate` — ToT 폐기 후보, 중간 산출물 (기본 reject).

### Enforcement sites (grep guard)

`rg -n 'category_filter\[' plugins/maencof/src/` 결과는 정확히 1 개의 enforcement site
(`maencofCaptureInsight.ts`) 만 반환해야 한다. 이 수가 증가하면 다중 enforcement 로 인한
문서/코드 drift 가능성이 있으므로 DETAIL.md 와 SKILL.md 둘 다 업데이트할 것.
