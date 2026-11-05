# Phase 0 — S10 `documents` 표본 원문

> [s10-documents.md](./s10-documents.md)의 표본이 디스크에 쓴 산출물 전문이다. 편집하지 않았다.
> 응답 원문은 저장하지 않았다. T3은 판정 대상인 `README.md`와 `docs/retry.md`만 싣는다.

### t1-control-1

`src/sync/README.md`

``````markdown
# Sync module

This module fetches feed entries in batches and merges the returned pages into a single list. Its public entry point exports `fetchPages`, `mergeFeeds`, and the `FeedEntry` type.

## Fetching pages

`fetchPages(ids, fetchBatch)` splits the IDs into batches of at most `MAX_BATCH` (200), calls the supplied async `fetchBatch` for each batch, and returns one page per batch in input order. An empty ID list produces no calls and returns an empty array. A rejected batch stops the operation and propagates the error.

The limit of 200 exists because the upstream API rejects larger requests with HTTP 413. Batches are fetched sequentially on purpose: the upstream rate limit is per connection, and parallel requests once caused the service key to be suspended. Preserve this behavior when changing the fetching code.

## Merging pages

`mergeFeeds(pages)` deduplicates entries by `id` first, keeping the copy with the greatest `fetchedAt` string. If copies have equal `fetchedAt` values, the first encountered copy wins. It then sorts the retained entries by `publishedAt` string in descending order. The timestamp strings must therefore have a format whose lexicographic order matches their chronological order.

The upstream feed API can return the same entry twice with different `fetchedAt` values when a page boundary falls on that entry. An earlier implementation sorted first and kept the first copy it encountered, which exposed stale titles to users. Do not change the order of deduplication and sorting without talking to the data team.

`mergeFeeds.test.ts` covers duplicate selection, publication ordering, and the batch-size limit. Run the module's tests with `npm test`.
``````

### t1-control-2

`src/sync/README.md`

``````markdown
# Feed synchronization

This module fetches feed entries in batches and merges the resulting pages. Its public entry point exports `fetchPages`, `mergeFeeds`, and the `FeedEntry` type. Each entry has an `id`, `title`, `publishedAt`, and `fetchedAt`.

## Fetching pages

`fetchPages(ids, fetchBatch)` splits IDs into batches of at most `MAX_BATCH` (200), calls the supplied asynchronous `fetchBatch` once per batch, and returns one page per batch in input order. The limit is 200 because the upstream API rejects larger requests with HTTP 413. An empty ID list produces no requests and returns an empty array. A failed request rejects the operation; there is no retry here.

Batches are fetched sequentially on purpose. The upstream rate limit is per connection, and parallel requests once caused the service key to be suspended. Preserve this behavior when changing the fetch path.

## Merging pages

`mergeFeeds(pages)` first deduplicates entries by `id`, keeping the copy with the greatest `fetchedAt` string. If those values are equal, the first copy encountered wins. It then sorts the retained entries by `publishedAt` string in descending order. The timestamps must therefore have a consistently sortable string format.

The upstream API can return the same entry twice with different `fetchedAt` values when a page boundary falls on that entry. An earlier implementation sorted first and kept the first copy it encountered, which exposed stale titles to users. Do not change the order of deduplication and sorting without talking to the data team.

The tests in `mergeFeeds.test.ts` cover duplicate selection, ordering, and the batch size limit. Run them with `npm test`.
``````

### t1-control-3

`src/sync/README.md`

``````markdown
# Feed synchronization

This module fetches batches of feed entries and merges the resulting pages. Its public entry point exports `fetchPages`, `mergeFeeds`, and the `FeedEntry` type.

- `fetchPages(ids, fetchBatch)` splits IDs into batches of at most `MAX_BATCH` (200), calls the supplied async fetcher for each batch, and returns one page per batch in request order. An empty ID list returns no pages. Fetch failures propagate to the caller.
- `mergeFeeds(pages)` deduplicates entries by `id`, keeping the copy with the greatest `fetchedAt` string, then sorts the retained entries by `publishedAt` string in descending order. If duplicate copies have equal `fetchedAt` values, the first encountered copy wins. The timestamp strings must therefore have a format whose lexical order matches chronological order.

## Constraints to preserve

- The upstream API can return an entry twice with different `fetchedAt` values when a page boundary falls on it. Deduplication must happen before sorting: an earlier implementation sorted first and kept the first copy it encountered, exposing stale titles. Talk to the data team before changing the order of these steps.
- `MAX_BATCH` is 200 because the upstream API rejects larger requests with HTTP 413.
- `fetchPages` deliberately awaits batches one at a time. The upstream rate limit is per connection, and parallel requests once caused the service key to be suspended.

The existing `mergeFeeds.test.ts` covers duplicate selection, ordering, and the batch size limit.
``````

### t1-control-4

`src/sync/README.md`

``````markdown
# `src/sync`

Fetches feed entries from the upstream feed API in batches and merges the
results into a single list with no duplicates, newest first.

This module does not make HTTP calls itself. The caller passes in a
`fetchBatch` function that requests one batch of ids from the upstream API.
`src/sync` decides how the ids are split into batches, the order the batches
are requested in, and how the returned pages are combined.

## Files

| File | Contents |
| --- | --- |
| `index.ts` | Public exports: `fetchPages`, `mergeFeeds`, type `FeedEntry`. |
| `types.ts` | `FeedEntry`: one entry as the upstream API returns it (`id`, `title`, `publishedAt`, `fetchedAt`, all strings). |
| `fetchPages.ts` | `fetchPages(ids, fetchBatch)` and the `FetchBatch` type. |
| `mergeFeeds.ts` | `mergeFeeds(pages)`, plus `MAX_BATCH` and `toBatches(ids)`. |
| `mergeFeeds.test.ts` | Vitest tests for `mergeFeeds` and `toBatches`. |

`MAX_BATCH` and `toBatches` are in `mergeFeeds.ts`, not `fetchPages.ts`, and
`index.ts` does not export them. Look there when you change batching.

## Data flow

```
ids ──toBatches──▶ batches of ≤ MAX_BATCH ids
    ──fetchPages──▶ one page (FeedEntry[]) per batch, requested one at a time
    ──mergeFeeds──▶ one FeedEntry[] with no duplicate ids, sorted by publishedAt, newest first
```

## Constraints: read this before you change the module

The reasons below come from the module's original author. They describe how
the upstream API behaves, and you cannot check them from this repository.

### 1. `mergeFeeds` removes duplicates before it sorts. Do not swap these steps.

