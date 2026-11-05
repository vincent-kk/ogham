# preToolUse — PreToolUse 오케스트레이터

## Purpose

PreToolUse 이벤트에서 하나의 물리 도구 호출을 논리 operation으로 정규화하고, 방문 전달·문서 gate·구조 가드를 보수적으로 조합한다. 비-FCA 프로젝트에는 개입하지 않으며 branch mode와 criteria ledger는 권한 판정에 사용하지 않는다.

## Conventions

- 완전한 물리 patch만 논리 operation으로 정규화하여 입력 순서대로 처리한다. 유효 prefix만 실행하면 호출 전체에 대한 검증이 깨진다.
- 방문 전달은 permission과 독립적이다. 포인터 전달·cache 실패가 문서 gate나 구조 가드를 생략하게 해서는 안 된다.
- 모든 operation 결과를 deny-wins로 합친다. 앞선 deny에서도 후속 검사를 계속해 한 번의 재시도에 필요한 근거를 보존한다.
- 문서 판정은 host의 물리 target을 따른다. Move source는 exact projection 또는 보수적 import superset의 근거이며 destination의 이전 내용은 DETAIL 검증에서만 best-effort로 읽는다.
- entry는 host 입출력만 소유하고 PreToolUse 판단을 별도 구현하지 않는다.

## Boundaries

### Always do

- Codex Move destination은 exact hunk projection이면 전체 내용을 검증한다. ambiguous/stale projection의 계약 문서는 exact content를 요구해 거부하고, 일반 파일은 source와 모든 추가 line의 superset으로 구조 위험을 검사하며, source가 없거나 앞선 section이 canonical 동일 경로를 touch했으면 거부한다.
- `validateCwd` 실패 시 즉시 `{ continue: true }` 반환
- Write/Edit는 host의 물리 target으로 문서를 판정하고, DETAIL.md의 기존 content를 같은 target에서 먼저 읽어 old 인자로 전달
- Delete도 mutation 방문을 거치게 하고 INTENT.md 삭제 보호와 DETAIL.md 선택 문서 안내 적용
- 미해석 `apply_patch`는 FCA 프로젝트에서 parser reason과 유효한 V4A 재발행 안내로 deny하고 비-FCA 프로젝트에서는 그대로 허용
- branch 이름과 무관하게 동일한 방문·문서 gate를 적용

### Ask first

- 실행 순서 재배치 (intent 주입이 항상 최우선)
- batch 집계, 파싱 실패 또는 보호 문서 삭제 정책 변경
- hook permission scope에 새 문서나 branch mode 추가

### Never do

- 오케스트레이터에 검증·가드 로직을 인라인 (하위 모듈 호출만 유지)
- 앞선 deny에서 batch를 중단하거나 validator·구조 가드의 `deny` 결정을 무시
- 불완전한 patch prefix만 실행하거나 branch 이름으로 면제
- criteria ledger를 hook 전용 deny 또는 audit 대상으로 취급
