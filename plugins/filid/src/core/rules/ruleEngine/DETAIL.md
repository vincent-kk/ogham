# ruleEngine contract

## Requirements

- 문서 계약의 누락 오류는 INTENT.md에만 적용한다. DETAIL.md는 선택이며 존재하는 문서의 위반만 보고한다. organ 승격 안내는 module 진입점을 요구하지만 DETAIL.md가 승격 의도 증거인 기존 판정은 유지한다.

- canonical 15개 built-in rule만 등록한다.
- 규칙 기본 severity는 built-in roster가 정한다. config v3는 override만 기록하며 누락된 rule ID는 기본 enabled와 severity를 유지한다. 명시 프로젝트 severity는 `applyOverrides`에서 우선한다.
- allowed-peer basename은 제한된 glob wildcard를 허용한다. 정확 이름은 직접 조회하고 동적 이름은 basename만 비교하며 path·adapter 범위는 유지한다.
- node-level rule과 project-level rule을 각각 한 번의 적절한 granularity로 평가한다.
- scope filter는 documents, nodes, entry-points, boundaries, dag, verification을 지원한다.
- verification 규칙은 파일별 policy finding을 보존하고 탐색 확실성이 exact가 아니면 파일 finding 유무와 무관하게 루트 증명 불가 finding을 더한다. 탐색 확실성 필드가 없으면 exact 탐색이며 루트 finding을 추가하지 않는다. 개수 집계로 fallback하지 않는다. 파일 개수 불확실성은 개수 상한 규칙만 보고하며 spec 연결·분절로 전파하지 않는다.
- validate와 verification 액션은 같은 규칙 평가 결과를 사용한다. 규칙 끄기는 그 규칙의 확정 위반과 개수 불확실성을 함께 제외하며, 예외 finding은 확실성을 싣지 않는다.
- rule exception과 indeterminate/unsupported evidence를 PASS로 숨기지 않는다.
- config 면제는 일치한 패턴을 `exemptedBy`에 담은 info finding을 남긴다. 면제 finding만 반환한 평가 단위는 passed·failed 대신 skipped로 집계하고, severity override는 면제 finding의 info 수준을 바꾸지 않는다.
- violation `message`에 적는 경로는 project root 기준 POSIX 상대 경로다(root 자신은 `.`). `path` 필드는 절대 경로 그대로다. message는 review 후보로 hash되므로 저장소 위치에 따라 달라지면 안 된다. root는 `RuleContext.tree.root`나 snapshot의 `projectRoot`에서 읽는다(둘은 같은 값이다).
- exception과 allowed-peer scope는 portable separator/case path identity로 평가한다.
- `legacy-criteria-ledger`는 project granularity로 snapshot evidence를 평가하고 root DETAIL migration target을 suggestion으로 반환한다.
- `organ-no-intentmd`는 **조용히 승격된 organ**을 보고한다. 분류 1단계가 `INTENT.md → fractal`이므로 `type === 'organ' && hasIntentMd`는 실제 snapshot에서 성립할 수 없다. 대신 organ 이름(`KNOWN_ORGAN_DIR_NAMES` 또는 config `organNames`) 디렉터리가 **INTENT.md만으로** fractal이 된 경우 — DETAIL.md도 module 진입점도 없는 상태 — 를 `warning`으로 낸다. 둘 중 하나라도 있으면 승격이 의도된 것이므로 침묵한다.
- `external-import-boundary` 위반은 import가 풀리는 파일을 `importedPath`에 싣는다. restructure postcondition이 위반의 신원(rule, 소비자, 대상)을 계획 시점 기준선과 비교할 때 쓴다.
- `external-import-boundary`는 대상이 organ 파일이면 진입점 경유가 아니라 **소비자 위치**로 판정한다. organ은 진입점을 갖지 않으므로 경유할 대상이 없다.

  | 소비자 위치         | 참조 경로            | 판정                             |
  | ------------------- | -------------------- | -------------------------------- |
  | 소유 프랙탈 subtree | organ 구체 파일 직접 | 통과                             |
  | subtree 밖          | organ 구체 파일 직접 | 위반 — 선언된 면책이 있으면 통과 |

- **소비자가 검증 파일이면 boundary를 적용하지 않는다.** 검증은 계약을 확인하는 행위이고, 내부 단위를 검사하려면 내부에 닿아야 한다. 이를 위해 진입점을 넓히면 소비자가 테스트뿐인 공개 심볼이 생겨 공개 계약이 오염된다 (`seiri_public-contract` §1). 판정 근거는 adapter 발견 파일과 선언된 검증 organ 아래 스캔 파일을 합친 `snapshot.verificationPaths`이며, core는 파일명 패턴을 알지 못한다.
- 하위 프랙탈은 조상 프랙탈의 진입점이 아닌 루트 파일을 직접 참조할 수 있다. 조상 진입점과 형제 내부 참조는 위반이며 이 허용은 의존 그래프의 간선이나 순환 판정을 바꾸지 않는다.
- 대상이 fractal 내부 파일일 때도 같은 면책을 조회한다. 진입점을 경유할 수 **없는** 정당한 소비자가 존재하기 때문이다 — 표준 사례는 훅 번들이며, 배럴을 import하면 번들러가 배럴이 재노출하는 모듈 전체를 끌어온다. 면책이 없으면 기존 진입점 규칙 그대로 위반이다.
- 면책은 소유 프랙탈 DETAIL.md의 `## Boundary Exemptions` 선언에서 온다 (`## Organ Exemptions`는 legacy 별칭으로 계속 인정한다). 선언된 `targetPath`가 대상 경로를 담고, `Direct import`가 allowed이며, consumer glob이 소비 파일에 매치하고, `Reason`이 비어 있지 않을 때만 통과시킨다.
- 모든 violation은 `suggestion`을 채운다. `evaluateRule`은 rule 실행이 던졌을 때 재시도와 보고를 안내하고, snapshot 부재로 인한 indeterminate finding(`external-import-boundary`, `checkDependencyCycles`, `checkPureFunctionIsolation`, `checkVerificationPolicy`, `checkLegacyCriteriaLedger`)은 각자 필요한 `fractal_inspect` action을 안내한다. cycle과 graph 불확실성, entry-point surface의 세 상태(enumerated indeterminate·unsupported·opaque)도 각자 다음 행동을 담는다.

