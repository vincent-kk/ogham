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

## T4 — 빌드 · 참조 문서 갱신 · 전체 검증 · 완료 (재배포 제외)

참조 문서: `.metadata/filid/04-USAGE.md` (AGENTS.md 원본 = 4개 문서, Codex marker 구간 설명 추가),
`.metadata/filid/07-RULES-REFERENCE.md` (canonical 경로 + "배포되는 규칙 문서" 표 + "제품 경계" 절 신설),
`plugins/filid/templates/rules/README.md` (4엔트리 예시, `legacyFilename`·`templateHash` 필드 설명,
포맷 골격과 orphan 회수 설명 포함한 "규칙 추가" 절차).

빌드: `yarn filid build` exit 0. hook bundle guard 통과 (session-start ≤49152, heavy ≤32768,
light ≤16384). `build:compile-plugin` → `sync: 5 unchanged`.

검증:

- `yarn filid test:run` — 79 파일 통과, 833 통과 / 7 skip
- `yarn typecheck` — 14 workspace 전부 clean
- 변경 소스 9개 파일 scoped `eslint` — exit 0

### 계획 대비 편차 (이어서)

3. **이관 3건 중 2건이 불필요했다** — `src/adapters/INTENT.md:16-17,36,38` 이 Adapter Boundary 를,
   `skills/cross-review/SKILL.md:33-42` 가 Cross-review Scope 를 이미 담고 있었다. 규칙 문서 쪽이
   중복이었으므로 삭제만 하고 이관하지 않았다. Product Boundary 는 `filid/INTENT.md` 가 46/50 줄로
   여유가 없어 `07-RULES-REFERENCE.md` 의 "제품 경계" 절로 보냈다 — 프로젝트 규칙이 아니라 레퍼런스
   성격이므로 그쪽이 제자리다.
4. ~~**재배포(T4 step 4-5)를 수행하지 못했다 — 차단**~~ → **해소됨**. 사용자 지시로 두 채널을
   직접 수정했다(버전 정합은 사용자가 나중에 맞춘다).
   - `.claude/rules/` — 병렬 작업 쪽에서 이미 배포 완료(13:43). 4개 파일이 템플릿과 바이트 일치,
     구 `filid_fca-policy.md` 제거 확인.
   - `AGENTS.md` — Codex 채널을 직접 재작성했다. 구 `FILID:START:filid_fca-policy.md` 단일 구간
     (1-160행)을 manifest 순서대로 4개 구간으로 교체. 각 구간 내용이 템플릿 `.trim()` 과 일치하고,
     첫 SEIRI 구간 이후 512행은 백업 대비 바이트 동일함을 `diff` 로 확인. 673 → 835행.
   - 사용 스크립트: 스크래치패드 `rewriteAgentsFilidSpans.mjs` (manifest 에서 순서를 읽고, 첫
     비-FILID 구간부터 원문 보존). 저장소에 남기지 않았다 — 정상 경로는 `rule_docs_sync` 다.

   원래 차단 사유(기록 보존): 실행 중인 MCP 서버의 plugin root 가
   `/Users/Vincent/Workspace/ogham/` (별도 체크아웃, `main` 브랜치)로 해석된다. `rule_docs_sync status`
   가 그 경로의 manifest 를 읽고 `templateHash: 39ae1d7c…` 를 보고했는데, 이는 이 저장소에 배포된
   `f0b22c80…` 과도 다른 제3의 판본이다. 지금 `sync` 를 호출하면 새 문서 4개가 아니라 저쪽 구 규칙이
   덮인다. 손으로 복사하는 우회도 택하지 않았다 — 실행 중인 훅 역시 저쪽 번들이라
   `filid_fca-policy.md` 를 찾으므로 세션 규칙 포인터가 깨진다. **이 브랜치의 플러그인이 설치·갱신된
   뒤 `/filid:setup` 을 돌리는 것이 정상 경로다.** 그때까지 이 저장소의 `.claude/rules/` 와 루트
   `AGENTS.md` 는 구 320줄 문서를 유지한다.

### 이 작업과 무관한 관측 사실

- `yarn lint` 는 사전에 이미 실패 상태다 — 11 errors / 2 warnings. 전부 이번 변경이 건드리지 않은
  파일이며(`types/*`, `mcp/server/*`, `mcp/tools/reviewState/*`, `constants/reviewState.ts`),
  마지막 변경 커밋은 `c7674934` · `4237e450` · `dd6b49f4` 로 모두 이번 작업 이전이다.
- 이 작업 결과가 커밋 `937ce29b` 로 남아 있으나 **이 세션이 `git commit` 을 실행하지 않았다**.
  같은 창에서 `569f1354` (organ exemption · dependency graph 작업, 이 세션과 무관) 도 함께 나타났다.
  동시에 작업 중인 다른 세션 또는 외부 커밋 경로가 있는 것으로 보인다.
