# project_setup rules actions — Filid 1.0 Contract

## Requirements

- `project_setup`의 `rules-status`, `rules-manifest`, `rules-sync`에서 매핑된 status, manifest, sync만 지원하고 setup workflow의 managed rule 문서만 다룬다.
- required rule은 항상 배포하고 optional drift overwrite는 명시된 resync만 허용한다.
- project source와 config를 수정하지 않는다.
- 배포 레이어는 project 고정이다. 이 도구는 headless/CI fallback이라 사용자가 레이어를 고른 적이 없고, 레이어를 가정한 sync가 반대편의 전역 규칙을 회수하면 안 된다. 레이어 선택은 설정 페이지 저장 경로만 내린다.
- 결과는 공통 envelope에서 action별 작은 summary와 필요 시 data로 반환한다.
- plugin root를 해석하지 못한 status/manifest는 성공으로 오인하지 않도록 안정된 diagnostic과 `unsupported` status를 반환한다.

## API Contracts

- Input: `{ action, path, selections?, resync? }`.
- defensive string/null 입력 정규화는 기존 setup 호환을 위해 유지한다.
- manifest data는 `pluginRootResolved`를 명시해 일반 skipped 항목과 host resolution 실패를 구분한다.
- status/manifest 상세는 envelope data이며 예산 초과 시 artifact로 이동한다.
- sync summary는 created/updated/removed/skipped/drift 수를 노출한다.
- action discriminant와 diagnostic code/message는 constants의 canonical 값을 사용한다.

## Acceptance Criteria

### AC-rule-docs-managed — Manifest boundary

- manifest에 없는 파일을 배포하지 않고 required rule을 누락하지 않는다.
- 선택적 drift는 resync 승인 없이 덮어쓰지 않는다.

### AC-rule-docs-envelope — Bounded result

- action과 핵심 count는 artifact 유무와 관계없이 summary에 남는다.
- plugin root 미해석 status/manifest는 empty diagnostics의 `ok`가 아니다.

## History

- 2026-09-05 — 기존 payload를 유지한 채 `project_setup`의 세 rules action 뒤 child 계약으로 이동했다.
- 2026-07-27 — plugin root 미해석 상태의 unsupported envelope 계약을 추가.

## Last Updated

2026-09-05
