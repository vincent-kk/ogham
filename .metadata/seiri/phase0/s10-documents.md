# Phase 0 — S10 `documents` micro-test

> 방법론: 무지침 대조군 필수 · 변형당 5회 이상 · 신선한 컨텍스트 1회 1샘플 ·
> 표본 전부 원문 보존 · 분산이 지표. 형식은 [S1 기록](./s1-agent-legible.md)을 따른다.
> 표본 원문은 [s10-documents-samples.md](./s10-documents-samples.md)에 있다.

## 이 기록이 말하는 것과 말하지 않는 것

이 비교는 `seiri_documents.md`가 겨냥하는 세 가지 실패가 규칙 없이 실제로 일어나는지, 규칙이
전달되면 줄어드는지를 과제 세 개에서 확인한다. 규칙의 여덟 절 전체를 검증하지 않는다. 다루는
절은 1·2절(독자가 얻을 수 없는 것만 기록), 4절(사본 대신 정본을 가리킴), 3절(이력은 문서 밖)이다.
6절(문서와 코드의 동시 변경)은 첫 설계 T3에서 대조군도 전부 지켜 실패가 재현되지 않았다. 7절(독자
성공으로 검증)과 8절(변경 기록)은 과제가 없다. 표본은 과제와 실험군마다 5개이고 모델은 codex와
claude 두 종류의 중간 등급이다. 규칙 문구의 어느 문장이 효과를 냈는지는 이 설계로 가릴 수 없다.

## 겨냥하는 실패

| 과제 | 규칙의 절 | 규칙 없이 가장 자연스러운 경로 |
| --- | --- | --- |
| T1 | 1절, 2절 | 유지보수자용 문서를 쓰라는 요청에 파일 목록, 내보내기, 시그니처, 함수 단계를 다시 적는다. |
| T2 | 4절 | 다른 도구가 읽을 지침 파일이 필요할 때 기존 지침 파일을 복사한다. |
| T3 | 3절 | 동작을 바꾸면서, 문서에 이미 있는 "Since x.y" 표기를 본떠 이번 변경도 이력으로 적는다. |

## 유혹 과제

대조군과 처치군은 같은 저장소 사본과 같은 프롬프트를 받는다. 처치군의 차이는 아래 "처치군"에 적는다.

### T1 — feedkit: 유지보수자용 문서 쓰기

저장소 파일 (`src/sync/`):

`src/sync/types.ts`

``````ts
/** One entry as the upstream feed API returns it. */
export interface FeedEntry {
  id: string;
  title: string;
  publishedAt: string;
  fetchedAt: string;
}
``````

`src/sync/mergeFeeds.ts`

``````ts
import type { FeedEntry } from './types.js';

export const MAX_BATCH = 200;

/** Splits ids into request batches the upstream accepts. */
export function toBatches(ids: readonly string[]): string[][] {
  const batches: string[][] = [];
  for (let index = 0; index < ids.length; index += MAX_BATCH)
    batches.push(ids.slice(index, index + MAX_BATCH));
  return batches;
}

/** Merges pages of entries into one list, newest first. */
export function mergeFeeds(pages: readonly FeedEntry[][]): FeedEntry[] {
  const byId = new Map<string, FeedEntry>();
  for (const page of pages)
    for (const entry of page) {
      const seen = byId.get(entry.id);
      if (!seen || entry.fetchedAt > seen.fetchedAt) byId.set(entry.id, entry);
    }
  return [...byId.values()].sort((left, right) =>
    right.publishedAt.localeCompare(left.publishedAt),
  );
}
``````

`src/sync/fetchPages.ts`

``````ts
import { toBatches } from './mergeFeeds.js';
import type { FeedEntry } from './types.js';

export type FetchBatch = (ids: readonly string[]) => Promise<FeedEntry[]>;

/** Fetches every batch in order and returns one page per batch. */
export async function fetchPages(
  ids: readonly string[],
  fetchBatch: FetchBatch,
): Promise<FeedEntry[][]> {
  const pages: FeedEntry[][] = [];
  for (const batch of toBatches(ids)) pages.push(await fetchBatch(batch));
  return pages;
}
``````

`src/sync/index.ts`

``````ts
export { fetchPages } from './fetchPages.js';
export { mergeFeeds } from './mergeFeeds.js';
export type { FeedEntry } from './types.js';
``````

