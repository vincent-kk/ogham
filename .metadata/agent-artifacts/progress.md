# Agent Artifacts 진행 원장

## 계획 검토

- 2026-07-26 — 승인된 13개 작업의 의존성을 재검토했다. 실행 순서는
  `cross-platform -> agent-artifacts -> plugins`로 유지한다.
- 2026-07-26 — Maencof의 기존 raw `filePath` 호환 함수는 범위 생성자의 공개
  계약을 넓히지 않고, 이미 해석된 지침 파일을 다루는 패키지 내부 엔진에
  위임한다. 호스트 인식 도구와 훅은 project/user 생성자를 사용한다.
- 2026-07-26 — Codex 프로젝트 MCP는 전체 TOML을 재직렬화하지 않으며,
  `smol-toml`은 크기 제한 뒤 편집 전후 유효성 검증에만 사용한다.
- 2026-07-26 — 아키텍처의 symlink 거부 조건을 충족하려고 lexical
  containment와 별도로 `assertNoSymlinkDescendantsSync`를
  `cross-platform/filesystem` 계약에 추가했다.
- 2026-07-26 — 15-case 제한 때문에 작업 2의 path/root 케이스를 기존
  `paths.test.ts`/`hostPaths.test.ts` 대신 `artifactPaths.test.ts`와
  `absoluteRoot.test.ts`로 분리했다.
- 2026-07-26 — 작업 2 typecheck가 기존 `normalizeCodexToolUse<T>(): T`
  선언 때문에 변환된 `tool_input` 필드를 숨기는 7개 오류를 노출했다. 런타임
  동작은 바꾸지 않고 required `tool_input` overload가 인덱스 계약을
  반환하도록 타입만 바로잡았다.
- 2026-07-26 — 작업 9의 기존 계획은 `resolveRulesDir` 삭제를 적었지만,
  현재 루트 배럴에서 공개된 함수라서 상위 승인대로 deprecated Claude-only
  호환 wrapper로 유지한다. 새 내부 배포·상태 로직에서는 사용하지 않는다.
- 2026-07-26 — 사용자가 저장소 구조 검사와 `/filid:scan`을 최종 단계로
  미뤘다. 기능 테스트·타입 검사·실제 bundle guard는 수행하되 작업 13의
  아키텍처 명령과 Filid scan은 완료로 기록하지 않는다.
- 2026-07-26 — Rolldown 전환은 보류했다. `sideEffects: false`인 현재
  esbuild 출력에서 `normalizeCodexToolUse`가 두 parser를 모두 실제로
  소비하므로 `codex-hooks` aggregate는 불필요한 구현을 추가하지 않는다.
  실제로 다른 reader를 끌어오던 `filesystem/read` 경로만 direct subpath로
  좁히고 기존 짧은 Codex hook 공개 경로를 유지했다.

## 완료 기록

각 작업을 완료한 직후 무엇을, 어디에, 어떻게 검증했는지 한 줄로 기록한다.

- 작업 1 — Filid/Seiri/Maencof/Cennad의 기존 rule·instruction·MCP 계약을
  해당 DETAIL/INTENT와 특성화 spec에 고정했다. Filid 13/13, Maencof
  29/29, Cennad 4/4가 통과했고 Seiri는 기존 22개가 통과한 채 Codex
  채널 2개가 `.claude/rules` 고정 경로 때문에 의도대로 실패함을 관찰했다.
  계획의 Maencof `claudeMdMerger` 필터는 실제 spec 이름과 일치하지 않아
  `mergeSection readRemoveSection instructionsChannel` 필터로 검증했다.
- 작업 2 — `shared/cross-platform`에 명시적 runtime host/state root,
  portable absolute/containment, 동기식 filesystem, atomic replace,
  owner-token lock, descendant symlink 방어를 추가했다. 새 검증의 red를 먼저
  관찰한 뒤 전체 31 files/260 tests와 typecheck, INTENT line cap,
  `git diff --check`가 통과했다.
- 작업 2 후속 리뷰 — `filesystem.ts`의 다중 함수 구조를 제거하고
  read/mutation/locking/safety/helpers organ에 함수당 한 파일로 분리했다.
  재발 방지 구조 spec을 red→green으로 확인했고 fresh 전체 32 files/261
  tests, typecheck, 48-line INTENT 검증이 통과했다.