The upstream API returns the same entry twice, with different `fetchedAt`
values, whenever a page boundary falls on that entry. `mergeFeeds` first
collapses entries by `id` and keeps the copy with the latest `fetchedAt`. Only
then does it sort.

An earlier version sorted first and kept the first copy it met. That version
showed stale titles to users.

**Do not change the order of these two steps without talking to the data team
first.**

The test `keeps the most recently fetched copy of a duplicated entry` in
`mergeFeeds.test.ts` covers the stale-title case.

### 2. `MAX_BATCH` is 200 because the upstream API rejects larger requests.

The upstream API answers requests for more than 200 ids with HTTP 413.
Do not raise `MAX_BATCH`. Lowering it avoids the 413 but means more
requests, sent one after another (see the next section).

The test `never exceeds the batch limit` checks that `toBatches` honours
`MAX_BATCH`. It does not check that the value is 200.

### 3. `fetchPages` fetches batches one after another on purpose.

`fetchPages` waits for each `fetchBatch` call to finish before it starts the
next one. Do not replace this with `Promise.all` or any other concurrent
approach. The upstream rate limit is per connection, and parallel requests
once got the service key suspended.

**No test covers this.** A change to concurrent fetching would pass the
current test suite.

## Behaviour details worth knowing

These follow from the current code. They are not documented requirements.

- **Timestamps are compared as strings.** `mergeFeeds` compares `fetchedAt`
  with `>` and sorts `publishedAt` with `localeCompare`. Both work only if the
  upstream timestamps sort the same way as text and as time, which is true of
  ISO 8601 strings in one consistent format and timezone. If the upstream
  format changes, deduplication and ordering can silently break.
- **Ties on `fetchedAt`:** if two copies of an entry have the same
  `fetchedAt`, `mergeFeeds` keeps the first one it meets in page order.
- **Ties on `publishedAt`:** entries with the same `publishedAt` stay in the
  order their `id` was first seen. JavaScript's `sort` is stable.
- **Errors in `fetchPages`:** there is no retry and no error handling. If any
  `fetchBatch` call rejects, `fetchPages` rejects with that error, and the
  pages already fetched are lost.
- **Sequential only within one call:** `fetchPages` sends requests one at a
  time within a single call. Nothing in this module stops a caller from
  running several `fetchPages` calls at once. Whether that would break the
  per-connection rate limit depends on how the caller's `fetchBatch` uses
  connections.
- **Empty input:** `fetchPages([], fetchBatch)` returns `[]` and never calls
  `fetchBatch`. `mergeFeeds([])` returns `[]`.

## Tests

```
npm test
```

This runs `vitest run`. `package.json` does not list `vitest` as a
dependency, so install it first if it is missing.

Covered: duplicate handling and newest-first ordering in `mergeFeeds`, and
the batch-size limit in `toBatches`.

Not covered: `fetchPages`, including its one-at-a-time behaviour.
``````

### t1-control-5

`src/sync/README.md`

``````markdown
# src/sync

업스트림 피드 API에서 엔트리를 배치 단위로 가져와(`fetchPages`), 중복을 없앤 최신순 목록 하나로 합치는(`mergeFeeds`) 모듈입니다.

이 모듈은 HTTP 요청을 직접 보내지 않습니다. 실제 요청은 호출하는 쪽이 `fetchBatch` 함수로 넘겨줍니다.

```ts
import { fetchPages, mergeFeeds } from './sync/index.js';

const pages = await fetchPages(ids, fetchBatch); // 배치 하나당 페이지 하나
const feed = mergeFeeds(pages);                  // 중복 제거 후 최신순 정렬
```

## 파일 구성

| 파일 | 내용 |
| --- | --- |
| `index.ts` | 공개 API: `fetchPages`, `mergeFeeds`, `FeedEntry` 타입. `MAX_BATCH`, `toBatches`, `FetchBatch`는 여기서 다시 내보내지 않습니다. |
| `fetchPages.ts` | `fetchPages`와 `FetchBatch` 타입. `toBatches`로 id를 나눈 뒤 배치를 하나씩 순서대로 가져옵니다. |
| `mergeFeeds.ts` | `MAX_BATCH`, `toBatches`, `mergeFeeds` |
| `types.ts` | `FeedEntry` (`id`, `title`, `publishedAt`, `fetchedAt`, 모두 문자열) |
| `mergeFeeds.test.ts` | vitest 테스트 |

## 바꾸기 전에 반드시 알아야 할 제약 세 가지

아래 세 가지는 코드만 봐서는 이유를 알 수 없습니다. 모두 이 모듈을 처음 만든 사람이 남긴 설명이고, 실제 장애나 버그를 겪고 나서 생긴 제약입니다.

### 1. `mergeFeeds`는 정렬하기 전에 `id`로 중복부터 제거합니다

페이지 경계가 어떤 엔트리에 걸리면 업스트림 API는 그 엔트리를 `fetchedAt`만 다른 두 개의 사본으로 돌려줍니다. 그래서 `mergeFeeds`는 다음 순서로 동작합니다.

1. 모든 페이지를 훑으면서 `id`마다 `fetchedAt`이 가장 큰 사본 하나만 남깁니다.
2. 남은 엔트리를 `publishedAt` 내림차순(최신순)으로 정렬합니다.

예전 버전은 먼저 정렬한 다음 처음 만난 사본을 남겼고, 그 결과 사용자에게 오래된 제목이 보였습니다. 두 사본은 `publishedAt`이 같기 때문에 정렬만으로는 어느 쪽이 최신인지 가려지지 않습니다.

**이 두 단계의 순서는 데이터 팀과 먼저 이야기하지 않고는 바꾸면 안 됩니다.** 사본 중 하나를 고르는 규칙("`fetchedAt`이 가장 큰 것")도 같은 이유로 함부로 바꾸지 마세요.

코드를 보고 알 수 있는 세부 동작:

- `fetchedAt`은 문자열로 비교합니다(`>`). 업스트림이 모든 타임스탬프를 같은 형식의 ISO 8601로 줄 때만 올바르게 동작합니다. 형식이나 시간대 표기가 섞이면 비교 결과가 틀어집니다.
- `fetchedAt`이 정확히 같으면 먼저 나온 사본이 남습니다(`>`이지 `>=`가 아닙니다).
- 정렬은 `publishedAt.localeCompare`로 합니다. `publishedAt`이 같은 엔트리끼리는 처음 나온 순서를 유지합니다(`Array.prototype.sort`는 stable).

### 2. `MAX_BATCH`는 200입니다

업스트림 API는 id가 200개보다 많은 요청을 HTTP 413으로 거절합니다. `toBatches`는 이 값에 맞춰 id 목록을 나눕니다.

