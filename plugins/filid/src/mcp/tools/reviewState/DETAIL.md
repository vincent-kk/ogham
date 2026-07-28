# review_state — Filid 1.0 Contract

## Requirements

- `prepare`, `checkpoint`, `seal`, `cleanup` 네 action만 지원한다.
- branch 원문 digest를 포함하는 collision-safe key를 만들고 review directory를
  project review root 안에 둔다.
- prepare는 merge-base와 committed changed-file blob으로 deterministic hash를
  계산하고 prepared state를 atomic 저장한다.
- fresh/force prepare는 exact branch directory의 이전 canonical review
  artifact만 제거하고 새 report 전에는 seal할 수 없게 한다.
- cache hit는 같은 hash의 sealed state와 existing review report에만 허용한다.
- seal은 current hash가 prepared hash와 같고 review report가 있을 때만 성공한다.
- cleanup은 explicit confirmation 뒤 해당 branch directory만 삭제한다.

## API Contracts

- Input은 Plan of Record의 discriminated `ReviewStateInput`이다.
- state는 schema version, root/branch/base, base commit, content/file hashes,
  prepared/sealed timestamp와 status를 가진다.
- checkpoint는 state와 canonical artifact 존재 여부를 read-only로 반환한다.
- changed path는 Git NUL-delimited output으로 읽고 정렬하며 tree mode/type/object
  identity를 hash input에 포함한다.
- deleted file identity는 stable sentinel로 hash input에 포함한다.
- phase는 `prepared | sealed`이고 disposition은
  `fresh | resumable | cached | stale | missing | sealed | cleaned`이다.
- prepare는 fresh/resumable/cached, checkpoint는 missing/stale/resumable/cached,
  seal 성공과 cleanup 성공은 각각 sealed/cleaned를 반환한다. seal 실패는
  stale/missing과 non-ok status를 반환한다.
- payload 생성 시 diagnostic 생략은 module-scope readonly empty collection을
  재사용하며 호출마다 정적 기본 배열을 만들지 않는다.

## Acceptance Criteria

### AC-review-lifecycle — Prepare to seal

- prepare → checkpoint → report 생성 → seal → checkpoint가 deterministic state를
  보존하고 content change 후 seal은 stale로 실패한다.

### AC-review-cache — Content-addressed reuse

- same committed content와 report는 cache hit, file content change는 miss다.
- commit amend처럼 blob content가 같은 변화는 hash를 바꾸지 않는다.
- fresh/force prepare 뒤 이전 report는 cache나 seal 근거로 재사용되지 않는다.

### AC-review-cleanup — Scoped deletion

- confirm 부재와 empty/traversal branch를 거부하고 다른 branch state를 보존한다.

## Last Updated

2026-07-27 — immutable payload default를 포함한 content-addressed lifecycle 계약.