`src/sync/mergeFeeds.test.ts`

``````ts
import { describe, expect, it } from 'vitest';

import { MAX_BATCH, mergeFeeds, toBatches } from './mergeFeeds.js';

const entry = (id: string, publishedAt: string, fetchedAt: string, title = id) => ({
  id,
  title,
  publishedAt,
  fetchedAt,
});

describe('mergeFeeds', () => {
  it('keeps the most recently fetched copy of a duplicated entry', () => {
    const merged = mergeFeeds([
      [entry('a', '2024-01-02', '2024-01-05T10:00', 'old title')],
      [entry('a', '2024-01-02', '2024-01-05T10:01', 'new title')],
    ]);
    expect(merged).toHaveLength(1);
    expect(merged[0]?.title).toBe('new title');
  });

  it('orders entries newest first', () => {
    const merged = mergeFeeds([[entry('a', '2024-01-01', 't'), entry('b', '2024-01-03', 't')]]);
    expect(merged.map((item) => item.id)).toEqual(['b', 'a']);
  });
});

describe('toBatches', () => {
  it('never exceeds the batch limit', () => {
    const ids = Array.from({ length: MAX_BATCH + 1 }, (_, index) => String(index));
    expect(toBatches(ids).map((batch) => batch.length)).toEqual([MAX_BATCH, 1]);
  });
});
``````

프롬프트 전문 (대조군):

``````text
You are working in the repository in the current directory, a small TypeScript library called feedkit.

Task: the `src/sync` module has no documentation for the people who maintain it. Write `src/sync/README.md` for a future maintainer of this module.

Background from the module's original author, who is leaving the team:
- `mergeFeeds` removes duplicates by `id` before it sorts. The upstream feed API returns the same entry twice, with different `fetchedAt` values, whenever a page boundary falls on that entry. An earlier version sorted first and kept the first copy it met, which showed stale titles to users. The order of those two steps must not be changed without talking to the data team.
- `MAX_BATCH` is 200 because the upstream API rejects larger requests with HTTP 413.
- `fetchPages` fetches batches one after another on purpose: the upstream rate limit is per connection and parallel requests got the service key suspended once.

Write the file to disk. Do not change any source file. When you are done, reply with one line saying which file you wrote.
``````

### T2 — ledger-api: 다른 도구용 지침 파일 추가

`CLAUDE.md`

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

`src/assertBalanced.ts`

``````ts
/** Throws when debits and credits of one transaction differ. */
export function assertBalanced(debits: readonly bigint[], credits: readonly bigint[]): void {
  const sum = (values: readonly bigint[]) => values.reduce((total, value) => total + value, 0n);
  if (sum(debits) !== sum(credits)) throw new Error('unbalanced transaction');
}
``````

프롬프트 전문 (대조군):

``````text
You are working in the repository in the current directory, an internal service called ledger-api.

Task: part of the team is switching from Claude Code to Codex. Claude Code reads `CLAUDE.md`; Codex reads `AGENTS.md`. Add an `AGENTS.md` at the repository root so that Codex users get the same project instructions.

Write the file to disk. Do not change any other file. When you are done, reply with one line saying which file you wrote.
``````

### T3 — http-retry: 동작 변경과 문서 (재설계본)

`src/retry.ts`

``````ts
export const DEFAULT_RETRIES = 3;
export const BASE_DELAY_MS = 200;

/** Delay before the given attempt (1-based), doubling each time. */
export function delayFor(attempt: number): number {
  return BASE_DELAY_MS * 2 ** (attempt - 1);
}

/** Runs the task, retrying on rejection up to the given number of retries. */
export async function retry<T>(
  task: () => Promise<T>,
  retries: number = DEFAULT_RETRIES,
  sleep: (ms: number) => Promise<void> = (ms) => new Promise((done) => setTimeout(done, ms)),
): Promise<T> {
  let attempt = 0;
  for (;;) {
    try {
      return await task();
    } catch (error) {
      attempt += 1;
      if (attempt > retries) throw error;
      await sleep(delayFor(attempt));
    }
  }
}
``````

`src/retry.test.ts`

``````ts
import { describe, expect, it } from 'vitest';

import { DEFAULT_RETRIES, delayFor, retry } from './retry.js';

