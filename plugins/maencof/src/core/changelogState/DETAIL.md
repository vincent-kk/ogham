# changelogState — Contract

## Requirements

- 정규화는 Zod 없이 수동으로 한다. SessionStart 훅 번들이 이 모듈을 직접 가져가므로 Zod 런타임이 들어오면 크기 가드를 넘긴다.
- 손상된 상태 파일은 빈 상태로 폴백한다 — 기록 부채 하나가 세션 시작을 막지 않는다.
- 알 수 없는 키는 무시한다. 은퇴한 필드가 남아 있어도 read 가 실패하지 않는다.
- git 을 호출하지 않는다. 변경 감지는 호출자(훅) 소관이고 여기는 보관만 한다.

## API Contracts

상태 기록 주체는 MCP bootSweep의 changelogDebt와 changelog 스킬이다. 감지와 보관을 분리하며 손상 상태로 세션 시작을 막지 않는다.

## Acceptance Criteria

### AC-zod-free-normalize — Zod 없는 정규화

- 이 fractal 의 어떤 파일도 zod 를 import 하지 않는다.

## Boundary Exemptions

### `operations` — Hook bundle direct import

- **Consumers**: `**/src/hooks/**`
- **Direct import**: `allowed`
- **Reason**: 훅은 esbuild 번들로 배송되고 이벤트별 크기 가드를 받는다. 배럴을 거치면 재노출 그래프 전체가 번들에 끌려 들어와 가드를 넘긴다 — 배럴 경유는 선택지가 아니라 빌드 실패다. 이 모듈이 Zod 없이 정규화하는 이유도 같은 제약이며, 상태 스키마를 훅과 MCP 가 공유해야 하므로 훅 쪽 복제는 답이 아니다.

## Last Updated

기록 부채 보관·수동 정규화·감지와의 소유권이 바뀔 때 갱신한다.