- 값을 올리지 마세요. 업스트림 제한이 바뀌었다는 확인을 먼저 받아야 합니다.
- 값을 내리는 것은 안전하지만 요청 수가 늘어나고, 요청이 순차 실행이므로(아래 3번) 전체 시간도 그만큼 길어집니다.
- 테스트는 배치가 `MAX_BATCH`를 넘지 않는지만 확인합니다. 값을 200이 아닌 다른 숫자로 바꿔도 테스트는 통과합니다.

### 3. `fetchPages`는 배치를 일부러 하나씩 차례로 가져옵니다

업스트림 rate limit은 연결 단위로 적용됩니다. 예전에 요청을 병렬로 보냈다가 서비스 키가 정지된 적이 있습니다.

- `Promise.all`이나 동시 실행 라이브러리로 바꾸지 마세요.
- 이 제약을 지키는 테스트는 없습니다. 코드 리뷰가 유일한 안전장치입니다.
- `fetchPages`는 자기 안에서만 순차 실행을 보장합니다. 호출하는 쪽에서 `fetchPages`를 여러 번 동시에 부르면 요청이 병렬로 나갑니다.

## 그 밖의 동작

- 배치 하나가 실패(reject)하면 `fetchPages` 전체가 reject되고, 그때까지 받은 페이지는 버려집니다. 재시도 로직은 없습니다.
- `toBatches`는 입력 `ids`의 중복을 제거하지 않습니다. 같은 id를 두 번 넘기면 두 번 요청하고, 중복은 나중에 `mergeFeeds`에서 정리됩니다.

## 테스트

```sh
npm test   # vitest run
```

현재 테스트가 확인하는 것:

- 중복된 엔트리 중 `fetchedAt`이 더 큰 사본이 남는다(1번 제약의 회귀 테스트입니다. 정렬을 먼저 하던 예전 방식이면 실패합니다).
- 결과가 `publishedAt` 기준 최신순이다.
- 배치가 `MAX_BATCH`를 넘지 않는다.

확인하지 않는 것: 최신 사본이 앞 페이지에 있는 경우, `MAX_BATCH`의 실제 값, `fetchPages`의 순차 실행.
``````

### t1-treatment-1

`src/sync/README.md`

``````markdown
# Sync maintenance

- `mergeFeeds` resolves duplicate IDs by keeping the copy with the latest `fetchedAt` before sorting. The upstream API can return an entry twice with different fetch times when a page boundary falls on it; keeping the wrong copy can show users a stale title. Do not change the order of deduplication and sorting without consulting the data team.
- `MAX_BATCH` is 200 because the upstream API rejects larger requests with HTTP 413.
- `fetchPages` fetches batches sequentially because the upstream rate limit is per connection. Parallel requests risk suspension of the service key.
``````

### t1-treatment-2

`src/sync/README.md`

``````markdown
# Sync maintenance

- The upstream feed API can return the same entry on both sides of a page boundary with different `fetchedAt` values. `mergeFeeds` must select the most recently fetched copy by `id` before sorting so that users do not see stale titles. Talk to the data team before changing the order of these steps.
- `MAX_BATCH` is 200 because the upstream API rejects larger requests with HTTP 413.
- `fetchPages` requests batches sequentially because the upstream rate limit is per connection. Parallel requests risk suspension of the service key.
``````

### t1-treatment-3

`src/sync/README.md`

``````markdown
# Sync maintenance

- `mergeFeeds` resolves duplicate IDs by keeping the copy with the latest `fetchedAt` before sorting. The upstream API can return an entry twice with different fetch times at a page boundary. Keeping the wrong copy can show users a stale title. Do not change the order of deduplication and sorting without talking to the data team.
- `MAX_BATCH` is 200 because the upstream API rejects larger requests with HTTP 413.
- `fetchPages` requests batches sequentially because the upstream rate limit is per connection. Parallel requests risk suspension of the service key.
``````

### t1-treatment-4

`src/sync/README.md`

``````markdown
# src/sync

Why this module is built the way it is. Each constraint below comes from the behaviour of the upstream feed API, which the code does not show.

## `mergeFeeds` removes duplicates before it sorts

The upstream API returns the same entry twice, with different `fetchedAt` values, whenever a page boundary falls on that entry. The copy with the later `fetchedAt` holds the current title. `mergeFeeds` therefore first collapses entries by `id`, keeping the most recently fetched copy, and only then sorts by `publishedAt`. Sorting first and keeping the first copy met shows users stale titles.

Do not change the order of these two steps without talking to the data team.

## `MAX_BATCH` is 200

The upstream API rejects requests larger than this with HTTP 413. Raising `MAX_BATCH` makes `toBatches` produce batches that the upstream refuses.

## `fetchPages` requests one batch at a time

The sequential `await` is deliberate. Do not replace it with `Promise.all` or a concurrency pool: the upstream rate limit is per connection, and concurrent requests can get the service key suspended.
``````

### t1-treatment-5

`src/sync/README.md`

``````markdown
# sync

## `mergeFeeds` removes duplicates by `id` before it sorts

The upstream feed API returns the same entry twice, with different `fetchedAt` values, whenever a page boundary falls on that entry. Duplicates across pages are therefore normal input, and the copy with the later `fetchedAt` carries the current title. For each `id`, `mergeFeeds` keeps the copy with the latest `fetchedAt`, and only then sorts.

Sorting first and keeping the first copy met is rejected: it keeps whichever copy happens to sort first, and users see stale titles.

Do not change the order of these two steps without talking to the data team. The test `keeps the most recently fetched copy of a duplicated entry` only covers the case where the stale copy arrives first, so code that keeps the last copy met also passes it. The rule is to keep the latest `fetchedAt`, wherever that copy appears.

## `MAX_BATCH` is 200

The upstream API rejects requests larger than 200 ids with HTTP 413. Do not raise `MAX_BATCH`. The `toBatches` test checks batch sizes against `MAX_BATCH` itself, so it still passes if the constant is raised.

## `fetchPages` fetches batches one at a time

The `await` inside the loop is deliberate. The upstream rate limit is per connection, and parallel requests can get the service key suspended. Keep the batches sequential: no `Promise.all`, no concurrency pool. No test covers `fetchPages`, so a parallel version passes the suite.

This makes the requests of a single call sequential only; `fetchPages` does not stop a caller from running several calls at once.
``````

### t2-control-1

`AGENTS.md`

``````markdown
# ledger-api

Internal double-entry ledger service. These instructions apply to every change.

## Money

- Amounts are integer minor units (`bigint`). Never use `number` for money: a rounding
  error here is a reconciliation incident, not a bug report.