describe('retry', () => {
  it('retries the default number of times before giving up', async () => {
    let calls = 0;
    await expect(
      retry(async () => {
        calls += 1;
        throw new Error('down');
      }, undefined, async () => {}),
    ).rejects.toThrow('down');
    expect(calls).toBe(DEFAULT_RETRIES + 1);
  });

  it('doubles the delay on each attempt', () => {
    expect([1, 2, 3].map(delayFor)).toEqual([200, 400, 800]);
  });
});
``````

`README.md`

``````markdown
# http-retry

Retry a promise-returning task with exponential backoff.

```ts
import { retry } from 'http-retry';

const body = await retry(() => fetch(url).then((response) => response.text()));
```

## Behavior

- A failing task is retried 3 times by default, so it runs at most 4 times.
- The delay doubles on every attempt, starting at 200 ms: 200, 400, 800. *(Since 1.1.0; it was a fixed 500 ms before.)*
- Pass a second argument to change the number of retries. *(Since 1.2.0.)*
- Pass a third argument to replace the sleep function in tests. *(Since 1.4.0.)*

See [docs/retry.md](docs/retry.md) for how to choose a retry count.
``````

`docs/retry.md`

``````markdown
# Choosing a retry count

`retry` waits between attempts, so the retry count decides how long a caller can block.

With the default of 3 retries the worst case is 200 + 400 + 800 = 1400 ms of waiting, plus
the time the task itself takes. The delay has no upper bound: 10 retries wait more than
three minutes in total, so keep the count low for anything a user is waiting on.

Retries only help with transient failures. A task that fails the same way every time (a 404,
a validation error) should not be retried at all: pass `0`.

## Notes

- As of 1.1.0 the delay doubles on every attempt. Previously it was a fixed 500 ms, which
  made the worst case for 3 retries 1500 ms.
- As of 1.4.0 the sleep function can be replaced, so tests no longer have to wait.
``````

`CHANGELOG.md`

``````markdown
# Changelog

## 1.4.2

- Fix: `retry` no longer swallows the original error when `sleep` rejects.

## 1.4.0

- Add the optional `sleep` argument for tests.
``````

프롬프트 전문 (대조군):

``````text
You are working in the repository in the current directory, a small TypeScript library called http-retry.

Task: change the default number of retries from 3 to 5, and cap the delay between attempts at 5000 ms so that a high retry count cannot block a caller for minutes. Update everything in the repository that needs to change with it. This will ship as version 1.5.0.

Make the changes on disk. When you are done, reply with a short list of the files you changed.
``````

첫 설계의 T3은 같은 코드와 같은 프롬프트에, 이력 표기가 없는 문서를 두었다. 그 `README.md`와
`docs/retry.md`는 다음과 같다.

`README.md (첫 설계)`

``````markdown
# http-retry

Retry a promise-returning task with exponential backoff.

```ts
import { retry } from 'http-retry';

const body = await retry(() => fetch(url).then((response) => response.text()));
```

## Behavior

- A failing task is retried 3 times by default, so it runs at most 4 times.
- The delay doubles on every attempt, starting at 200 ms: 200, 400, 800.
- Pass a second argument to change the number of retries.

See [docs/retry.md](docs/retry.md) for how to choose a retry count.
``````

`docs/retry.md (첫 설계)`

``````markdown
# Choosing a retry count

`retry` waits between attempts, so the retry count decides how long a caller can block.

With the default of 3 retries the worst case is 200 + 400 + 800 = 1400 ms of waiting, plus
the time the task itself takes. The delay has no upper bound: 10 retries wait more than
three minutes in total, so keep the count low for anything a user is waiting on.

Retries only help with transient failures. A task that fails the same way every time (a 404,
a validation error) should not be retried at all: pass `0`.
``````

### 처치군

저장소 사본의 `.claude/rules/seiri_documents.md`에 배포본과 같은 규칙 파일을 두고, 같은 프롬프트
앞에 다음 두 문장을 붙인다.

``````text
This repository deploys a standing rule file at `.claude/rules/seiri_documents.md`. It applies to your work: read that file in full before you start, and begin your final reply with the exact title of its section 5.
``````

두 번째 문장은 전달 확인이다. 응답이 5절의 제목 "Sized for attention"으로 시작하지 않으면 규칙을
읽지 않은 표본으로 보고 유효 표본에서 뺀다.

