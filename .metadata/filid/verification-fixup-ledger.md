# filid 검증 후속 수정 — 진행 원장

계획: [verification-fixup-plan.md](./verification-fixup-plan.md)

각 줄은 완료된 Task 하나다: 무엇이 어디에 들어갔고, 무엇으로 검증했는가.

---

## T1 — builtin severity 정본 단일화 · 완료

**들어간 것**

- 신규 `plugins/filid/src/constants/builtinRuleSeverities.ts` — 15개 rule severity 정본. `as const satisfies Record<BuiltinRuleId, 'error' | 'warning'>` 로 선언 지점에서 누락·오타 키를 잡는다.
- `core/rules/ruleEngine/evaluation/loadBuiltinRules.ts` — 15개 `severity:` 리터럴을 전부 `BUILTIN_RULE_SEVERITIES[BUILTIN_RULE_IDS.X]` 로. 값은 하나도 바뀌지 않았다(roster 가 이미 정본이었다).
- `core/infra/configLoader/loaders/createDefaultConfig.ts` — 하드코딩 `ERROR_RULE_IDS` 집합 삭제, `BUILTIN_RULE_SEVERITIES[ruleId]` 참조로 교체. **이 파일이 3개 규칙의 severity 를 틀리게 만들던 지점이다.**
- `constants/legacyCriteriaLedger.ts` — `SEVERITY` 를 리터럴에서 정본 참조로. 계획에는 "다른 소비자 없으면 제거" 라 적었으나 소비자가 3곳(`checkLegacyCriteriaLedger.ts` ×2, `legacyCriteriaLedger.spec.ts`)이라 제거 대신 별칭으로 바꿨다 — **계획 이탈, 사유: 제거하면 3곳을 함께 고쳐야 하고 별칭이 같은 단일 정본을 달성한다.**
- `src/__tests__/unit/core/configLoader.test.ts` — 결함을 고정하던 `keeps the established hard-rule severities` 를 roster 파생 검증으로 교체.
- 문서: `core/infra/configLoader/DETAIL.md`(14개→15개 + 정본 위치), `.metadata/filid/07-RULES-REFERENCE.md`(정본 문단), `.metadata/filid/01-ARCHITECTURE.md`(AC-32 추가).

**검증**

- 새 테스트가 먼저 붉었다: `AssertionError: expected 'error' to be 'warning'` — 의도한 사유.
- `yarn typecheck` → exit 0, 출력 0 바이트.
- `yarn vitest run` (configLoader · ruleEngine · legacyCriteriaLedger) → exit 0, 51 passed.
- 발산 재측정: `diverging rules: 0 / 15` (수정 전 3/15).
- 격리 fixture(설정 파일 없음)에서 `organ-no-intentmd` 가 `warning` 으로 발화. 수정 전에는 `error`.

**계획 외 추가**

- `core/rules/ruleEngine/DETAIL.md` Requirements 에 severity 정본 위치를 한 줄 추가했다. 계획에는 없었으나 이 모듈의 계약이 바뀌었으므로 DETAIL 이 현재 명세를 서술해야 한다.
- 손댄 세 DETAIL.md 의 `## Last Updated` 를 현재 상태로 갱신했다. 47개 DETAIL.md 전부가 이 섹션을 가지므로 저장소 관행이며, 제거가 아니라 갱신이 맞다.

---

## T2 — `alreadyPlaced` postcondition · 완료

**들어간 것**

- 신규 `core/restructure/validator/validateTargetPostconditions.ts` — target 존재·node type·required artifact·import rewrite. `validateMovePostconditions` 에서 source 부재 검사만 제외한 공통부다.
- `validateMovePostconditions.ts` — source 부재 검사 + 공통부 호출로 축소(48줄 → 28줄). `resolveTargetNode`·`validateImportRewrites`·`validateRequiredArtifacts` import 는 공통부로 이동.
- `validatePlanPostconditions.ts` — `plan.alreadyPlaced` 를 `validateTargetPostconditions` 로 순회. 배럴(`restructure/index.ts`)은 공개 4개만 내보내므로 변경 없음.
- `__tests__/planPartition.test.ts` — `SNAPSHOT_AFTER_WRONG_LANDING` fixture + 케이스 2개.
- 문서: `restructure/DETAIL.md`(Requirements·API·AC·Last Updated), `.metadata/filid/08-API-SURFACE.md`, `.metadata/filid/01-ARCHITECTURE.md` AC-31.

