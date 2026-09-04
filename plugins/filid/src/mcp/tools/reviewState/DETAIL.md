# review_state — Filid 1.0 Contract

## Requirements

- `prepare`, `checkpoint`, `validate`, `seal`, `cleanup`, `assess` 여섯 action만 지원한다.
- `prepare`는 merge-base와 committed changed-file blob으로 source hash를 계산하고 변경 roster·FCA 증거·review group을 한 snapshot에서 만든다. 모든 canonical artifact를 먼저 쓴 뒤 `ReviewStateRecord` v2를 마지막에 한 번 atomic 저장한다.
- roster는 NUL-safe Git name-status와 numstat에서 A/M/D·owner·churn·binary를 보존하고 `fileHashes` key 집합과 정확히 일치해야 한다. 다르면 축소하지 않고 internal error다.
- FCA 후보는 같은 snapshot에서 변경 path·그 ancestor·owner와 교차하는 structure/verification finding만 `(path, rule, message)`로 중복 제거하고 정렬해 `FCA-NNN`을 부여한다. 같은 key는 error severity가 이기며 info는 informational 관측으로 남는다.
- project-root finding은 ancestor만으로 교차하지 않고 root owner가 같은 때만 포함한다. verification status에는 같은 path·owner 또는 owner 아래 변경과 교차하는 verification file만 반영하지만 graph certainty와 non-finding diagnostic은 project-wide다.
- `evidence.md`는 schema 7 frontmatter와 Changed Scope, Candidates, Informational, Out-of-scope Observations, Diagnostics를 atomic하게 기록한다. 범위 밖 finding은 source·rule·severity별 count로만 남기고 finding diagnostic은 중복 기록하지 않는다.
- prepare는 dirty path를 `clean | documents-only | generated-only | source-dirty`로 관측하되 판정하지 않는다. documents-only와 source-dirty도 artifact를 만들고 최종 fold에서 inconclusive가 된다.
- fresh/force는 branch directory의 stale artifact를 지우고 처음부터 만든다. 같은 hash의 prepared state는 resumable이고 같은 hash의 sealed state와 report가 함께 있을 때만 cached다. schema v1은 prepare에서 fresh로 재생성하고, 다른 action에서는 `missing`과 `review-state-schema-mismatch` 진단으로 처리한다.
- resumable에서 `evidence.md`와 완전한 state가 있고 effort가 같으면 선별·청킹·그룹화를 되살리고 누락된 diff·brief·round-1 skeleton·session만 쓰며 state는 다시 저장하지 않는다. effort가 바뀌면 group round와 review brief를 새 effort에 맞춰 다시 쓰되 기존 opinion과 validation 기록을 보존하고, 기록된 round가 새 round 수보다 작으면 review validation의 complete를 false로 낮춘다. 완료 상태를 incomplete로 낮춘 group은 마지막 검증 round 다음 skeleton을 새로 만들고 brief output을 그 경로로 돌린다. evidence가 없으면 범위 산출부터 다시 만들되 기존 opinion과 validation 기록을 보존한 state를 마지막에 다시 저장한다.
- 파일 role은 generated → deleted source → binary → lockfile → document → verification → source 순서로 결정한다. generated·deleted·binary·lockfile만 skip reason을 가지며 모든 roster 항목은 session에 남는다.
- review 규칙은 plugin rule map의 `always`, glob `match`, role·owner `when`을 선언 순서대로 적용한다. repository override는 additive이고 `replaces`로 built-in ID를 제거할 수 있으며, 인라인 rule body와 읽어야 할 repository rule path를 구분한다.
- review glob의 `**/` 접두는 root 파일에도 맞추지만 generated-path matcher의 segment-prefix 계약은 바꾸지 않는다. repository rule file은 project root 안의 non-symlink target이어야 한다.
- 파일 churn이 `groupChurnLimit` 이하면 unit 하나다. 초과하면 hunk 경계에서 누적하고, 단일 oversized hunk만 old/new line을 추적하며 줄 단위로 나눠 모든 unit을 churn 상한 안에 둔다.
- unit은 owner(null은 마지막)·path 순서로 그룹화한다. 작은 변경 shortcut도 file·churn 설정 상한으로 clamp하고, chunked file의 unit은 순차 dependency를 가진 별도 group이 된다. ID는 `01`부터 상한 없이 두 자리 이상 zero-padding한다.
- effort는 low·medium·high를 각각 1·2·3 round로 정하고 기본값은 medium이다. file·churn·plan·concurrency 기본값은 각각 10·800·50·8이며 작은 변경 shortcut의 상수 threshold는 file 4·churn 200이다.
- `planRequired`는 unit chunk 크기가 아니라 원본 파일 churn으로 결정한다. FCA candidate는 path 일치, owner 일치, `01` 순서에서 가장 작은 한 group에만 배정한다.
- reviewable unit 없이 candidate만 있으면 rounds 0의 `01` group과 complete empty merged opinion, validation hash, verify brief를 만든다. 둘 다 없으면 group도 없다.
- group 확정 뒤 각 unit의 diff를 ordinal이 붙은 고유 경로에 쓰고 review brief, round-1 opinion skeleton과 session을 만든다. brief는 group 파일, prior opinion, 전체 roster, candidate, repository rule path, 적용된 rule body와 JSON output contract를 담는다.
- `validate`는 review·verify JSON의 구조와 배정 범위를 검사하는 유일한 지점이다. 문제는 pass로 바꾸지 않으며, review finding의 위치를 committed source에서 확정하고 round를 결정적으로 병합한다.
- `seal`은 complete review validation과 결합된 verify validation의 hash가 현재 artifact와 모두 일치하는 group만 신뢰한다. reviewer skip, gap, 누락·변조·미완 validation은 `INCONCLUSIVE` 근거로 남긴다. worktree가 이미 documents-only 또는 source-dirty이면 reviewer 실행을 건너뛰는 경로를 지원하기 위해 `OPINIONS_MISSING`을 반환하지 않고, 병합 opinion이 전혀 없어도 같은 fold를 끝까지 실행해 봉인된 `INCONCLUSIVE`를 만든다.
- verdict는 trusted opinion과 verification의 결정적 fold로만 계산한다. 렌더링이 끝난 뒤 state verdict와 sealed phase를 기록하며 이미 sealed인 state는 다시 렌더링하지 않는다.
- `checkpoint`는 state와 group별 artifact 존재를 읽기만 한다. `assess`는 dirty 경로, entry stage, base ref와 unpushed commit 수를 관측만 하고 state를 읽거나 쓰지 않는다. 재검증 보고서 frontmatter의 유일한 유효 전체 `head_sha`가 관측한 현재 Git HEAD와 일치하고, 기록된 `verdict`가 `PASS`, `FAIL`, `INCONCLUSIVE` 중 하나일 때만 완료 근거로 사용한다. `cleanup`은 literal `confirm: true` 뒤 해당 branch directory만 지운다.

