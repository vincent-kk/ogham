# filid 규칙 문서 분할 — 진행 원장

계획: [rule-doc-split-plan.md](./rule-doc-split-plan.md)

## T1 — 규칙 문서 4개 작성 · 완료

생성:

- `plugins/filid/templates/rules/filid_fractal-boundaries.md` (89줄, 6절, 상시)
- `plugins/filid/templates/rules/filid_module-documents.md` (78줄, 5절, `paths:` INTENT/DETAIL)
- `plugins/filid/templates/rules/filid_verification-records.md` (80줄, 5절, `paths:` 테스트 글롭)
- `plugins/filid/templates/rules/filid_code-placement.md` (64줄, 5절, 상시)

검증: 4개 전부 `B1:1 B5:1 B6a:1 B6b:1`. `Ask yourself:` 개수가 번호 절 수와 일치(6/5/5/5).
`globs:` 일치 0건, `paths:` 는 조건부 2개에만 존재. 원문 핵심 19개 항목 커버리지 전수 대조 통과.

상시 로드 153줄 (원문 320줄 대비 -52%), 조건부 158줄.

## T2 — manifest 교체 · 구 템플릿 삭제 · 해시 동기화 · 완료

- `git rm plugins/filid/templates/rules/filid_fca-policy.md`
- `manifest.json` 엔트리 1 → 4, 전부 `required: true`, optional 0개
- `yarn filid build:rules` → `updated 4 entries`, `--check` 통과

## T3 — DETAIL 갱신 → 상수·훅 변경 → 테스트 갱신 · 완료

DETAIL 선행 갱신: `src/hooks/userPromptSubmit/DETAIL.md`, `src/core/infra/configLoader/DETAIL.md`.

코드: `FCA_POLICY_RULE_DOC` + `LEGACY_FCA_POLICY_RULE_DOC` → `PRIMARY_RULE_DOC` + `LEGACY_RULE_DOCS`.
`inspectFcaPolicy.ts` 가 새 상수를 소비. `buildMinimalContext.ts` 는 무변경 — 포인터는 대표 문서
하나를 가리키고 형제는 대표 문서 본문이 지목한다.

테스트 픽스처 이름 갱신 7개 파일. 신규 `src/__tests__/unit/core/ruleDocInvariants.test.ts` (8 cases).

검증: `yarn filid typecheck` exit 0. 영향 범위 46개 파일 573 테스트 통과, 2 skip
(optional 엔트리가 0개라 `describe.skipIf(!OPTIONAL)` 블록이 의도대로 skip).

### 계획 대비 편차

1. **`legacyFilename: "fca.md"` 제거** — 사용자 지시(턴 중). 접두사 rename 이후 충분한 시간이
   경과했다는 판단. 훅 상수 `LEGACY_RULE_DOCS` 에서도 함께 제거했다 — `syncRuleDocs` 가 마이그레이션
   하지 않을 주소를 훅이 "active" 로 보고하면 모순이기 때문. 잔여 결과: pre-prefix `fca.md` 만 남은
   설치본은 마이그레이션도 orphan 스윕도 되지 않는다(`filid_` 접두사가 없어 스윕 대상 밖).
2. **T3 §6 의 실패-우선 케이스 A/B 를 추가하지 않음** — 계획이 요구한 orphan 회수와 legacy 승계
   메커니즘은 이미 `src/__tests__/unit/core/ruleDocsChannel.test.ts:258-272`
   (`filid_retired.md` 삭제 · 타 owner 보존)와
   `src/mcp/tools/ruleDocsSync/__tests__/ruleDocsSync.test.ts:230-233` 이 검증하고 있어 중복이었다.
   대신 실제 배포 산출물을 지키는 `ruleDocInvariants.test.ts` 를 추가했다 — manifest ↔ 템플릿
   디렉토리 양방향 일치, 해시 신선도, 폐기 문서 부재, B1/B5/B6 골격, `paths:`/`globs:` 구분.
   이 가드는 refactor 특성상 즉시 green 이며(seiri test-validity §1 의 characterization 예외),
   각 케이스에 guard-bites 음성 단언을 포함해 가드가 실제로 무는지 확인한다.

## T4 — 빌드 · 재배포 · 참조 문서 갱신 · 전체 검증

(진행 중)
