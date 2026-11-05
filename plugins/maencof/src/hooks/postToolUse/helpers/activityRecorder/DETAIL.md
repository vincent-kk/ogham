# activityRecorder — DETAIL

## Requirements

- 활동 로그는 append-only 기록이다. 기존 라인을 수정하거나 덮어쓰지 않는다.
- 자체 관리 경로의 write는 기록하지 않는다. 로그 append가 다시 write를 유발해 자기참조 기록이 무한히 늘어나는 것을 막는 제외 정책이다.
- 비볼트·미매핑 도구·오류는 세션 진행을 막지 않으며 오류는 로그로 격리한다.

## API Contracts

자기참조 제외 prefix는 `02_Derived/changelog/`, `02_Derived/dailynotes/`, `.maencof/`, `.maencof-meta/`다. 모두 maencof 자체 관리 write이므로 활동 이벤트로 다시 기록하지 않는다.

kg_build는 내부 유지보수라 기록하면 실제 지식 활동 대비 잡음이 커진다. context_cache_manage의 pin·unpin·refresh는 휘발성 캐시 작업이므로 기록하지 않는다. kg_build의 카테고리 매핑은 향후 opt-in 대비이며 기록 허가는 아니다.

기록 도구를 넓힐 때는 카테고리 매핑과 PostToolUse의 도구 allowlist를 함께 맞춘다. 매핑만 추가해도 기록이 허용되는 것은 아니다. 오류는 errorLog에 남기고 항상 continue:true로 회복한다.

## Acceptance Criteria

### AC-self-reference-excluded — 자기참조 제외

- 위 exclusion prefix 로 시작하는 경로가 활동 로그에 기록되지 않는다.

### AC-append-only — 덧붙이기 전용

- 기존 활동 로그 라인이 수정되거나 덮어써지지 않는다.

### AC-always-continue — 항상 통과

- 볼트 아님·미매핑 도구·오류 어느 경로에서도 `{ continue: true }` 를 반환한다.

## Boundary Exemptions

### `activityRecorder.ts` — Hook bundle direct import

- **Consumers**: `**/src/hooks/**`
- **Direct import**: `allowed`
- **Reason**: 훅은 esbuild 번들로 배송되고 이벤트별 크기 가드를 받는다. PostToolUse orchestrator 가 이 관심사를 직접 가져오며, 그 번들의 캡은 12288 바이트라 배럴 경유의 여유가 없다.

## Last Updated

append-only 기록, 자기참조 제외 경로 또는 기록 도구의 허용 범위가 바뀔 때 갱신한다.