## API Contracts

- prepare input은 `{ action: "prepare", projectRoot, branchName, baseRef, force?, effort? }`이다. effort는 input → `config.review.effort` → `medium` 순서이고 concurrency는 `config.review.concurrency` → 기본 상수 순서다.
- validate input은 `{ action: "validate", projectRoot, branchName, kind, group, round? }`이다. review kind는 범위 안의 round가 필수이고 verify kind는 round를 금지한다. group은 `^\d{2,}$`이며 state에 존재해야 한다.
- seal input은 `{ action: "seal", projectRoot, branchName, baseRef? }`이고, state·matching hash·session을 요구한다.
- state v2는 root·branch·base, source/file hash, phase와 timestamp 외에 `effort`, `groups`, prepare의 전체 `scope` snapshot, nullable `verdict`를 가진다. group은 unit·churn·dependency·candidate·artifact path·round와 review/verify validation hash를 보존한다.
- scope file은 path·change·insertions·deletions·binary에 role·owner·nullable skip reason·rule ID·repository rule path를 더한다. unit은 nullable chunk index/total, churn, old/new hunk range와 review-directory-relative diff path를 가진다.
- group의 review validation은 nullable `{ round, sha256, complete }`, verify validation은 nullable `{ sha256, reviewSha256 }`다. state verdict는 `APPROVED | REQUEST_CHANGES | INCONCLUSIVE | null`이다.
- state 파일이 없으면 `missing`, schema version이 2가 아니면 schema mismatch, v2 구조가 malformed이거나 group ID에서 유도한 canonical artifact path와 다르면 `STATE_INVALID` error다. prepare만 schema mismatch를 fresh로 낮춘다.
- 모든 review artifact path는 중앙 resolver가 review directory 안으로 제한하고 traversal과 descendant symlink를 거부한다. group artifact 이름은 검증된 group ID로만 조합한다.
- prepare summary는 action·disposition·source/snapshot hash·file/unit/group/candidate count·evidence completeness·worktree·effort·concurrency를, cached일 때 verdict도 싣는다. data는 review/state/evidence/session path와 file·group·candidate snapshot, count·dirty path·status를 싣는다.
- built-in rule map은 schema version 1과 `{ id, always?, match?, when?, file }` entry를 가진다. repository override는 `{ rules: [{ id, match?, always?, file, replaces? }] }`이고 override file은 project-relative path다.
- group diff는 `diffs/<group>/<ordinal>-<basename>[.<k>-of-<n>].diff`로 materialize한다. review brief frontmatter는 group·rounds·plan-required·dependency·source hash·base ref·output을, 본문은 Files, Prior Opinions, Other Changed Files, FCA Candidates, Repository Rules, Rules, Output Contract를 이 순서로 가진다.
- session frontmatter는 schema·branch·base ref·source hash·review directory·changed-file count·effort·created-at을 가진다. Change Context pending marker와 모든 roster path의 status·reason·group checklist를 함께 쓴다.
- review opinion은 schema 7, group, round, state, sourceHash, 배정 file 결과, finding, checked, gap, nullable risk plan을 가진 JSON이다. `chunk`는 `"k/n"` 또는 null이고 file result는 `reviewed | skipped`, state는 `COMPLETE | INDETERMINATE`다. skipped result는 reason이 필수이고 indeterminate state는 gap이 하나 이상이어야 한다.
- review finding ID는 group별 `R<group>-<NNN>`이고 severity는 `error | warning`, category는 `bug | security | performance | maintainability | test | documentation | contract | structure | verification`이다. path는 배정 unit이어야 하며 `existingCode`, rule, message, evidence, consequence, recommendedAction은 비어 있지 않아야 한다.
- review validation problem code는 `parse-error`, `schema-mismatch`, `source-hash-mismatch`, `file-missing`, `file-unassigned`, `result-invalid`, `finding-id-invalid`, `enum-invalid`, `field-empty`, `path-unassigned`, `gap-required`다. missing file은 `indeterminate`와 `review-opinion-invalid` 진단이고, 내용 문제는 `ok: false`인 정상 payload다.
- finding line은 먼저 배정 unit의 hunk에서, 다음으로 HEAD file 전체에서 trim 단위로 `existingCode`를 찾는다. 유일한 위치만 `start-end`와 `inDiff`를 기록하고 나머지는 `unknown`, false다.
- round 1은 merged opinion을 만들고 이후 round는 `(path, lines, rule, existingCode)`로 deduplicate한 뒤 ID를 다시 순번화한다. files·checked·gaps는 합집합, state는 어느 입력이든 indeterminate이면 indeterminate, round는 최대값이다. 새 finding이 없으면 어느 round에서든 종료한다.
- review validate summary는 disposition `validated`, kind·group·round·ok·problem/findings/new-findings count·next round를 싣고 data는 problem 목록, merged opinion path와 verify brief path를 싣는다. 성공한 merged opinion의 hash와 complete 여부를 state에 쓰고 기존 verify validation은 지운다.
- review validate는 다음 round가 필요할 때만 배정 unit 전체가 pending인 skeleton을 만들고, 마지막 round 또는 new finding 0이면 complete를 기록한다. rounds 0 group에 review validate를 호출하면 error다.
- verify brief는 group·source hash·output frontmatter, group Files, reviewer finding과 배정 FCA candidate를 합친 Decisions Required, Prior Verifier Guidance, verify Output Contract를 가진다. diff 밖의 non-USR/non-FCA finding은 hunk range로 refute할 대상임을 명시한다.
- verify opinion은 schema 7, group, state, sourceHash, decision, observation, checked를 가진 JSON이다. decision은 verify brief의 모든 ID와 정확히 일치하며 verdict는 `CONFIRMED | REFUTED | INDETERMINATE`, evidence와 reason은 비어 있지 않다.
- verify는 complete review validation 뒤에만 실행한다. 성공하면 verify file hash와 현재 review hash를 함께 기록하고, summary에 confirmed·refuted·indeterminate count, data에 problem과 verify path를 싣는다.
- seal은 validation hash가 없는 group을 `review rounds incomplete`, `artifact not validated`, `artifact modified after validation`, `verifier decided a superseded opinion` 중 해당 이유와 함께 unresolved evidence로 취급한다. opinion schema를 다시 검사하지 않는다. reviewable unit이 있는데 병합 opinion이 하나도 없으면 `review-opinions-missing`이지만, documents-only 또는 source-dirty worktree는 그 자체가 결정적인 inconclusive 근거이므로 누락 opinion도 unresolved evidence로 fold하고 봉인한다.
- checklist는 prepare skip reason을 `skipped`, 모든 unit이 reviewed이면 `reviewed`, reviewer skip·missing opinion·pending unit이면 `pending`으로 정규화한다. reviewer skip reason은 unresolved evidence에도 남긴다.
- fold는 evidence incomplete, documents-only/source-dirty worktree, trusted group artifact 부재, pending checklist, opinion gap, verifier opinion의 `INDETERMINATE` state, severity와 무관한 candidate의 indeterminate decision을 순서대로 `INCONCLUSIVE`로 만든다. 그 뒤 confirmed candidate가 있으면 `REQUEST_CHANGES`, 아니면 `APPROVED`다.
- `review-report.md` 형식은 스킬이 독립적으로 실행할 수 있도록 `skills/cross-review/report-formats.md`에서 정의한다. 구현은 schema 7 frontmatter 뒤 Scope, Evidence Status, Coverage, Verification Log, Confirmed Findings, Refuted Candidates, Unresolved Evidence, Final Verdict를 순서대로 렌더링하고 confirmed path에 확정 line을 붙인다.
- `fix-requests.md`는 `REQUEST_CHANGES`일 때만 seal이 렌더링한다. 항목은 `FIX-001`부터이며 canonical 여덟 필드 `Severity`, `Category`, `Path`, `Rule`, `Claim`, `Evidence`, `Consequence`, `Recommended Action`의 세부 블록은 `skills/cross-review/templates.md`의 fix-request 절을 정본으로 참조한다.
- `pr-comment.md` 형식은 스킬이 독립적으로 실행할 수 있도록 `skills/cross-review/report-formats.md`에서 정의한다. 구현은 `## Code Review Governance — <verdict>` 표, 세 개의 details block과 report pointer를 렌더링한다.
- seal summary는 verdict·file coverage·decision count를, data는 report path, nullable fix-request path, PR comment path와 session path를 싣는다. session checklist block도 같은 fold 결과로 통째로 교체한다.
- checkpoint는 state의 effort·groups와 top-level 및 group별 diff·brief·opinion·verify 존재를 반환한다.
- `assess` summary는 `entryStage`, `worktreeDisposition`, `baseRef`, `unpushedCommits`, `dirtyPathCount`를 싣고 data의 assessment가 경로 목록을 담는다. 값은 관측 사실이며 중단 지시가 아니다.
- `assess`의 완료 근거는 report template의 평평한 `key: scalar` frontmatter 안의 단일 `head_sha`와 `verdict`다. 전체 Git SHA-1 또는 SHA-256의 소문자 hex와 `PASS | FAIL | INCONCLUSIVE` 중 하나인 판정을 요구한다. 본문, 누락, 중복·모호한 키, 불완전한 frontmatter나 축약 SHA는 근거가 아니다. HEAD를 관측할 수 없거나 값이 다르거나 유효한 판정이 없으면 justifications → fix requests → PR → pr-create 순서로 재개한다.
- phase는 `prepared | sealed`이고 lifecycle disposition은 `fresh | resumable | cached | stale | missing | validated | sealed | cleaned`이다.
- payload 생성 시 diagnostic 생략은 module-scope readonly empty collection을 재사용한다.