- 작업 3 — `shared/agent-artifacts` 문서·공개 타입·named subpath 배럴과
  build/typecheck provider 순서를 추가하고 yarn workspace/`smol-toml`
  lock을 등록했다. 표준 package test 4 files/16 tests와 typecheck가
  통과했다(`^1.6.1`은 lock에서 1.7.0으로 해석됨).
- 작업 4 — project/user target 매트릭스, Codex non-empty override 선택,
  content revision, lock/revision conflict, atomic change와 sibling backup을
  구현했다. 구현 전 3개 missing-module red를 관찰했고 target/transaction
  12개 케이스가 전체 package 검증 안에서 통과했다.
- 작업 5 — instruction section의 inspect/plan/apply, marker 충돌, 후보
  relocation, sibling backup과 hook 전용 status/apply를 구현했다. 공유
  패키지 전체 127개 테스트와 현재 관련 회귀 35개, typecheck/build가
  통과했다.
- 작업 6 — directory/section 규칙에 공통 action 사실표, drift 보존,
  owner 제한 orphan 정리, legacy relocation과 stored/active 상태 분리를
  구현했다. 숨겨진 current + effective legacy 적용 후 canonical section
  하나만 남기는 회귀를 포함해 공유 패키지 127개 테스트가 통과했다.
- 작업 7 — 절대 project root 생성자와 경로 인자를 받지 않는 user 생성자를
  rules/instructions/MCP target에 연결했다. project/user 및 target/transaction
  케이스와 typecheck가 통과했다.
- 작업 8 — Filid 규칙 상태·동기화·UI·hook을 공유 rule engine과 host target에
  옮기고 기존 EISDIR 저하 및 directory legacy drift 이동을 보존했다. 현재
  1,227 tests pass / 7 skipped, typecheck, build:plugin, Playwright 6 pass /
  2 skipped다.
- 작업 9 — Seiri 규칙 배포·preview/save·상태 주입을 공유 engine으로 옮기고
  stale preview 무변경, apply conflict, hidden Codex rule, legacy relocation
  회귀를 고정했다. 현재 123 tests, typecheck, build:plugin, Playwright
  6/6이 통과했다.
- 작업 10 — Maencof raw API·MCP를 공유 instruction manager와 목적별 project
  target으로 마이그레이션하고 exact marker·sibling backup·공개 schema를
  보존했다. SessionStart는 새 `instructions/hook`과 builtin `self-probe/hook`
  경량 진입점으로 분리하고 metafile 회귀 guard를 추가했다. missing-module
  red와 기존 4개 채널 실패를 관찰한 뒤 cross-platform 274/274,
  agent-artifacts 124/124, Maencof 1264/1264 tests 및 세 typecheck,
  `build:plugin`이 통과했으며 최종 SessionStart bundle은 45,140 bytes다.
- 작업 11 — Claude/Codex project file과 user CLI용 MCP 어댑터 네 종류,
  revision/lock, TOML marker 편집과 입력 검증을 구현했다. 현재 MCP
  34/34 tests와 agent-artifacts typecheck/build가 통과했다.
- 작업 12 — Cennad Codex user MCP 프로비저닝을 목적별 user target과 MCP
  manager로 옮기고 기존 argv/ENOENT 저하를 보존했다. 현재 666 tests,
  source/test typecheck, build:plugin 및 E2E 62 pass / 3 skipped다.
- 작업 12 후속 — hook 도달 경로에서 범용 manager·planning·transaction·
  mutation·locking 및 aggregate path/read graph를 금지했다. 새 guard가
  Filid/Seiri/Maencof의 `filesystem/read/index` 유입을 red로 재현했고
  utf8/bytes direct subpath 교체 후 모든 기존 byte cap에서 green이다.
- 작업 13 — 14 workspace typecheck, strict lint(0 warnings), package test
  3,685건, Filid/Seiri/Cennad E2E와 실제 Cennad→Claude smoke가 통과했다.
  adapter 326건은 생성본과 일치하고 네 plugin hook bundle guard도 통과했다.
  Filid scan은 INTENT 452개·organ 740개·spec 13개에서 위반 0건이었다.
  exact package export를 entry point로 인정하는 경계 guard를 추가하고 실제
  `hostRegistry/types` 우회 한 건을 고친 뒤 cross-platform 282/282와 독립
  Windows 경로 재리뷰가 통과했다.