**검증**

- 새 테스트가 먼저 붉었다: `expected [ 'import-boundary-violation', …(1) ] to include 'target-missing'` — 의도한 사유(postcondition 이 `alreadyPlaced` 를 보지 않음).
- 격리 fixture 재현(계획 밖 경로 착지 + 소비자 갱신): 수정 전 `valid=true findings=0` → 수정 후 `valid=false findings=3` (`target-missing` 1 + `import-rewrite-missing` 2).
- 실제 프로젝트 회귀: `plugins/filid` hint=lib → `status=ok valid=true findings=0` (변화 없음), hint=logging(미실행 계획) → `status=violations findings=25` (변화 없음).
- clause 제거 검사: `alreadyPlaced.flatMap` 절을 지우면 `reports target-missing when the already-placed unit left its planned path` 가 붉어진다.

**계획 이탈**

- 계획의 "정상 케이스는 `findings === []`" 단언은 성립하지 않는다 — 이 fixture snapshot 은 `import-boundary-violation` 등 snapshot 수준 finding 을 이미 낸다(기존 테스트가 특정 code 부재만 단언하는 이유다). instruction 유래 finding 만 없음을 단언하도록(`finding.sourcePath` 부재) 바꿨다.

---

## T3 — `stripPathExtension` dot-only 세그먼트 · 완료

**들어간 것**

- `specifiers/stripPathExtension.ts` — 모듈 스코프 `DOT_SEGMENT = /^\.+$/` 가드. `..` 과 `../..` 이 더 이상 확장자로 해석되지 않는다.
- `__tests__/importSpecifier.test.ts` — dot 세그먼트 단위 케이스 + `..` specifier 가 `import-rewrite-unsupported` 로 남는 통합 케이스. 후자를 도달 가능하게 하려고 fixture 에 `/root/lib` node 와 `SOURCE_DIRECTORY`·`TARGET_DIRECTORY`·`NESTED_CONSUMER` 경로를 추가했다(계획에 없던 fixture 확장 — 기존 케이스는 영향 없음).
- `restructure/DETAIL.md` API Contracts 의 `stripPathExtension` 계약 한 줄.

**검증**

- 새 테스트가 먼저 붉었다: `expected '.' to be '..'`.
- 수정 후: `".." -> ".."`, `"../.." -> "../.."`, `applySpecifierExtension("../../x", "..") -> "../../x"`.
- clause 제거 검사 2건 모두 붉어진다 — `DOT_SEGMENT` 가드 제거 → dot 세그먼트 테스트, `isPathLike` 가드 제거 → bare parent-directory 테스트. 검증 전에는 두 절 모두 874 테스트를 통과시켰다.

---

## T4 · T5 — 위임(codex) · 완료

`cennad:codex` 로 6개 지점(정확한 치환 문자열 제공)을 위임했다. 결과를 diff 로 직접 검토했고 전부 지시대로 적용됐다.

- `__tests__/unit/core/ruleEngine.test.ts` — `should pass when organ has no INTENT.md` 를 organ 이름 노드로 교체. 이 테스트는 `makeNode` 기본 이름이 `'module'` 이라 organ-이름 가드에 먼저 걸려 목표한 분류 가드를 전혀 검사하지 않았다.
- `.metadata/filid/06-HOW-IT-WORKS.md` 3곳, `.metadata/filid/05-COST-ANALYSIS.md` 1곳 — "scan당 한 번" → traversal 단위 + 호출 횟수 서술.
- `plugins/filid/src/lib/listGitIgnoredPaths.ts` — 폴백 세 번째 조건(스캔 루트가 무시된 디렉터리 안일 때 git 이 exit 128) 주석.
- `.metadata/filid/01-ARCHITECTURE.md` AC-30 은 위임 범위에서 빼고 직접 고쳤다 — 같은 파일의 AC-32 추가와 충돌을 피하기 위해서다.