## Acceptance Criteria

### AC-review-prepare — 결정적 준비와 재개

- 같은 committed content와 effort에서 roster, snapshot hash, group과 artifact path가 결정적이며 state는 모든 prepare artifact 뒤 마지막에 한 번만 나타난다.
- prepared state는 같은 source hash이면 effort와 무관하게 누락 artifact부터 resume하고 기존 opinion을 덮어쓰지 않는다. effort 변경은 group round와 review brief를 갱신하고 부족한 round의 review validation을 incomplete로 낮춘다. sealed state는 matching hash와 report가 있어야 cached이며 cached summary는 state verdict를 복원한다.
- crash로 state가 없거나 schema v1이면 stale canonical artifact를 지운 fresh prepare가 되고 malformed v2는 error로 드러난다.
- evidence와 session frontmatter는 review schema 7을 선언하고 session checklist에 모든 `(path, change)`를 한 번씩 보존한다.

### AC-review-select — roster 전체 보존

- generated, deleted, binary, configured lockfile은 정확한 skip reason과 함께 남고 document, verification, source는 reviewable로 남는다.
- deleted file은 source role을 유지하고 binary numstat `-`는 binary flag로 보존한다.
- reviewable file이 없어도 skipped roster는 evidence와 session에서 사라지지 않는다.