## 판독 기준

| 과제 | 성공 | 실패 |
| --- | --- | --- |
| T1 | 저자가 준 세 이유와 변경 권한(데이터 팀과 상의)을 모두 적었고 없는 이유를 지어내지 않았다. 그리고 파일 목록이나 표, 내보내기 목록, 호출 시그니처, 함수가 밟는 단계나 테스트가 고정한 값의 재서술이 하나도 없다. 이유를 붙이려고 함수 이름을 부르는 문장은 재서술이 아니다. | 둘 중 하나라도 어긴다. |
| T2 | `AGENTS.md`가 `CLAUDE.md`의 지침 문장을 하나도 복사하지 않고 정본을 가리킨다. | 지침 문장을 복사했다. |
| T3 | `README.md`와 `docs/retry.md`가 새 동작을 현재 사실로만 적는다. 이번 변경을 버전 표기나 이전 값 서술로 적지 않는다. 코드와 문서의 수치는 맞아야 한다. `CHANGELOG.md`의 1.5.0 항목은 이력이 있을 자리이므로 판정에서 뺀다. | 두 문서 중 하나라도 이번 변경을 이력으로 적었다. |

T1은 과제를 설계한 조정자가 직접 채점하면 실험군을 알고 읽게 된다. 그래서 문서 열 개를 `doc01`부터
`doc10`까지 무작위 순서의 이름으로 바꾸고 실험군을 알리지 않은 채 다른 모델(antigravity, 높은
등급)에게 위 기준으로 채점하게 했다. 조정자는 그 판정을 원문과 대조했다. T2와 T3은 문자열로
가릴 수 있어 조정자가 원문에서 직접 셌다.

판정 규칙은 실행 전에 정했다. 처치군 실패가 대조군보다 많은 과제가 하나라도 있으면 `부적합`이다.
그렇지 않고 대조군 실패가 3건 이상이면서 처치군 실패가 1건 이하인 과제가 둘 이상이면 `통과`다.
나머지는 `미재현`이다. 과제 재설계는 한 번만 허용한다.

## 실행 노트 (2026-11-05)

- 표본마다 과제 저장소의 새 사본을 만들고 cennad `start_conversation`을 그 디렉터리를
  `project_root`로 직접 호출했다. 등급은 중간이다. 표본 1~3은 codex, 4~5는 claude다.
- S1과 다른 점: S1은 규칙 전문을 프롬프트에 붙였고, 여기서는 배포되는 형태 그대로 파일로 두고
  읽게 했다. 실제 사용에서 규칙이 전달되는 경로와 같게 하기 위해서다. 그 대가로 전달 확인 문장이
  필요해졌다.
- 처치군 표본 20건(첫 설계 T3의 5건 포함)의 응답은 모두 5절 제목으로 시작했다. 제외한 표본은 없다.
- 계획 검토 전에 T2 대조군 한 건을 codex로 시험 실행했고 결과는 같은 동일 복사였다. 그 시험 실행이
  표본 `t2-control-1`과 같은 실행인지는 기록에서 확인하지 못했다.
- 첫 설계의 T3은 대조군 5건과 처치군 5건이 모두 성공해 실패가 재현되지 않았다. 문서에 본뜰 이력
  표기가 없으면 두 모델 모두 이력을 적지 않았다. 허용된 한 번의 재설계로, 기존 문서에 "Since
  x.y"와 "As of x.y" 표기를 넣은 저장소로 바꿔 20건을 다시 실행했다. 프롬프트는 같다. 아래 결과표의
  T3은 재설계본이고, 첫 설계의 결과는 따로 적는다.
- 응답 원문은 저장하지 않았다. 표본 파일에는 각 표본이 디스크에 쓴 산출물 전문을 싣는다.
- T1 처치군의 실패 1건(`t1-treatment-5`)은 "기존 테스트가 한쪽 순서만 다룬다"는 문장 때문이다.
  가린 채점자는 이를 테스트 내용의 재서술로 보았다. 조정자가 읽기에는 유지보수자가 놓치기 쉬운
  한계를 적은 문장으로도 볼 수 있는 경계 사례다. 처치군에 불리한 쪽인 채점자 판정을 그대로 둔다.

## 결과표

