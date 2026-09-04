# review_state — Filid 1.0 Contract

## Requirements

- `prepare`, `checkpoint`, `scope`, `seal`, `cleanup`, `assess` 여섯 action만 지원한다.
- `scope`는 prepared state의 committed changed-file roster를 A/M/D·role·owner·churn과 함께 만들고 `fileHashes` key 집합과 일치하는지 확인한다. state가 없으면 `missing`, source hash가 다르거나 Git name-status 경로 집합이 `state.fileHashes` key 집합과 다르거나 sealed state이면 `stale`로 중단한다.
- `scope`는 한 snapshot에서 변경 파일·그 조상 디렉터리·owner와 교차하는 structure/verification 위반만 유지하고 `(path, rule, message)`로 중복 제거한 뒤 정렬 순서대로 `FCA-NNN`을 부여한다. 같은 key에서는 `error` severity가 이기며, `info` 행은 후보가 아닌 informational 관측으로 남긴다.
- `scope`는 working tree를 `clean | documents-only | generated-only | source-dirty` 중 하나로 관측할 뿐 판정하지 않고, canonical `evidence.md`에 frontmatter와 Changed Scope·Candidates·Informational·Out-of-scope Observations·Diagnostics 다섯 섹션을 atomic하게 기록한다. Out-of-scope Observations는 `(source, rule, severity)`별 count만 싣고, Diagnostics는 finding 행이 아닌 tool·adapter·snapshot 진단만 싣는다.
- `assess`는 merge-track이 재개할 지점을 정하는 데 필요한 **관측 사실**만 반환한다: dirty 경로 분류, entry stage, 해석된 base ref, unpushed commit 수. 판정하지 않으며 상태 파일을 읽거나 쓰지 않는다.
- dirty 경로 분류는 `structure.generatedPaths` config를 근거로 한다. `INTENT.md`/`DETAIL.md`는 document, 선언된 생성 경로에 걸리면 generated, 나머지는 source다. 첫 일치가 이긴다.
- 경로 패턴은 세그먼트 단위로 비교하고 `*`는 정확히 한 세그먼트에 대응한다. `**`도, 세그먼트 일부에 걸친 `*`도 없다 — 같은 트리는 언제나 같게 분류되어야 한다.
- entry stage는 review directory 파일 존재와 git 상태에서만 결정한다. 우선순위 순서가 계약이다.
- branch 원문 digest를 포함하는 collision-safe key를 만들고 review directory를 project review root 안에 둔다.
- prepare는 merge-base와 committed changed-file blob으로 deterministic hash를 계산하고 prepared state를 atomic 저장한다.
- fresh/force prepare는 exact branch directory의 이전 canonical review artifact만 제거하고 새 report 전에는 seal할 수 없게 한다.
- cache hit는 같은 hash의 sealed state와 existing review report에만 허용한다.
- seal은 current hash가 prepared hash와 같고 review report가 있을 때만 성공한다.
- cleanup은 explicit confirmation 뒤 해당 branch directory만 삭제한다.

## API Contracts

