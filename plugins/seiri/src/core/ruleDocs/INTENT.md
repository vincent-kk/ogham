# ruleDocs — 호스트별 규칙 문서 배포

## Purpose

`templates/rules/*.md` 를 호출자가 고른 레이어의 호스트 채널과 조정한다. `project`(기본값)는 저장소 채널, `user` 는 호스트 상태 루트다. Claude 는 `RULES_DIR` 디렉터리 파일, Codex 는 유효한 `AGENTS*.md` 의 소유 섹션을 사용한다. 배포 상태의 진실은 파일시스템이며 config 에 미러링하지 않는다.

## Structure

훅은 번들 크기 가드 때문에 배럴 대신 필요한 concrete 파일을 직접 import한다. `resolveRulesDir`는 호환 전용이다.

## Conventions

- `@ogham/agent-artifacts` package root의 named export가 Codex stored/active facts를 보존하고 plan/apply는 manager에 위임한다. 미사용 export는 `sideEffects: false` tree-shaking으로 제거하며, 훅 출력은 공식 훅 빌드의 emitted-byte cap·`FORBIDDEN_PATTERNS`로 검증한다.
- `loadManifest` 는 throw 한다 — 깨진 매니페스트는 사용자 상태가 아니라 빌드 결함(`sync-rule-hashes` 누락)이다. 세션 경로 소비자가 이를 흡수한다.
- 드리프트는 **덮지 않는다.** `resync` 에 id 가 명시된 규칙만 덮어쓴다.
- 레이어는 **옮기지 복사하지 않는다.** 양쪽에 남으면 호스트가 같은 규칙을 두 번 읽고 사본이 갈릴 때 어느 쪽이 이기는지 말할 수 없다. `otherScope` 가 미리보기에는 잃을 것을, 적용 결과에는 실제로 지운 것을 싣는다.
- 마커 밖 사용자 텍스트와 다른 소유자의 아티팩트는 그대로 보존한다.
- 경로·파일 처리는 공유 package root의 named export를 거치며 이 모듈에서 시스템 호출하지 않는다.

## Boundaries

### Always do

- 브라우저 preview revision 과 save 의 새 계획이 같을 때만 apply 한다.
- 고아 폐기를 명시적인 `seiri` 소유 네임스페이스로 제한.
- 레이어 전환은 **새 위치에 먼저 쓰고 그 다음 옛 위치를 지운다** — 반대 순서는 중간 실패 시 규칙을 어디에도 남기지 않는다.

### Ask first

- `RuleDocAction` 집합 변경 (설정 UI·도구 응답 계약).
- 필수(required) 규칙 개념 도입 — 현재 전부 opt-in 이 설계 전제다.

### Never do

- 세션 훅에서 `applyRuleDocs` 호출 (배포는 setup 표면 전담).
- `seiri` 소유 밖 파일·섹션 삭제 또는 매니페스트 첫 항목으로 소유권 추론.
- 사용자의 로컬 편집을 확인 없이 덮어쓰기.
- 내부 배포에서 deprecated Claude-only `resolveRulesDir` 사용.