## API Contracts

- config는 canonical roster의 override이며 누락된 ID의 기본 의미를 바꾸지 않는다.
- 공개 평가 경계는 check 예외를 불확실성 finding으로 보존한다. 예외를 빈 결과로 바꾸면 PASS를 조작하게 된다.

## Acceptance Criteria

### AC-rules-roster — 정확한 15개

- retired naming/index-barrel rule이 없고 계획의 14개 구조/검증 ID와 `legacy-criteria-ledger`가 모두 있다.

### AC-rules-evidence — 증거 기반 결과

- circular, boundary, entry surface와 verification rule이 snapshot evidence를 직접 사용한다.
- check failure와 uncertain graph는 passed count에 들어가지 않는다.
- graph가 `indeterminate` 또는 `unsupported`이면 알려진 edge에 boundary 위반이 없더라도 external-import-boundary가 uncertainty finding을 남긴다.
- pure-function node의 알려진 edge가 격리를 위반하지 않더라도 graph가 exact가 아니면 pure-function-isolation이 uncertainty finding을 남긴다.
- legacy criteria evidence가 없으면 rule이 통과하고, 있으면 ledger path에서 violation과 root DETAIL migration suggestion을 한 번 반환한다.

### AC-rules-organ-promotion — 조용히 승격된 organ 보고

- organ 이름 디렉터리가 INTENT.md만 갖고 fractal이면 `organ-no-intentmd` `warning`이 나오고, 승격 취소와 진입점 추가 두 해소책을 제시한다.
- 같은 디렉터리에 DETAIL.md 또는 module 진입점이 있으면 침묵한다.
- organ 이름이 아닌 디렉터리는 INTENT.md가 있어도 침묵한다.
- config `organNames`로 선언된 이름도 built-in 이름과 같게 취급한다.

### AC-rules-organ-boundary — 소비자 위치 기준 organ 접근

- 소유 프랙탈 subtree 안의 fractal이 그 프랙탈 소유 organ 파일을 직접 참조하면 통과한다.
- subtree 밖에서의 직접 참조는 위반이며, organ을 소유하지 않은 구체 파일 참조는 선언이 그 경로를 담지 않는 한 기존 진입점 규칙 그대로 위반으로 남는다.
- 소유 프랙탈 DETAIL.md의 유효한 면책 선언이 있으면 통과하고, reason 부재· direct import 미허용·consumer 불일치는 통과시키지 않는다.

### AC-rules-verification-consumer — 검증 파일은 boundary 대상이 아니다

- 어댑터가 검증 파일로 보고한 소비자의 import는 대상이 organ이든 fractal 내부이든 위반을 내지 않는다.
- 같은 경로가 검증 파일로 보고되지 않으면 기존 규칙이 그대로 적용된다.

### AC-rules-fractal-exemption — fractal 대상 면책

- 소유 프랙탈이 선언한 면책의 `targetPath`가 대상 fractal 내부 파일을 담으면 subtree 밖 직접 참조가 통과한다.
- 선언이 없거나 `targetPath`가 대상을 담지 않으면 진입점 규칙대로 위반이다.
- reason 부재·direct import 미허용·consumer 불일치는 organ 대상과 동일하게 통과시키지 않는다.

### AC-rules-granularity — 중복 없는 평가

- project rule finding은 tree node 수와 무관하게 한 번만 생성된다.

### AC-rules-portability — Host 독립 scope

- Windows target path는 POSIX separator로 작성된 literal/glob scope와 동일하게 매치된다.

### AC-rules-config-exemption — 면제의 가시성과 skipped 집계

- 정확 경로 일치를 glob보다 먼저 선택하고 일치한 원본 config 패턴을 `exemptedBy`에 기록한다.
- 평가 노드가 일치하면 rule ID·패턴·노드 경로·면제 제거 suggestion을 갖춘 info finding 한 건을 반환하며 내부 검사를 실행하지 않는다.
- 프로젝트 규칙의 평가 노드가 일치하지 않으면 내부 검사를 한 번 실행하고 finding마다 예외를 판정한다. 비어 있지 않은 `memberPaths`는 중복 없는 절대 경로 전체가 일치해야 하며, 없거나 비어 있으면 `path`를 쓴다. `exemptedBy`는 finding의 `path`에 일치한 원본 패턴이다.
- 예외 finding은 원래 `path`와 기존 예외 message·suggestion 형식, `severity: info`를 갖고 `certainty`를 싣지 않는다. 심각도 변경 바깥에서 한 번 적용되며 node 규칙의 동작은 유지한다.
- 루트 확실성 finding은 루트 예외로만 제외된다. 예외가 아닌 indeterminate·unsupported 증거는 PASS로 승격하지 않는다.
- 비어 있지 않은 finding 전체가 면제이면 skipped만 증가하고 finding은 결과에 남는다.

## Last Updated

규칙 roster·severity, config 면제, 소비자 경계 판정이나 실패 시 finding 정책이 바뀔 때 갱신한다.