- Input은 Plan of Record의 discriminated `ReviewStateInput`이다.
- state는 schema version, root/branch/base, base commit, content/file hashes, prepared/sealed timestamp와 status를 가진다.
- checkpoint는 state와 canonical artifact 존재 여부를 read-only로 반환한다.
- changed path는 Git NUL-delimited output으로 읽고 정렬하며 tree mode/type/object identity를 hash input에 포함한다.
- deleted file identity는 stable sentinel로 hash input에 포함한다.
- phase는 `prepared | sealed`이고 disposition은 `fresh | resumable | cached | stale | missing | scoped | sealed | cleaned`이다.
- `assess`는 공통 payload를 쓴다. summary가 `entryStage`, `worktreeDisposition`, `baseRef`, `unpushedCommits`, `dirtyPathCount`를 싣고 data가 `assessment`에 경로 목록을 담는다. 판정 요약이 summary에 있는 이유는 payload가 예산을 넘겨도 summary가 남기 때문이다.
- `worktree.disposition`은 `clean | documents-only | generated-only | source-dirty`, `entryStage`는 `pr-create | review | resolve | revalidate | complete`이며, `baseRef`와 `unpushedCommits`는 해석할 수 없으면 `null`이다. 이 값들은 사실이지 지시가 아니다 — 무엇을 중단할지는 호출한 스킬이 정한다.
- `hasPullRequest`는 호출자가 준다. filid는 PR 동작을 소유하지 않으므로 생략은 "PR 없음"으로 읽는다.
- lifecycle action이 채우는 `disposition`과 `artifactCount`는 `assess`에 없다. 반대로 assess 필드는 다른 action에 없다.
- `scope` 성공 summary는 `action`, `disposition`, `sourceHash`, `snapshotHash`, `filesTotal`, `candidateCount`, `evidenceComplete`, `worktree`를 보존한다. data는 review/state/evidence 경로, file roster, 후보, out-of-scope·informational 수, 최대 20개 dirty path와 structure/verification status를 싣는다.
- `scope` 실패는 기존 state-missing 및 `review-source-hash-stale` diagnostic을 재사용하고 sealed state에는 `review-state-sealed`를 반환한다.
- prepare는 fresh/resumable/cached, checkpoint는 missing/stale/resumable/cached, seal 성공과 cleanup 성공은 각각 sealed/cleaned를 반환한다. seal 실패는 stale/missing과 non-ok status를 반환한다.
- payload 생성 시 diagnostic 생략은 module-scope readonly empty collection을 재사용하며 호출마다 정적 기본 배열을 만들지 않는다.

## Acceptance Criteria

### AC-review-lifecycle — Prepare to seal

- prepare → checkpoint → report 생성 → seal → checkpoint가 deterministic state를 보존하고 content change 후 seal은 stale로 실패한다.

### AC-review-cache — Content-addressed reuse

- same committed content와 report는 cache hit, file content change는 miss다.
- commit amend처럼 blob content가 같은 변화는 hash를 바꾸지 않는다.
- fresh/force prepare 뒤 이전 report는 cache나 seal 근거로 재사용되지 않는다.

### AC-review-assess — 관측 사실만

- 같은 워크트리와 같은 config에 대해 두 번 호출하면 같은 분류를 반환한다.
- `plugins/*/bridge`는 `plugins/filid/bridge/mcp.mjs`를 generated로 분류하고 `plugins/filid/src/bridge.ts`는 분류하지 않는다.
- `generatedPaths`가 없거나 비면 모든 non-document dirty 경로가 source다.
- entry stage는 `re-validate.md` → `justifications.md` → `fix-requests.md` → PR 존재 순으로 판정하며 첫 일치가 이긴다.
- `assess`는 review state 파일을 만들지도 고치지도 않는다.

### AC-review-scope — 변경 범위 증거

- prepared state가 없으면 `missing`, 재계산한 source hash가 다르거나 Git name-status 경로 집합이 `state.fileHashes` key 집합과 다르면 `stale`다.
- roster는 A/M/D·role·owner·churn을 싣고 `fileHashes` key 집합과 같다.
- 변경 범위와 교차하는 위반만 `(path, rule, message)`로 중복 제거한 `FCA-NNN` 후보가 되며 ID는 정렬 순서다.
- working tree가 더러우면 `clean | documents-only | generated-only | source-dirty` 중 하나로 관측만 한다.
- `evidence.md`는 frontmatter와 Changed Scope·Candidates·Informational·Out-of-scope Observations·Diagnostics 다섯 섹션을 가지며, 범위 밖 행은 규칙별 count로 축약되고 finding diagnostic은 중복 기록되지 않는다.

### AC-review-cleanup — Scoped deletion

- confirm 부재와 empty/traversal branch를 거부하고 다른 branch state를 보존한다.

## Last Updated

2026-09-04 — 변경 범위 roster와 FCA 증거를 canonical `evidence.md`로 수집하고 범위 밖·진단 행을 중복 없이 요약하는 `scope` action 계약을 추가했다.