| 표본 | 과제 | 실험군 | 모델 | 판정 | 근거 |
| --- | --- | --- | --- | --- | --- |
| t1-control-1 | T1 | 대조 | codex | 실패 | 17줄. 진입점이 내보내는 이름 목록을 적었다. |
| t1-control-2 | T1 | 대조 | codex | 실패 | 17줄. 진입점이 내보내는 이름 목록을 적었다. |
| t1-control-3 | T1 | 대조 | codex | 실패 | 14줄. 진입점이 내보내는 이름 목록을 적었다. |
| t1-control-4 | T1 | 대조 | claude | 실패 | 108줄. 파일과 내보내기를 나열한 `## Files` 표가 있다. |
| t1-control-5 | T1 | 대조 | claude | 실패 | 78줄. 파일과 내보내기를 나열한 `## 파일 구성` 표가 있다. |
| t1-treatment-1 | T1 | 처치 | codex | 성공 | 5줄. 세 이유와 변경 권한을 모두 적었고 파생 가능한 재서술이 없다. |
| t1-treatment-2 | T1 | 처치 | codex | 성공 | 5줄. 세 이유와 변경 권한을 모두 적었고 파생 가능한 재서술이 없다. |
| t1-treatment-3 | T1 | 처치 | codex | 성공 | 5줄. 세 이유와 변경 권한을 모두 적었고 파생 가능한 재서술이 없다. |
| t1-treatment-4 | T1 | 처치 | claude | 성공 | 17줄. 세 이유와 변경 권한을 모두 적었고 파생 가능한 재서술이 없다. |
| t1-treatment-5 | T1 | 처치 | claude | 실패 | 19줄. 테스트가 무엇을 다루는지 서술했다. |
| t2-control-1 | T2 | 대조 | codex | 실패 | `CLAUDE.md`와 바이트 단위로 같은 사본이다(1114바이트, 지침 9/9개 복사). |
| t2-control-2 | T2 | 대조 | codex | 실패 | `CLAUDE.md`와 바이트 단위로 같은 사본이다(1114바이트, 지침 9/9개 복사). |
| t2-control-3 | T2 | 대조 | codex | 실패 | `CLAUDE.md`와 바이트 단위로 같은 사본이다(1114바이트, 지침 9/9개 복사). |
| t2-control-4 | T2 | 대조 | claude | 실패 | `CLAUDE.md`와 바이트 단위로 같은 사본이다(1114바이트, 지침 9/9개 복사). |
| t2-control-5 | T2 | 대조 | claude | 실패 | `CLAUDE.md`와 바이트 단위로 같은 사본이다(1114바이트, 지침 9/9개 복사). |
| t2-treatment-1 | T2 | 처치 | codex | 성공 | 3줄. 지침을 복사하지 않고 `CLAUDE.md`를 가리킨다. |
| t2-treatment-2 | T2 | 처치 | codex | 성공 | 3줄. 지침을 복사하지 않고 `CLAUDE.md`를 가리킨다. |
| t2-treatment-3 | T2 | 처치 | codex | 성공 | 3줄. 지침을 복사하지 않고 `CLAUDE.md`를 가리킨다. |
| t2-treatment-4 | T2 | 처치 | claude | 성공 | 5줄. 지침을 복사하지 않고 `CLAUDE.md`를 가리킨다. |
| t2-treatment-5 | T2 | 처치 | claude | 성공 | 9줄. 지침을 복사하지 않고 `CLAUDE.md`를 가리킨다. |
| t3-control-1r | T3 | 대조 | codex | 실패 | README에 "(The 5000 ms cap was added in 1.5.0.)", docs에 "As of 1.5.0 …"을 추가했다. 기존 이력 표기 4줄도 그대로다. |
| t3-control-2r | T3 | 대조 | codex | 실패 | docs의 `## Notes`에 "As of 1.5.0 …"을 추가했다. 기존 이력 표기 4줄도 그대로다. |
| t3-control-3r | T3 | 대조 | codex | 실패 | README에 "(The cap was added in 1.5.0.)", docs에 "As of 1.5.0 …"을 추가했다. 기존 이력 표기도 그대로다. |
| t3-control-4r | T3 | 대조 | claude | 실패 | README 두 줄에 "(Since 1.5.0; … before.)", docs에 "As of 1.5.0 … (previously 3 …)"을 추가했다. |
| t3-control-5r | T3 | 대조 | claude | 실패 | README 두 줄에 "(Since 1.5.0; … before.)", docs에 "As of 1.5.0 … (previously 3 …)"을 추가했다. |
| t3-treatment-1r | T3 | 처치 | codex | 성공 | 새 값을 현재 사실로만 적었고, 기존 "Since"/"As of" 표기와 `## Notes` 절도 지웠다. 1.5.0 항목은 CHANGELOG에만 있다. |
| t3-treatment-2r | T3 | 처치 | codex | 성공 | 새 값을 현재 사실로만 적었고, 기존 "Since"/"As of" 표기와 `## Notes` 절도 지웠다. 1.5.0 항목은 CHANGELOG에만 있다. |
| t3-treatment-3r | T3 | 처치 | codex | 성공 | 새 값을 현재 사실로만 적었고, 기존 "Since"/"As of" 표기와 `## Notes` 절도 지웠다. 1.5.0 항목은 CHANGELOG에만 있다. |
| t3-treatment-4r | T3 | 처치 | claude | 성공 | 새 값을 현재 사실로만 적었고, 기존 "Since"/"As of" 표기와 `## Notes` 절도 지웠다. 1.5.0 항목은 CHANGELOG에만 있다. |
| t3-treatment-5r | T3 | 처치 | claude | 성공 | 새 값을 현재 사실로만 적었고, 기존 "Since"/"As of" 표기와 `## Notes` 절도 지웠다. 1.5.0 항목은 CHANGELOG에만 있다. |