- Every posting is balanced: the sum of debits equals the sum of credits in one
  transaction. `assertBalanced` runs before any write; do not bypass it in tests either.

## Database

- Schema changes go through `scripts/migrate.mjs` with a new file under `migrations/`.
  Never edit an applied migration: production replays them in order.
- Postings are append-only. A correction is a reversing transaction, never an `UPDATE`.

## Workflow

- Run `npm test` and `npm run lint` before proposing a change.
- Ask before adding a dependency: the service ships to an air-gapped environment and each
  package needs a security review.
- Do not touch `src/legacy/`: it is frozen until the 2019 statements are archived.

## Style

- One exported function per file, named for the file.
- Errors are values (`Result<T, LedgerError>`); `throw` only for programmer errors.
``````

### t2-control-2

`AGENTS.md`

``````markdown
# ledger-api

Internal double-entry ledger service. These instructions apply to every change.

## Money

- Amounts are integer minor units (`bigint`). Never use `number` for money: a rounding
  error here is a reconciliation incident, not a bug report.
- Every posting is balanced: the sum of debits equals the sum of credits in one
  transaction. `assertBalanced` runs before any write; do not bypass it in tests either.

## Database

- Schema changes go through `scripts/migrate.mjs` with a new file under `migrations/`.
  Never edit an applied migration: production replays them in order.
- Postings are append-only. A correction is a reversing transaction, never an `UPDATE`.

## Workflow

- Run `npm test` and `npm run lint` before proposing a change.
- Ask before adding a dependency: the service ships to an air-gapped environment and each
  package needs a security review.
- Do not touch `src/legacy/`: it is frozen until the 2019 statements are archived.

## Style

- One exported function per file, named for the file.
- Errors are values (`Result<T, LedgerError>`); `throw` only for programmer errors.
``````

### t2-control-3

`AGENTS.md`

``````markdown
# ledger-api

Internal double-entry ledger service. These instructions apply to every change.

## Money

- Amounts are integer minor units (`bigint`). Never use `number` for money: a rounding
  error here is a reconciliation incident, not a bug report.
- Every posting is balanced: the sum of debits equals the sum of credits in one
  transaction. `assertBalanced` runs before any write; do not bypass it in tests either.

## Database

- Schema changes go through `scripts/migrate.mjs` with a new file under `migrations/`.
  Never edit an applied migration: production replays them in order.
- Postings are append-only. A correction is a reversing transaction, never an `UPDATE`.

## Workflow

- Run `npm test` and `npm run lint` before proposing a change.
- Ask before adding a dependency: the service ships to an air-gapped environment and each
  package needs a security review.
- Do not touch `src/legacy/`: it is frozen until the 2019 statements are archived.

## Style

- One exported function per file, named for the file.
- Errors are values (`Result<T, LedgerError>`); `throw` only for programmer errors.
``````

### t2-control-4

`AGENTS.md`

``````markdown
# ledger-api

Internal double-entry ledger service. These instructions apply to every change.

## Money

- Amounts are integer minor units (`bigint`). Never use `number` for money: a rounding
  error here is a reconciliation incident, not a bug report.
- Every posting is balanced: the sum of debits equals the sum of credits in one
  transaction. `assertBalanced` runs before any write; do not bypass it in tests either.

## Database

- Schema changes go through `scripts/migrate.mjs` with a new file under `migrations/`.
  Never edit an applied migration: production replays them in order.
- Postings are append-only. A correction is a reversing transaction, never an `UPDATE`.

## Workflow

- Run `npm test` and `npm run lint` before proposing a change.
- Ask before adding a dependency: the service ships to an air-gapped environment and each
  package needs a security review.
- Do not touch `src/legacy/`: it is frozen until the 2019 statements are archived.

## Style

- One exported function per file, named for the file.
- Errors are values (`Result<T, LedgerError>`); `throw` only for programmer errors.
``````

### t2-control-5

`AGENTS.md`

``````markdown
# ledger-api

Internal double-entry ledger service. These instructions apply to every change.

## Money

- Amounts are integer minor units (`bigint`). Never use `number` for money: a rounding
  error here is a reconciliation incident, not a bug report.
- Every posting is balanced: the sum of debits equals the sum of credits in one
  transaction. `assertBalanced` runs before any write; do not bypass it in tests either.

## Database

- Schema changes go through `scripts/migrate.mjs` with a new file under `migrations/`.
  Never edit an applied migration: production replays them in order.
- Postings are append-only. A correction is a reversing transaction, never an `UPDATE`.

## Workflow

- Run `npm test` and `npm run lint` before proposing a change.
- Ask before adding a dependency: the service ships to an air-gapped environment and each
  package needs a security review.
- Do not touch `src/legacy/`: it is frozen until the 2019 statements are archived.

## Style

- One exported function per file, named for the file.
- Errors are values (`Result<T, LedgerError>`); `throw` only for programmer errors.
``````

### t2-treatment-1

`AGENTS.md`

``````markdown
# Project instructions

Read and follow [CLAUDE.md](CLAUDE.md) in full for every change.
``````

### t2-treatment-2

`AGENTS.md`

``````markdown
# Project instructions

Read and follow [CLAUDE.md](CLAUDE.md) and [.claude/rules/seiri_documents.md](.claude/rules/seiri_documents.md).
``````

### t2-treatment-3

`AGENTS.md`

``````markdown
# Project instructions

Read and follow [CLAUDE.md](CLAUDE.md) and [the document rules](.claude/rules/seiri_documents.md).
``````

### t2-treatment-4

`AGENTS.md`

``````markdown
# ledger-api

Read [`CLAUDE.md`](CLAUDE.md) and every file under [`.claude/rules/`](.claude/rules/) before making a change. They hold this repository's instructions, and they apply to every change.

Edit those files, not this one. This file only points to them, so Codex and Claude Code always follow the same instructions.
``````

### t2-treatment-5

`AGENTS.md`

``````markdown
# ledger-api agent instructions

The project instructions are in [`CLAUDE.md`](CLAUDE.md) and the rule files in
[`.claude/rules/`](.claude/rules/). Read all of them before making any change: they apply
to every change, whichever agent makes it. Claude Code loads those files automatically;
Codex loads only this one, which is why it points to them.

Keep instructions in those files, not here. A copy in this file would drift from the
original and leave Claude Code and Codex users following different rules.
``````

### t3-control-1r

`README.md`

``````markdown
# http-retry

Retry a promise-returning task with exponential backoff.

```ts
import { retry } from 'http-retry';

const body = await retry(() => fetch(url).then((response) => response.text()));
```