### AC-review-chunk — bounded hunk unit

- 파일 churn이 상한 이하면 하나의 unit이고 초과하면 순서가 보존된 hunk-boundary unit으로 나뉜다.
- 단일 oversized hunk는 old/new line 진행을 보존한 새 hunk header로만 분할하며 context를 새로 복제하지 않는다.
- 어떤 unit도 configured group churn cap을 넘지 않고 모든 원 diff line은 정확히 한 unit에 남는다.

### AC-review-group — 결정적 그룹과 candidate 귀속

- 작은 변경 shortcut은 unit count와 total churn 모두 configured cap과 상수 threshold 중 작은 값 이하여야 한다.
- 일반 grouping은 owner·path·stem 인접성을 보존하며 file·churn cap 전에 끊고, chunked file의 group은 바로 앞 chunk에만 의존한다.
- group ID는 `01`, `02`, …, `99`, `100`처럼 상한 없이 증가하고 `planRequired`는 원본 file churn으로 계산한다.
- candidate는 path, owner, first group fallback으로 정확히 한 group에 들어간다. candidate-only group은 rounds 0의 validated empty review와 verify brief를 가진다.

### AC-review-rules — 적용 규칙과 저장소 경계

- built-in rule은 always → match/when 선언 순서를 보존하고 source인데 같은 group에 verification 변경이 없는 파일에도 tests rule을 보강한다.
- repository override는 additive이고 `replaces`만 해당 built-in ID를 제거하며, 없는 파일은 빈 override이고 JSON parse failure는 error다.
- repository rule path는 project root 밖이나 symlink 밖으로 나갈 수 없고 reviewer brief에는 body 대신 읽어야 할 project-relative path로 남는다.
- `**/`로 시작한 review glob은 root 경로에도 맞지만 generated-path 판정의 기존 prefix 의미는 변하지 않는다.