**검증**

- clause 제거 검사: 분류 가드를 지우면 교체된 테스트가 붉어진다(교체 전에는 통과했다).
- `grep -rn "scan당 한 번\|scan당 git 1회" .metadata/filid/` → 계획·원장 문서 자기 인용 외 0건.

**위임 보고 대조**

위임 세션이 6곳 diff 를 바이트 단위로 대조해 전부 일치를 확인했고, `ruleEngine.test.ts` 단독 실행(22 passed)까지 재검증했다. 보고에서 짚은 세 가지는 이렇게 정리된다.

- 위임 세션이 인용한 전체 스위트 수치 `869 passed / 876` 은 이 작업 **진행 중 스냅샷**이다(T2 의 +2 반영, T3 의 +2 미반영). 최종 수치는 871/878 이며 모순이 아니다.
- grep 조건 미충족은 계획 문서가 자기 문제 서술에서 옛 표현을 **인용**하기 때문이다. 대상 설계 문서 두 개에는 잔존 0건이다.
- 위임 세션이 관측한 "워킹트리가 계속 변한다"는 정황은 같은 트리에서 병행된 T1–T3 작업이다. 자기 소관 4개 파일 밖을 건드리지 않고 전체 스위트 재실행도 보류한 판단이 옳았다 — 미완결 변경이 섞인 결과를 이 위임의 근거로 삼지 않았다.

내 위임 지시문 서두가 "다섯 개의 정밀 수정"이라 적었으나 실제로는 4개 파일 6곳이었다(`06-HOW-IT-WORKS.md` 안에 3곳). 지시 본문의 EDIT 1–6 은 정확했고 결과에 영향은 없었다.

---

## 검증 하네스 사고 (기록)

mutation 검사용 스크립트가 `git checkout HEAD -- <file>` 로 원복하도록 되어 있었다. 워킹트리에 커밋되지 않은 수정이 있으므로, `stripPathExtension.ts` 의 T3 수정이 그 원복에 지워졌다. "restored clean" 메시지는 HEAD 와 같아졌다는 뜻이라 사고를 가리기까지 했다. 발견 즉시 수정을 재적용하고, 하네스를 **변경 전 바이트 사본에서 복원**하도록 고쳐 재실행했다(`[restored byte-identical]`). 이후 mutation 검사는 전부 새 하네스로 수행했다.

---

## 전체 검증

- `plugins/filid`: `yarn typecheck` exit 0 / 출력 0 바이트, `yarn vitest run` exit 0 — **871 passed | 7 skipped (878)**. 착수 전 867/874 대비 +4(T2 +2, T3 +2; T4 는 교체라 증가 없음).
- 모노레포 전체: `yarn typecheck` exit 0, `yarn vitest run` exit 0 — 556 files / 4697 passed | 20 skipped.
- `severity-divergence` → `diverging rules: 0 / 15`.
- 커밋하지 않았다. 번들 재빌드도 하지 않았다.

포매팅(prettier, 4파일 재정렬)과 `eslint` (exit 0) 이후 재실행한 결과도 동일하다. `fractal_scan(plugins/filid)` → `status ok, violationCount 0, 163 nodes` — 신규 파일 2개가 구조 규칙을 건드리지 않는다.

최종 재현 3건:

| 재현                                     | 수정 전                   | 수정 후                  |
| ---------------------------------------- | ------------------------- | ------------------------ |
| alreadyPlaced 유닛이 계획 밖 경로에 착지 | `valid=true findings=0`   | `valid=false findings=3` |
| alreadyPlaced 유닛이 제자리              | `valid=true findings=0`   | 동일                     |
| git 무시 경로 필터                       | `["artifacts/"]`, 2 nodes | 동일                     |

작업 중 사용자가 `34a1277f` 로 `bridge/mcp-server.cjs` 를 직접 커밋했다(빌드 산출물 관행). 이 작업의 소스 변경은 그 커밋에 포함되지 않았다. 번들은 여전히 수정 전 소스에서 만들어진 것이므로, 이 변경이 MCP 도구에 반영되려면 재빌드가 필요하다.