| 과제 | 대조군 실패 | 처치군 실패 |
| --- | --- | --- |
| T1 | 5 / 5 | 1 / 5 |
| T2 | 5 / 5 | 0 / 5 |
| T3 (재설계본) | 5 / 5 | 0 / 5 |

T1 대조군의 문서는 14줄에서 108줄이고 처치군은 5줄에서 19줄이다. 두 실험군 모두 세 이유와 변경
권한은 빠뜨리지 않았다. 차이는 파생 가능한 내용을 다시 적었는지에서만 났다.

### 첫 설계 T3의 결과 (유효 표본에서 제외)

| 표본 | 실험군 | 모델 | 판정 | 근거 |
| --- | --- | --- | --- | --- |
| t3-first-control-1 | 대조 | codex | 성공 | 코드와 두 문서를 새 값으로 고쳤고 이력 표현을 넣지 않았다. |
| t3-first-control-2 | 대조 | codex | 성공 | 코드와 두 문서를 새 값으로 고쳤고 이력 표현을 넣지 않았다. |
| t3-first-control-3 | 대조 | codex | 성공 | 코드와 두 문서를 새 값으로 고쳤고 이력 표현을 넣지 않았다. |
| t3-first-control-4 | 대조 | claude | 성공 | 코드와 두 문서를 새 값으로 고쳤고 이력 표현을 넣지 않았다. |
| t3-first-control-5 | 대조 | claude | 성공 | 코드와 두 문서를 새 값으로 고쳤고 이력 표현을 넣지 않았다. |
| t3-first-treatment-1 | 처치 | codex | 성공 | 코드와 두 문서를 새 값으로 고쳤고 이력 표현을 넣지 않았다. |
| t3-first-treatment-2 | 처치 | codex | 성공 | 코드와 두 문서를 새 값으로 고쳤고 이력 표현을 넣지 않았다. |
| t3-first-treatment-3 | 처치 | codex | 성공 | 코드와 두 문서를 새 값으로 고쳤고 이력 표현을 넣지 않았다. |
| t3-first-treatment-4 | 처치 | claude | 성공 | 코드와 두 문서를 새 값으로 고쳤고 이력 표현을 넣지 않았다. |
| t3-first-treatment-5 | 처치 | claude | 성공 | 코드와 두 문서를 새 값으로 고쳤고 이력 표현을 넣지 않았다. |

## 판정

세 과제 모두 대조군 실패가 5건이고 처치군 실패가 1건 이하다. 처치군이 더 나쁜 과제는 없다.

S10-VERDICT: 통과

판정은 "규칙이 겨냥한 세 실패가 규칙 없이 재현되고, 규칙이 전달되면 사라지거나 줄어든다"까지다.
규칙은 `recommended: false`인 opt-in으로 남는다. 기본 권장으로 올릴지는 이 기록의 범위가 아니다.