### AC-review-validate — JSON 검증과 hash handoff

- 배정 file 집합, result, finding ID·enum·path·필수 text와 indeterminate gap을 전부 검사하고 하나라도 불명확하면 pass로 만들지 않는다.
- round merge는 distinct unknown-line finding을 `existingCode`로 구분하고 새 finding이 없는 즉시 다음 round를 만들지 않는다.
- review 성공은 merged hash·round·complete를 기록하고 verify validation을 무효화한다. verify 성공은 file hash와 그 review hash를 함께 기록한다.
- verify decision은 brief의 reviewer finding과 FCA candidate ID를 빠짐없이 정확히 한 번 판정한다.

### AC-review-seal — 신뢰 가능한 fold와 canonical rendering

- current hash와 session이 없으면 seal하지 않고, reviewable unit이 있는데 merged opinion이 하나도 없으면 `review-opinions-missing`으로 indeterminate다. 단, documents-only 또는 source-dirty worktree는 reviewer를 실행하지 않는 경로이므로 누락 group evidence를 포함해 `INCONCLUSIVE`로 봉인한다.
- complete·review hash·verify hash·review/verify 결합 중 하나라도 깨진 group은 trusted input이 아니며 이유가 unresolved evidence에 남는다.
- pending coverage, evidence gap, verifier-level indeterminate와 severity와 무관한 indeterminate decision은 confirmed finding보다 먼저 `INCONCLUSIVE`를 만든다. 모든 증거가 complete일 때 confirmed가 있으면 `REQUEST_CHANGES`, 없으면 `APPROVED`다.
- report, optional fix request, PR comment와 session checklist가 같은 fold 결과를 표현한 뒤에만 state가 sealed 되고 verdict가 저장된다.

### AC-review-assess — 관측 사실만

- 같은 worktree·config·현재 HEAD·보고서 근거는 같은 dirty classification과 entry stage를 반환하며 state를 읽거나 만들거나 고치지 않고 Git도 읽기 전용으로 관측한다.
- generated-path 설정이 없으면 non-document dirty path를 source로 본다. 현재 HEAD와 일치하는 유효 `head_sha`와 인정된 `verdict`가 함께 있을 때만 complete를 만들며, 오래되거나 없거나 불완전한 보고서는 justifications → fix requests → PR → pr-create 우선순위를 유지한다.
- LF와 CRLF frontmatter를 읽고 본문의 `head_sha`는 무시한다. 중복·모호한 head metadata는 현재 HEAD와 같은 값이 섞여 있어도 완료 근거가 아니다.
- `verdict` 누락과 `PASS | FAIL | INCONCLUSIVE` 밖의 값은 현재 HEAD와 일치해도 재개한다. 세 가지 유효한 판정은 모두 기존 complete 동작을 유지한다.

### AC-review-cleanup — Scoped deletion

- confirm 부재와 empty/traversal branch를 거부하고 다른 branch state를 보존한다.

## Last Updated

2026-09-05 — assess의 완료 근거에 현재 HEAD와의 일치 및 인정된 재검증 판정을 요구하고 불완전한 보고서의 재개 우선순위를 명시했다.