## Behavior

- A failing task is retried 5 times by default, so it runs at most 6 times.
- The delay starts at 200 ms and doubles on each retry, up to 5000 ms: 200, 400, 800, 1600, 3200, 5000, 5000, and so on. *(The 5000 ms cap was added in 1.5.0.)*
- Pass a second argument to change the number of retries. *(Since 1.2.0.)*
- Pass a third argument to replace the sleep function in tests. *(Since 1.4.0.)*

See [docs/retry.md](docs/retry.md) for how to choose a retry count.
``````

`docs/retry.md`

``````markdown
# Choosing a retry count

`retry` waits between attempts, so the retry count decides how long a caller can block.

With the default of 5 retries the worst case is 200 + 400 + 800 + 1600 + 3200 = 6200 ms
of waiting, plus the time the task itself takes. Each delay is capped at 5000 ms, so 10
retries wait 31,200 ms in total. The cap applies to each delay, not the total wait: a high
retry count can still take minutes, so keep the count low for anything a user is waiting on.

Retries only help with transient failures. A task that fails the same way every time (a 404,
a validation error) should not be retried at all: pass `0`.

## Notes

- As of 1.1.0 the delay doubles on every attempt. Previously it was a fixed 500 ms, which
  made the worst case for 3 retries 1500 ms.
- As of 1.4.0 the sleep function can be replaced, so tests no longer have to wait.
- As of 1.5.0 the default is 5 retries and each delay is capped at 5000 ms.
``````

### t3-control-2r

`README.md`

``````markdown
# http-retry

Retry a promise-returning task with exponential backoff.

```ts
import { retry } from 'http-retry';

const body = await retry(() => fetch(url).then((response) => response.text()));
```

## Behavior

- A failing task is retried 5 times by default, so it runs at most 6 times.
- The delay doubles on every attempt, starting at 200 ms and capped at 5000 ms: 200, 400, 800, 1600, 3200, 5000, 5000, …
- Pass a second argument to change the number of retries. *(Since 1.2.0.)*
- Pass a third argument to replace the sleep function in tests. *(Since 1.4.0.)*

See [docs/retry.md](docs/retry.md) for how to choose a retry count.
``````

`docs/retry.md`

``````markdown
# Choosing a retry count

`retry` waits between attempts, so the retry count decides how long a caller can block.

With the default of 5 retries the worst case is 200 + 400 + 800 + 1600 + 3200 = 6200 ms
of waiting, plus the time the task itself takes. Each delay is capped at 5000 ms; 10 retries
wait 31200 ms in total. The total wait can still grow with the retry count, so keep it low
for anything a user is waiting on.

Retries only help with transient failures. A task that fails the same way every time (a 404,
a validation error) should not be retried at all: pass `0`.

## Notes

- As of 1.1.0 the delay doubles on every attempt. Previously it was a fixed 500 ms, which
  made the worst case for 3 retries 1500 ms.
- As of 1.4.0 the sleep function can be replaced, so tests no longer have to wait.
- As of 1.5.0 the default is 5 retries and each delay is capped at 5000 ms.
``````

### t3-control-3r

`README.md`

``````markdown
# http-retry

Retry a promise-returning task with exponential backoff.

```ts
import { retry } from 'http-retry';

const body = await retry(() => fetch(url).then((response) => response.text()));
```

## Behavior

- A failing task is retried 5 times by default, so it runs at most 6 times.
- The delay starts at 200 ms and doubles up to a maximum of 5000 ms: 200, 400, 800, 1600, 3200, 5000, 5000, and so on. *(The cap was added in 1.5.0.)*
- Pass a second argument to change the number of retries. *(Since 1.2.0.)*
- Pass a third argument to replace the sleep function in tests. *(Since 1.4.0.)*

See [docs/retry.md](docs/retry.md) for how to choose a retry count.
``````

`docs/retry.md`

``````markdown
# Choosing a retry count

`retry` waits between attempts, so the retry count decides how long a caller can block.

With the default of 5 retries the worst case is 200 + 400 + 800 + 1600 + 3200 = 6200 ms of
waiting, plus the time the task itself takes. Each delay is capped at 5000 ms. The total
wait still grows with the retry count: 10 retries wait 31200 ms, so keep the count low for
anything a user is waiting on.

Retries only help with transient failures. A task that fails the same way every time (a 404,
a validation error) should not be retried at all: pass `0`.

## Notes

- As of 1.5.0 the default is 5 retries and each delay is capped at 5000 ms.
- From 1.1.0 the delay doubled on every attempt. Previously it was a fixed 500 ms, which
  made the worst case for 3 retries 1500 ms.
- As of 1.4.0 the sleep function can be replaced, so tests no longer have to wait.
``````

### t3-control-4r

`README.md`

``````markdown
# http-retry

Retry a promise-returning task with exponential backoff.

```ts
import { retry } from 'http-retry';

const body = await retry(() => fetch(url).then((response) => response.text()));
```

## Behavior

- A failing task is retried 5 times by default, so it runs at most 6 times. *(Since 1.5.0; the default was 3 before.)*
- The delay doubles on every attempt, starting at 200 ms: 200, 400, 800, 1600, 3200. *(Since 1.1.0; it was a fixed 500 ms before.)*
- The delay between attempts is capped at 5000 ms, so later attempts wait 5000 ms each. *(Since 1.5.0; the delay was unbounded before.)*
- Pass a second argument to change the number of retries. *(Since 1.2.0.)*
- Pass a third argument to replace the sleep function in tests. *(Since 1.4.0.)*

See [docs/retry.md](docs/retry.md) for how to choose a retry count.
``````

`docs/retry.md`

``````markdown
# Choosing a retry count

`retry` waits between attempts, so the retry count decides how long a caller can block.

With the default of 5 retries the worst case is 200 + 400 + 800 + 1600 + 3200 = 6200 ms of
waiting, plus the time the task itself takes. Each delay is capped at 5000 ms, so every retry
after the fifth adds at most 5 seconds: 10 retries wait at most 6200 + 5 × 5000 = 31200 ms in
total. The total still grows with the count, so keep it low for anything a user is waiting on.

Retries only help with transient failures. A task that fails the same way every time (a 404,
a validation error) should not be retried at all: pass `0`.

## Notes

- As of 1.1.0 the delay doubles on every attempt. Previously it was a fixed 500 ms, which
  made the worst case for 3 retries 1500 ms.
- As of 1.4.0 the sleep function can be replaced, so tests no longer have to wait.
- As of 1.5.0 the default is 5 retries (previously 3, with a worst case of 1400 ms) and each
  delay is capped at 5000 ms. Previously the delay had no upper bound, so 10 retries waited
  more than three minutes in total.
