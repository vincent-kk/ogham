# ruleDocs — 규칙 문서 배포·상태·드리프트

## Purpose

플러그인이 배포하는 `templates/rules/*.md` 와 대상 프로젝트의
`.claude/rules/` 사이를 조정한다. 배포 상태의 단일 진실은 **파일시스템**이며
config 에 미러링하지 않는다. 규칙 본문 자체는 하니스가 로드하므로 이 모듈은
파일을 놓고 치울 뿐 내용을 주입하지 않는다.

## Structure

```
index.ts   barrel (훅은 이 배럴을 거치지 말고 concrete 파일을 직접 import)
loaders/   organ — loadManifest (매니페스트 파싱·검증)
status/    organ — getRuleDocsStatus (배포 상태 스냅샷)
sync/      organ — planRuleDocs (dry-run) · applyRuleDocs (실행)
utils/     organ — decideRuleDocAction · collectRuleDocDecisions · 경로 해석
```

## Conventions

- **판정은 한 곳**: `decideRuleDocAction` 은 순수 함수이고 plan·apply 가 둘 다
  이를 경유한다. 갈라지면 미리보기가 거짓말을 하게 된다.
- `loadManifest` 는 throw 한다 — 깨진 매니페스트는 사용자 상태가 아니라 빌드
  결함(`sync-rule-hashes` 누락)이다. 세션 경로 소비자가 이를 흡수한다.
- 드리프트는 **덮지 않는다.** `resync` 에 id 가 명시된 규칙만 덮어쓴다.
- 부분 실패는 해당 항목만 `skip` + 사유로 기록하고 계속한다 — 조용한 실패 금지.
- 읽을 수 없는 배포 파일(해시 null)은 일치가 아니라 드리프트로 취급한다.
- 경로 조합은 `@ogham/cross-platform/compat` 경유 (네이티브 `node:path` 금지).

## Boundaries

### Always do

- 쓰기 전에 `planRuleDocs` 로 무엇이 쓰일지 보여줄 수 있게 유지.
- 새 동작을 추가하면 `RuleDocAction` 과 판정 함수 양쪽에 반영.

### Ask first

- `RuleDocAction` 집합 변경 (설정 UI·도구 응답 계약).
- 필수(required) 규칙 개념 도입 — 현재 전부 opt-in 이 설계 전제다.

### Never do

- 세션 훅에서 `applyRuleDocs` 호출 (배포는 setup 표면 전담).
- 매니페스트에 없는 파일을 쓰거나 지우기.
- 사용자의 로컬 편집을 확인 없이 덮어쓰기.
