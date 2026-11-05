# maencofCaptureInsight — DETAIL

## Requirements

- `capture_insight` MCP 도구는 auto-insight 레코드를 벌트에 영속화하기 **이전에** `config.category_filter` 를 반드시 적용한다. 금지된 카테고리에 대한 호출은 파일 쓰기 없이 즉시 거절된다.
- Users toggle `.maencof-meta/insight-config.json::category_filter.<key>` through the `insight` skill's `--category <key> --accept|--reject` options.
- `insightInjector` 훅은 이 필터에 대한 표면 배너를 노출할 뿐이며 실제 차단은 이 MCP 도구의 책임이다. 따라서 이 파일의 enforcement 로직이 바뀌면 `insightInjector` 의 배너 문구도 동기화해야 한다.
- 레이어 라우팅: `layer: 2`(내재화된 인사이트/원리)는 vault-relative `02_Derived` 런타임 루트에, `layer: 5`(미분류 단편)는 `buffer_type: 'conversation'` 으로 위임되어 vault-relative `05_Context` 런타임 루트에 생성된다. 두 이름은 저장소 경로가 아니며 `vaultPath` 가 위치를 정한다. L5 는 서브레이어를 갖지 않는다.

## API Contracts

카테고리 거절은 create 위임과 pending 통지 쓰기보다 앞서야 한다. 훅 배너는 이 정책을 표시할 뿐 집행 주체가 아니므로 enforcement 변경 시 배너 문구도 함께 맞춘다.

L5는 평면 buffer이고 L2는 서브레이어 대상이 아니므로 어느 라우팅도 sub_layer를 전달하지 않는다. 목적지 이름은 저장소 경로가 아니라 vaultPath 아래의 런타임 레이어 루트다.

차단 지점은 이 핸들러 하나여야 한다. 집행 지점을 늘리면 문서와 코드가 갈라질 수 있으므로 모듈 계약과 소비 스킬의 정책을 함께 재검토한다.

## Acceptance Criteria

### AC-single-enforcement-site — 단일 집행 지점

- `category_filter` 를 읽어 차단을 수행하는 지점이 `maencofCaptureInsight.ts` 하나뿐이다.

## Last Updated

저장 전 카테고리 차단, 훅 배너와의 책임 분리 또는 L2·L5 라우팅 계약이 바뀔 때 갱신한다.