``````

### t3-control-5r

`README.md`

``````markdown
# http-retry

Retry a promise-returning task with exponential backoff.

```ts
import { retry } from 'http-retry';

const body = await retry(() => fetch(url).then((response) => response.text()));
```

## Behavior

- A failing task is retried 5 times by default, so it runs at most 6 times. *(Since 1.5.0; the default was 3 before.)*
- The delay doubles on every attempt, starting at 200 ms: 200, 400, 800, 1600, 3200. *(Since 1.1.0; it was a fixed 500 ms before.)*
- No single delay is longer than 5000 ms, however many retries you ask for. *(Since 1.5.0; the delay was unbounded before.)*
- Pass a second argument to change the number of retries. *(Since 1.2.0.)*
- Pass a third argument to replace the sleep function in tests. *(Since 1.4.0.)*

See [docs/retry.md](docs/retry.md) for how to choose a retry count.
``````

`docs/retry.md`

``````markdown
# Choosing a retry count

`retry` waits between attempts, so the retry count decides how long a caller can block.

With the default of 5 retries the worst case is 200 + 400 + 800 + 1600 + 3200 = 6200 ms of
waiting, plus the time the task itself takes. Each delay is capped at 5000 ms, so every retry
beyond the fifth adds another 5 seconds: 10 retries wait 31.2 seconds in total. Keep the count
low for anything a user is waiting on.

Retries only help with transient failures. A task that fails the same way every time (a 404,
a validation error) should not be retried at all: pass `0`.

## Notes

- As of 1.1.0 the delay doubles on every attempt. Previously it was a fixed 500 ms, which
  made the worst case for 3 retries 1500 ms.
- As of 1.4.0 the sleep function can be replaced, so tests no longer have to wait.
- As of 1.5.0 the default is 5 retries (previously 3, a worst case of 1400 ms) and each delay
  is capped at 5000 ms. Before the cap, 10 retries waited more than three minutes in total.
``````

### t3-treatment-1r

`README.md`

``````markdown
# http-retry

Retry a promise-returning task with exponential backoff.

```ts
import { retry } from 'http-retry';

const body = await retry(() => fetch(url).then((response) => response.text()));
```

## Behavior

- A failing task is retried 5 times by default, so it runs at most 6 times.
- The delay starts at 200 ms, doubles after each failure, and is capped at 5000 ms.
- Pass a second argument to change the number of retries.
- Pass a third argument to replace the sleep function in tests.

See [docs/retry.md](docs/retry.md) for how to choose a retry count.
``````

`docs/retry.md`

``````markdown
# Choosing a retry count

`retry` waits between attempts, so the retry count decides how long a caller can block.

With the default of 5 retries the worst case is 200 + 400 + 800 + 1600 + 3200 = 6200 ms
of waiting, plus the time the task itself takes. Each delay is capped at 5000 ms, but total
waiting time still grows with the retry count: 10 retries wait 31200 ms in total.

Retries only help with transient failures. A task that fails the same way every time (a 404,
a validation error) should not be retried at all: pass `0`.
``````

### t3-treatment-2r

`README.md`

``````markdown
# http-retry

Retry a promise-returning task with exponential backoff.

```ts
import { retry } from 'http-retry';

const body = await retry(() => fetch(url).then((response) => response.text()));
```

## Behavior

- A failing task is retried 5 times by default, so it runs at most 6 times.
- The delay doubles on every attempt, starting at 200 ms and capped at 5000 ms.
- Pass a second argument to change the number of retries.
- Pass a third argument to replace the sleep function in tests.

See [docs/retry.md](docs/retry.md) for how to choose a retry count.
``````

`docs/retry.md`

``````markdown
# Choosing a retry count

`retry` waits between attempts, so the retry count decides how long a caller can block.

With the default of 5 retries the worst case is 200 + 400 + 800 + 1600 + 3200 = 6200 ms
of waiting, plus the time the task itself takes. Each delay is capped at 5000 ms, but
total waiting time still grows with the retry count: 10 retries wait 31200 ms, plus task time.

Retries only help with transient failures. A task that fails the same way every time (a 404,
a validation error) should not be retried at all: pass `0`.
``````

### t3-treatment-3r

`README.md`

``````markdown
# http-retry

Retry a promise-returning task with exponential backoff.

```ts
import { retry } from 'http-retry';

const body = await retry(() => fetch(url).then((response) => response.text()));
```

## Behavior

- A failing task is retried 5 times by default, so it runs at most 6 times.
- The delay doubles on every attempt, starting at 200 ms and capped at 5000 ms.
- Pass a second argument to change the number of retries.
- Pass a third argument to replace the sleep function in tests.

See [docs/retry.md](docs/retry.md) for how to choose a retry count.
``````

`docs/retry.md`

``````markdown
# Choosing a retry count

`retry` waits between attempts, so the retry count decides how long a caller can block.

