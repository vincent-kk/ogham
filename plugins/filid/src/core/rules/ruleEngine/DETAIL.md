# ruleEngine contract

## Requirements

- canonical 15개 built-in rule만 등록한다.
- node-level rule과 project-level rule을 각각 한 번의 적절한 granularity로
  평가한다.
- scope filter는 documents, nodes, entry-points, boundaries, dag,
  verification을 지원한다.
- rule exception과 indeterminate/unsupported evidence를 PASS로 숨기지 않는다.
- exception과 allowed-peer scope는 portable separator/case path identity로
  평가한다.
- `legacy-criteria-ledger`는 project granularity로 snapshot evidence를
  평가하고 root DETAIL migration target을 suggestion으로 반환한다.
- `external-import-boundary`는 대상이 organ 파일이면 진입점 경유가 아니라
  **소비자 위치**로 판정한다. organ은 진입점을 갖지 않으므로 경유할 대상이
  없다.

  | 소비자 위치         | 참조 경로            | 판정                             |
  | ------------------- | -------------------- | -------------------------------- |
  | 소유 프랙탈 subtree | organ 구체 파일 직접 | 통과                             |
  | subtree 밖          | organ 구체 파일 직접 | 위반 — 선언된 면책이 있으면 통과 |

- **소비자가 검증 파일이면 boundary를 적용하지 않는다.** 검증은 계약을
  확인하는 행위이고, 내부 단위를 검사하려면 내부에 닿아야 한다. 이를 위해
  진입점을 넓히면 소비자가 테스트뿐인 공개 심볼이 생겨 공개 계약이 오염된다
  (`seiri_public-contract` §1). 판정 근거는 어댑터가 보고한
  `snapshot.verification.files`이며, core는 파일명 패턴을 알지 못한다.
- 대상이 fractal 내부 파일일 때도 같은 면책을 조회한다. 진입점을 경유할 수
  **없는** 정당한 소비자가 존재하기 때문이다 — 표준 사례는 훅 번들이며,
  배럴을 import하면 번들러가 배럴이 재노출하는 모듈 전체를 끌어온다.
  면책이 없으면 기존 진입점 규칙 그대로 위반이다.
- 면책은 소유 프랙탈 DETAIL.md의 `## Boundary Exemptions` 선언에서 온다
  (`## Organ Exemptions`는 legacy 별칭으로 계속 인정한다). 선언된
  `targetPath`가 대상 경로를 담고, `Direct import`가 allowed이며, consumer
  glob이 소비 파일에 매치하고, `Reason`이 비어 있지 않을 때만 통과시킨다.

## API Contracts

- `loadBuiltinRules(options?): Rule[]` — config-bound canonical rule roster.
- `evaluateRule(rule, context): RuleViolation[]` — 단일 rule 결과 또는
  indeterminate finding.
- `evaluateRules(snapshot, rules?, options?): RuleEvaluationResult` —
  scope/granularity에 맞춘 전체 결과.

## Acceptance Criteria

### AC-rules-roster — 정확한 15개

- retired naming/index-barrel rule이 없고 계획의 14개 구조/검증 ID와
  `legacy-criteria-ledger`가 모두 있다.

### AC-rules-evidence — 증거 기반 결과

- circular, boundary, entry surface와 verification rule이 snapshot evidence를
  직접 사용한다.
- check failure와 uncertain graph는 passed count에 들어가지 않는다.
- graph가 `indeterminate` 또는 `unsupported`이면 알려진 edge에 boundary
  위반이 없더라도 external-import-boundary가 uncertainty finding을 남긴다.
- pure-function node의 알려진 edge가 격리를 위반하지 않더라도 graph가
  exact가 아니면 pure-function-isolation이 uncertainty finding을 남긴다.
- legacy criteria evidence가 없으면 rule이 통과하고, 있으면 ledger path에서
  violation과 root DETAIL migration suggestion을 한 번 반환한다.

### AC-rules-organ-boundary — 소비자 위치 기준 organ 접근

- 소유 프랙탈 subtree 안의 fractal이 그 프랙탈 소유 organ 파일을 직접
  참조하면 통과한다.
- subtree 밖에서의 직접 참조는 위반이며, organ을 소유하지 않은 구체 파일
  참조는 선언이 그 경로를 담지 않는 한 기존 진입점 규칙 그대로 위반으로
  남는다.
- 소유 프랙탈 DETAIL.md의 유효한 면책 선언이 있으면 통과하고, reason 부재·
  direct import 미허용·consumer 불일치는 통과시키지 않는다.

### AC-rules-verification-consumer — 검증 파일은 boundary 대상이 아니다

- 어댑터가 검증 파일로 보고한 소비자의 import는 대상이 organ이든 fractal
  내부이든 위반을 내지 않는다.
- 같은 경로가 검증 파일로 보고되지 않으면 기존 규칙이 그대로 적용된다.

### AC-rules-fractal-exemption — fractal 대상 면책

- 소유 프랙탈이 선언한 면책의 `targetPath`가 대상 fractal 내부 파일을 담으면
  subtree 밖 직접 참조가 통과한다.
- 선언이 없거나 `targetPath`가 대상을 담지 않으면 진입점 규칙대로 위반이다.
- reason 부재·direct import 미허용·consumer 불일치는 organ 대상과 동일하게
  통과시키지 않는다.

### AC-rules-granularity — 중복 없는 평가

- project rule finding은 tree node 수와 무관하게 한 번만 생성된다.

### AC-rules-portability — Host 독립 scope

- Windows target path는 POSIX separator로 작성된 literal/glob scope와
  동일하게 매치된다.

## Last Updated

2026-07-28 — organ 접근을 소비자 위치로 판정하고, DETAIL 면책 선언을 organ과 fractal 대상 모두에 연결했다.
