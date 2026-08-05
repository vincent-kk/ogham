# manifestValidator — Contract

## Requirements

- 매니페스트 로드는 `manifestParser` 의 `loadManifest` 에만 의존한다. 파일명 조립과 Zod 파싱을 여기서 다시 구현하지 않는다.
- 로드 실패(파일 부재·JSON 오류·스키마 불일치)는 예외로 새어 나가지 않는다. `valid: false` 와 `Schema validation failed: <원인>` error 한 건으로 환원하고, 그 뒤 무결성 검사는 수행하지 않는다 — 로드되지 않은 매니페스트에는 검사할 참조가 없다.
- `valid` 는 `errors` 가 비었는지만 본다. `warnings` 는 결과를 뒤집지 못한다 — 경고는 계약 위반이 아니라 사람이 판단할 신호다.
- 읽기 전용이다. 입력 매니페스트를 변형하지 않고 파일을 쓰지 않는다.

## API Contracts

```typescript
export function validateManifest(
  runDir: string,
  type: 'stories' | 'estimation',
): Promise<ValidationResult>;

interface ValidationResult {
  valid: boolean; // errors.length === 0
  errors: string[];
  warnings: string[];
}
```

배럴은 `validateManifest` 하나만 노출한다. `ValidationResult` 는 반환값의 형태로만 관측된다.

### stories

- error — story `id` 중복, `links[].from` 이 미지의 story ID, `links[].to` 원소가 미지의 story ID.
- warning — `split_into` 원소가 미지의 ID, `split_from`(non-null)이 미지의 ID.

### estimation

- error — unit `id` 중복, `units[].deps` 가 미지의 unit ID 참조, `schedule.tracks[].units` 가 미지의 unit 참조, 한 unit 이 둘 이상의 track 에 배치, `rollup.confidence_interval` 하한이 상한 초과.
- warning — `schedule.milestones[].week` 가 `total_weeks` 초과, `risks[].unit` 이 미지의 unit 참조.

## Acceptance Criteria

### AC-load-failure-is-a-result — 로드 실패는 결과다

- 매니페스트 파일이 없거나 스키마를 벗어나면 throw 대신 `{ valid: false, errors: ['Schema validation failed: …'], warnings: [] }` 를 반환한다.
- 이 경로에서는 타입별 무결성 검사가 실행되지 않는다 — `errors` 는 정확히 한 건이다.

### AC-warning-keeps-valid — 경고는 유효성을 뒤집지 않는다

- `warnings` 만 발생한 매니페스트는 `valid: true` 다.

### AC-reference-integrity — 참조 무결성

- ID 중복과 끊어진 참조(links·deps·tracks)가 각각 별도 `errors` 항목으로 열거된다 — 첫 위반에서 멈추지 않는다.

### AC-schedule-consistency — 일정 정합성

- estimation 에서 한 unit 이 두 track 에 배치되면 error, 마일스톤이 일정 지평을 벗어나면 warning 이다.

## History

- 2026-08-05 — v2: devplan·implement-plan 검증 제거, estimation 검증 신설. 근거는 `.metadata/imbas/spec.md` §4.

## Last Updated

2026-08-05 — 검증 타입을 stories·estimation 2종으로 재정의했다.