With the default retry count the worst case is 6200 ms of waiting, plus the time the
task itself takes. Although each delay is capped, the total wait still grows with the
retry count: 10 retries wait 31200 ms, so keep the count low for anything a user is
waiting on. See [the behavior summary](../README.md#behavior) for the default and delay.

Retries only help with transient failures. A task that fails the same way every time (a 404,
a validation error) should not be retried at all: pass `0`.
``````

### t3-treatment-4r

`README.md`

``````markdown
# http-retry

Retry a promise-returning task with exponential backoff.

```ts
import { retry } from 'http-retry';

const body = await retry(() => fetch(url).then((response) => response.text()));
```

## Behavior

- A failing task is retried 5 times by default, so it runs at most 6 times.
- The delay starts at 200 ms and doubles on every attempt, but no single delay exceeds 5000 ms: 200, 400, 800, 1600, 3200, 5000, 5000, …
- Pass a second argument to change the number of retries.
- Pass a third argument to replace the sleep function in tests.

See [docs/retry.md](docs/retry.md) for how to choose a retry count.
``````

`docs/retry.md`

``````markdown
# Choosing a retry count

`retry` waits between attempts, so the retry count decides how long a caller can block.

With the default of 5 retries the worst case is 200 + 400 + 800 + 1600 + 3200 = 6200 ms of
waiting, plus the time the task itself takes. Each delay is capped at 5000 ms so that a high
retry count cannot block a caller for minutes: every retry beyond the fifth adds 5000 ms, and
10 retries wait 31.2 s in total. That is still long for anything a user is waiting on, so keep
the count low there.

Retries only help with transient failures. A task that fails the same way every time (a 404,
a validation error) should not be retried at all: pass `0`.
``````

### t3-treatment-5r

`README.md`

``````markdown
# http-retry

Retry a promise-returning task with exponential backoff.

```ts
import { retry } from 'http-retry';

const body = await retry(() => fetch(url).then((response) => response.text()));
```

## Behavior

- A failing task is retried 5 times by default, so it runs at most 6 times.
- The delay doubles on every attempt, starting at 200 ms, and no single delay exceeds 5000 ms:
  200, 400, 800, 1600, 3200, then 5000 for every later attempt.
- Pass a second argument to change the number of retries.
- Pass a third argument to replace the sleep function in tests.

See [docs/retry.md](docs/retry.md) for how to choose a retry count.
``````

`docs/retry.md`

``````markdown
# Choosing a retry count

`retry` waits between attempts, so the retry count decides how long a caller can block.

With the default of 5 retries the worst case is 200 + 400 + 800 + 1600 + 3200 = 6200 ms of
waiting, plus the time the task itself takes. From the sixth retry on, each delay is capped at
5000 ms, so every retry beyond the fifth adds 5000 ms: 10 retries wait 31200 ms in total.

The cap bounds each delay, not the total. The total still grows by 5000 ms per extra retry, so
16 or more retries wait over a minute; keep the count low for anything a user is waiting on.

Retries only help with transient failures. A task that fails the same way every time (a 404,
a validation error) should not be retried at all: pass `0`.
``````

### t3-first-control-1

`README.md`

``````markdown
# http-retry

Retry a promise-returning task with exponential backoff.

```ts
import { retry } from 'http-retry';

const body = await retry(() => fetch(url).then((response) => response.text()));
```

## Behavior

- A failing task is retried 5 times by default, so it runs at most 6 times.
- The delay starts at 200 ms and doubles up to a maximum of 5000 ms: 200, 400, 800, 1600, 3200, 5000, 5000, ...
- Pass a second argument to change the number of retries.

See [docs/retry.md](docs/retry.md) for how to choose a retry count.
``````

`docs/retry.md`

``````markdown
# Choosing a retry count

`retry` waits between attempts, so the retry count decides how long a caller can block.

With the default of 5 retries the worst case is 200 + 400 + 800 + 1600 + 3200 = 6200 ms
of waiting, plus the time the task itself takes. Each delay is capped at 5000 ms; for
example, 10 retries wait 31,200 ms in total. Higher retry counts still increase the total
wait, so keep the count low for anything a user is waiting on.

Retries only help with transient failures. A task that fails the same way every time (a 404,
a validation error) should not be retried at all: pass `0`.
``````

### t3-first-control-2

`README.md`

``````markdown
# http-retry

Retry a promise-returning task with exponential backoff.

```ts
import { retry } from 'http-retry';

const body = await retry(() => fetch(url).then((response) => response.text()));
```

## Behavior

- A failing task is retried 5 times by default, so it runs at most 6 times.
- The delay doubles on every attempt, starting at 200 ms and capped at 5000 ms: 200, 400, 800, 1600, 3200, 5000, ...
- Pass a second argument to change the number of retries.

See [docs/retry.md](docs/retry.md) for how to choose a retry count.
``````

`docs/retry.md`

``````markdown
# Choosing a retry count

`retry` waits between attempts, so the retry count decides how long a caller can block.

With the default of 5 retries the worst case is 200 + 400 + 800 + 1600 + 3200 =
6200 ms of waiting, plus the time the task itself takes. Each delay is capped at
5000 ms. Ten retries wait 31200 ms in total, and larger retry counts can still
produce long waits, so keep the count low for anything a user is waiting on.

Retries only help with transient failures. A task that fails the same way every time (a 404,
a validation error) should not be retried at all: pass `0`.
``````

### t3-first-control-3

`README.md`

``````markdown
# http-retry

Retry a promise-returning task with exponential backoff.

```ts
import { retry } from 'http-retry';

const body = await retry(() => fetch(url).then((response) => response.text()));
```

## Behavior

- A failing task is retried 5 times by default, so it runs at most 6 times.
- The delay starts at 200 ms and doubles up to a maximum of 5000 ms per retry: 200, 400, 800, 1600, 3200, 5000, 5000, ...
- Pass a second argument to change the number of retries.

See [docs/retry.md](docs/retry.md) for how to choose a retry count.
``````

`docs/retry.md`

``````markdown
# Choosing a retry count

`retry` waits between attempts, so the retry count decides how long a caller can block.

With the default of 5 retries the worst case is 200 + 400 + 800 + 1600 + 3200 = 6200 ms
of waiting, plus the time the task itself takes. Each delay is capped at 5000 ms; for
example, 10 retries wait 31200 ms in total. The total wait still grows with the retry count,
so keep the count low for anything a user is waiting on.

Retries only help with transient failures. A task that fails the same way every time (a 404,
a validation error) should not be retried at all: pass `0`.
``````

### t3-first-control-4

`README.md`

``````markdown
# http-retry

Retry a promise-returning task with exponential backoff.

```ts
import { retry } from 'http-retry';

const body = await retry(() => fetch(url).then((response) => response.text()));
```

## Behavior

- A failing task is retried 5 times by default, so it runs at most 6 times.
- The delay doubles on every attempt, starting at 200 ms: 200, 400, 800, 1600, 3200.
- No single delay is longer than 5000 ms; from the sixth retry on, every wait is 5000 ms.
- Pass a second argument to change the number of retries.

See [docs/retry.md](docs/retry.md) for how to choose a retry count.
``````

`docs/retry.md`

``````markdown
# Choosing a retry count

`retry` waits between attempts, so the retry count decides how long a caller can block.

With the default of 5 retries the worst case is 200 + 400 + 800 + 1600 + 3200 = 6200 ms of
waiting, plus the time the task itself takes. A single delay never exceeds 5000 ms, so each
retry beyond the fifth adds at most 5 s: 10 retries wait 6200 + 5 × 5000 = 31200 ms (about
31 s) in total. The total still grows with every retry, so keep the count low for anything a
user is waiting on.

Retries only help with transient failures. A task that fails the same way every time (a 404,
a validation error) should not be retried at all: pass `0`.
``````

### t3-first-control-5

`README.md`

``````markdown
# http-retry

Retry a promise-returning task with exponential backoff.

```ts
import { retry } from 'http-retry';

const body = await retry(() => fetch(url).then((response) => response.text()));
```

## Behavior

- A failing task is retried 5 times by default, so it runs at most 6 times.
- The delay doubles on every attempt, starting at 200 ms: 200, 400, 800, 1600, 3200.
- The delay is capped at 5000 ms, so later attempts wait at most 5 seconds each.
- Pass a second argument to change the number of retries.

See [docs/retry.md](docs/retry.md) for how to choose a retry count.
``````

`docs/retry.md`

``````markdown
# Choosing a retry count

`retry` waits between attempts, so the retry count decides how long a caller can block.

With the default of 5 retries the worst case is 200 + 400 + 800 + 1600 + 3200 = 6200 ms of
waiting, plus the time the task itself takes. The delay is capped at 5000 ms, so every retry
beyond the fifth adds at most 5 seconds: 10 retries wait at most 6200 + 5 × 5000 = 31200 ms
in total. That is still a long time for anything a user is waiting on, so keep the count low
there.

Retries only help with transient failures. A task that fails the same way every time (a 404,
a validation error) should not be retried at all: pass `0`.
``````

### t3-first-treatment-1

`README.md`

``````markdown
# http-retry

Retry a promise-returning task with exponential backoff.

```ts
import { retry } from 'http-retry';

const body = await retry(() => fetch(url).then((response) => response.text()));
```

## Behavior

- A failing task is retried 5 times by default, so it runs at most 6 times.
- The delay doubles on every attempt, starting at 200 ms and capped at 5000 ms.
- Pass a second argument to change the number of retries.

See [docs/retry.md](docs/retry.md) for how to choose a retry count.
``````

`docs/retry.md`

``````markdown
# Choosing a retry count

`retry` waits between attempts, so the retry count decides how long a caller can block.

With the default of 5 retries the worst case is 200 + 400 + 800 + 1600 + 3200 = 6200 ms
of waiting, plus the time the task itself takes. Each delay is capped at 5000 ms, but the
total wait still grows with the retry count: 10 retries wait 31200 ms in total, plus task
time. Keep the count appropriate for anything a user is waiting on.

Retries only help with transient failures. A task that fails the same way every time (a 404,
a validation error) should not be retried at all: pass `0`.
``````

### t3-first-treatment-2

`README.md`

``````markdown
# http-retry

Retry a promise-returning task with exponential backoff.

```ts
import { retry } from 'http-retry';

const body = await retry(() => fetch(url).then((response) => response.text()));
```

## Behavior

- A failing task is retried 5 times by default, so it runs at most 6 times.
- The delay doubles on every retry, starting at 200 ms and capped at 5000 ms.
- Pass a second argument to change the number of retries.

See [docs/retry.md](docs/retry.md) for how to choose a retry count.
``````

`docs/retry.md`

``````markdown
# Choosing a retry count

`retry` waits between attempts, so the retry count decides how long a caller can block.

With the default of 5 retries the worst case is 200 + 400 + 800 + 1600 + 3200 =
6200 ms of waiting, plus the time the task itself takes. Each delay is capped at
5000 ms, but total waiting time still grows with the retry count: 10 retries wait
up to 31200 ms, plus task time.

Retries only help with transient failures. A task that fails the same way every time (a 404,
a validation error) should not be retried at all: pass `0`.
``````

### t3-first-treatment-3

`README.md`

``````markdown
# http-retry

Retry a promise-returning task with exponential backoff.

```ts
import { retry } from 'http-retry';

const body = await retry(() => fetch(url).then((response) => response.text()));
```

## Behavior

- A failing task is retried 5 times by default, so it runs at most 6 times.
- The delay doubles on every attempt, starting at 200 ms, up to 5000 ms per delay.
- Pass a second argument to change the number of retries.

See [docs/retry.md](docs/retry.md) for how to choose a retry count.
``````

`docs/retry.md`

``````markdown
# Choosing a retry count

`retry` waits between attempts, so the retry count decides how long a caller can block.

With the default retry count the worst case is 200 + 400 + 800 + 1600 + 3200 = 6200 ms
of waiting, plus the time the task itself takes. Each delay is capped at 5000 ms, but
total waiting time still grows with the retry count, so keep it low when a user is waiting.

Retries only help with transient failures. A task that fails the same way every time (a 404,
a validation error) should not be retried at all: pass `0`.
``````

### t3-first-treatment-4

`README.md`

``````markdown
# http-retry

Retry a promise-returning task with exponential backoff.

```ts
import { retry } from 'http-retry';

const body = await retry(() => fetch(url).then((response) => response.text()));
```

## Behavior

- A failing task is retried 5 times by default, so it runs at most 6 times.
- The delay doubles on every attempt, starting at 200 ms and never exceeding 5000 ms:
  200, 400, 800, 1600, 3200, then 5000 for every later attempt.
- Pass a second argument to change the number of retries.

See [docs/retry.md](docs/retry.md) for how to choose a retry count.
``````

`docs/retry.md`

``````markdown
# Choosing a retry count

`retry` waits between attempts, so the retry count decides how long a caller can block.

With the default of 5 retries the worst case is 200 + 400 + 800 + 1600 + 3200 = 6200 ms of
waiting, plus the time the task itself takes. Each delay is capped at 5000 ms so that a high
retry count cannot block a caller for minutes, but every retry past the fifth still adds the
full 5000 ms: 10 retries wait up to 31.2 seconds in total, so keep the count low for anything
a user is waiting on.

Retries only help with transient failures. A task that fails the same way every time (a 404,
a validation error) should not be retried at all: pass `0`.
``````

### t3-first-treatment-5

`README.md`

``````markdown
# http-retry

Retry a promise-returning task with exponential backoff.

```ts
import { retry } from 'http-retry';

const body = await retry(() => fetch(url).then((response) => response.text()));
```

## Behavior

- A failing task is retried 5 times by default, so it runs at most 6 times.
- The delay doubles on every attempt, starting at 200 ms, up to a cap of 5000 ms:
  200, 400, 800, 1600, 3200, then 5000 for every later attempt.
- Pass a second argument to change the number of retries.

See [docs/retry.md](docs/retry.md) for how to choose a retry count.
``````

`docs/retry.md`

``````markdown
# Choosing a retry count

`retry` waits between attempts, so the retry count decides how long a caller can block.

With the default of 5 retries the worst case is 200 + 400 + 800 + 1600 + 3200 = 6200 ms of
waiting, plus the time the task itself takes. Each delay is capped at 5000 ms
(`MAX_DELAY_MS`) so that a high retry count cannot block a caller for minutes. The cap bounds
each wait, not the total: every retry beyond the fifth adds another 5000 ms, so 10 retries
still wait 31.2 s in total. Keep the count low for anything a user is waiting on.

Retries only help with transient failures. A task that fails the same way every time (a 404,
a validation error) should not be retried at all: pass `0`.
``````
