# insightInjector — DETAIL

## Requirements

- UserPromptSubmit 이벤트마다 auto-insight 캡처 시스템의 상태 배너(`<auto-insight …/>`)를 생성해 Claude 에게 노출한다.
- enabled 플래그와 세션당 최대 캡처 수(max) 설정을 준수하며, max 에 도달한 세션에서는 `status="limit-reached"` 배너를 발행한다.
- **이 훅은 캡처 자체를 수행하지 않는다.** `category_filter` 의 실제 차단은 capture-time 에 `capture_insight` MCP 도구에서 일어난다. 인젝터는 `allowed-categories` 목록을 배너로 표면화할 뿐이다.

## API Contracts

배너는 허용 카테고리를 알리는 표면이며 실제 필터 집행은 capture-time MCP 도구가 맡는다. top-level message·hookMessage는 호스트가 지원하지 않으므로 쓰지 않는다.

인젝터는 pending 통지 파일에 접근하지 않는다. capture가 append한 통지는 다음 SessionStart의 bootstrap만 읽고 삭제하며 소비 전 크래시에는 디스크에 남는다. TTL 없이 한 번 소비하고 정리하는 책임을 분리해 두 소비자의 경합을 막는다.

## Acceptance Criteria

### AC-no-pending-file-access — pending 파일 무접근

- 이 fractal 이 `pending-insight-notification.json` 을 읽지도 쓰지도 지우지도 않는다.

## Boundary Exemptions

### `insightInjector.ts` — Hook bundle direct import

- **Consumers**: `**/src/hooks/**`
- **Direct import**: `allowed`
- **Reason**: 훅은 esbuild 번들로 배송되고 이벤트별 크기 가드를 받는다. UserPromptSubmit orchestrator 가 이 파일을 직접 가져오는 것이 설계된 형태이고, 배럴 경유는 43008 바이트 캡을 잠식한다.

## Last Updated

상태 배너의 카테고리 안내, capture-time 집행 분리 또는 pending 통지 소비 소유권이 바뀔 때 갱신한다.
