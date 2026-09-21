# verification contract

## Requirements

- spec-document는 파일당 최대 15 semantic cases를 허용한다.
- test-record는 파일당 최대 32 semantic cases를 허용하며 전체 파일·case 수에는 제한을 두지 않는다.
- exact count만 cap PASS/violation으로 판정하고 indeterminate와 unsupported는 별도 warning finding으로 보존한다.
- 같은 owner fractal의 여러 spec-document는 실제 DETAIL acceptance group을 선언하고 파일 간 group이 겹치지 않아야 한다.
- 역할, case count와 contract group id는 호출자가 facts 레코드에서 읽어 `verificationFacts`로 넘긴다. adapter는 어떤 파일이 verification인지 **발견**할 뿐 파일 내용을 해석하지 않는다 — 레코드가 없는 파일을 adapter로 메우면 부트스트랩 누락이 가려진다.
- 레코드의 `verification`에 contract group id 목록이 없으면 그 파일의 group 선언은 **모르는 것**이다. 같은 owner에 spec이 둘 이상일 때 그 파일의 `spec-contract-link`는 `indeterminate` warning이고 다음 행동은 재추출이다. "선언이 없다"는 error로도, 통과로도 읽지 않는다 — 둘 다 레코드가 말하지 않은 것을 말한 셈이 된다.
- `verificationFacts`에 없는 발견 파일은 분석에서 빠진다. 그 사실은 호출자가 certainty와 진단으로 싣는다.
- 같은 최고 confidence의 adapter가 한 파일을 주장하면 `ambiguous-adapter-claim` 진단을 남기고 해당 파일을 policy 분석에서 제외한다.
- snapshot이 제공한 discovery 결과는 절대 portable path로 정규화해 한 번만 소비하며, 동일 adapter의 중복 path는 한 claim으로 취급한다.
- discovery 실패나 adapter 경합으로 일부 파일을 판정하지 못하면 project certainty는 `indeterminate`이며 빈 exact 분석으로 축소하지 않는다.
- violation `message`에 적는 경로는 project root 기준 POSIX 상대 경로다. `path`와 `suggestion`은 그대로다.
- `VerificationViolation.suggestion`은 필수다. count non-exact, cap 초과(spec·test 역할별로 다른 문장), group 미표시·미선언·분할 모두 다음 행동을 채운다.

## API Contracts

- `analyzeVerification(input): Promise<VerificationProjectAnalysis>` — adapter evidence를 file analysis와 policy violation으로 조합한다.
- `evaluateVerificationPolicy(files, contractGroups, projectRoot)` — 15/32와 spec 연결을 평가한다.
- `findSpecFragmentation(files, contractGroups, projectRoot)` — 겹침, 누락, 알 수 없는 group과 레코드가 말하지 않은 group 선언의 finding을 만든다. `projectRoot`는 message의 경로를 상대 경로로 적는 데만 쓴다.
- `resolveContractGroups(detailDocuments)` — DETAIL의 안정 acceptance group을 owner별 index로 만든다.

## Acceptance Criteria

### AC-verification-caps — File role thresholds

- exact spec 15와 test-record 32는 통과한다.
- exact spec 16과 test-record 33은 각각 role-specific violation이다.
- 여러 test-record의 합계는 violation을 만들지 않는다.

### AC-verification-certainty — Unknown evidence

- 동적 table과 알 수 없는 syntax는 PASS가 아니라 indeterminate 또는 unsupported finding이다.
- 동률 adapter가 주장한 파일은 첫 adapter가 임의로 소유하지 않는다.
- 같은 파일의 상대/절대 표기와 중복 discovery는 소유권 판정을 바꾸지 않는다.
- snapshot discovery는 adapter마다 한 번만 실행된다.

### AC-verification-contracts — Multiple specs

- 서로 다른 실제 DETAIL group에 연결된 spec은 통과한다.
- 겹치는 group은 `spec-fragmentation`, 누락되거나 존재하지 않는 group은 `spec-contract-link` violation이다.
- 레코드가 group id를 싣지 않은 spec은 같은 `spec-contract-link`의 `indeterminate` warning이고, 재추출을 다음 행동으로 싣는다.

## Last Updated

2026-09-20 — contract group id를 레코드에서 읽고, 레코드가 말하지 않은 선언을 indeterminate로 보존한다.
