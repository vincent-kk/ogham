# preToolUse — PreToolUse 오케스트레이터

## Purpose

PreToolUse 이벤트에서 하나의 물리 도구 호출을 논리 operation으로 정규화하고, 방문 전달·문서 gate·구조 가드를 보수적으로 조합한다. 비-FCA 프로젝트에는 개입하지 않으며 branch mode와 criteria ledger는 권한 판정에 사용하지 않는다.

## Conventions

- hook entry는 shared normalizer의 판별 결과를 batch orchestrator에 넘기고, 완전한 `apply_patch`의 모든 operation을 입력 순서대로 처리한다.
- operation 내부 순서: `validateCwd` → `isFcaProject` → `processVisit` → Write/Edit/Delete이면 문서 gate → Write/Edit이면 구조 가드.
- 방문 deny는 해당 operation의 문서 gate와 구조 가드를 중단하지만 batch loop는 중단하지 않는다.
- destination의 기존 content는 DETAIL.md 검증에만 best-effort로 읽는다. Move source는 exact projection에 사용하고, 일반 파일의 inexact 결과는 import superset을 만들기 위해 재확인한다.
- 모든 operation 결과는 deny-wins로 병합하며 reason과 non-empty context는 입력 순서를 보존한다.
- 결과 이벤트명은 `'PreToolUse'` 고정이고 entry에는 비즈니스 로직을 두지 않는다.

## Boundaries

### Always do

- Codex Move destination은 exact hunk projection이면 전체 내용을 검증한다. ambiguous/stale projection의 계약 문서는 exact content를 요구해 거부하고, 일반 파일은 source와 모든 추가 line의 superset으로 구조 위험을 검사하며, source가 없거나 앞선 section이 canonical 동일 경로를 touch했으면 거부한다.

- `validateCwd` 실패 시 즉시 `{ continue: true }` 반환
- DETAIL.md 편집 시 기존 content를 먼저 읽어 old 인자로 전달
- Delete도 mutation 방문을 거치게 하고 host가 INTENT.md/DETAIL.md와 같은 대상으로 해석하는 삭제는 명시적으로 deny
- 미해석 `apply_patch`는 FCA 프로젝트에서 parser reason과 유효한 V4A 재발행 안내로 deny하고 비-FCA 프로젝트에서는 그대로 허용
- branch 이름과 무관하게 동일한 방문·문서 gate를 적용

### Ask first

- 실행 순서 재배치 (intent 주입이 항상 최우선)
- batch 집계, 파싱 실패 또는 보호 문서 삭제 정책 변경
- hook permission scope에 새 문서나 branch mode 추가

### Never do

- 오케스트레이터에 검증·가드 로직을 인라인 (하위 모듈 호출만 유지)
- 앞선 deny에서 batch를 중단하거나 어느 operation의 `deny` 결정을 무시
- 불완전한 patch prefix만 실행하거나 branch 이름으로 면제
- criteria ledger를 hook 전용 deny 또는 audit 대상으로 취급
