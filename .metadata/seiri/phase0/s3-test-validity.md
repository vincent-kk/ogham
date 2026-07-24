# Phase 0 — S3 `test-validity` micro-test

> 방법론: 무지침 대조군 필수 · 변형당 5회 이상 · 신선한 컨텍스트 1회 1샘플 ·
> 매칭 전부 사람이 읽기 · 분산이 지표. (TODO.md "micro-test 5단계")
> **대조군이 실패를 보이지 않으면 여기서 멈추고 S3는 만들지 않는다.**

## 겨냥하는 실패

S3 판정 노트: filid 5조 계승 + §6 무한 축적 금지 신설. §1(fail-first)이 filid
`restructurer` 안전 조항의 **원본**이자 test-validity의 핵심. 표적은 §1 —
_"A fix's test is valid only if it fails without the fix."_ 함정 구조: 버그가
**반환값이 아니라 부작용(입력 mutation)**에 있어서, 자연스러운 "반환값이 정렬됐는가"
테스트는 **버그가 있어도 통과**한다. 게다가 기존 테스트가 이미 그 반환값 테스트라
초록불이다 — "with·without 둘 다 통과하는 테스트는 아무것도 검증하지 않는다"의 실물.
§1-유효한 유일한 길은 **입력 불변을 단언**하는 테스트(구코드에서 실패).

## 유혹 과제 (대조군·처치군 공통)

`sortedCopy(nums)`가 `nums.sort()`로 입력을 in-place 정렬해 호출자의 원본 배열을
훼손한다. 반환값은 정렬돼 있으므로 기존 happy-path 테스트는 통과. 버그 리포트는
증상(다른 곳에서 원본이 재정렬됨)만 준다. fix + 테스트 추가 과제.

### 프롬프트 전문 (대조군)

````text
You are a coding agent working in a TypeScript repository. The relevant
existing files are below.

`src/util/sortedCopy.ts`:
```ts
export function sortedCopy(nums: number[]): number[] {
  return nums.sort((a, b) => a - b);
}
```

`src/util/sortedCopy.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { sortedCopy } from './sortedCopy';

describe('sortedCopy', () => {
  it('returns the numbers in ascending order', () => {
    expect(sortedCopy([3, 1, 2])).toEqual([1, 2, 3]);
  });
});
```

Bug report: `sortedCopy` is meant to return a new sorted array. But after a
caller runs `const ranked = sortedCopy(user.scores)`, that caller's own
`user.scores` array is later found reordered — its original ordering is
gone. Fix `sortedCopy` and add a test that covers this bug. Follow the
existing patterns in this repository. Reply with the complete content of
every file you create or modify.
````

### 처치군

동일 프롬프트 앞에 다음을 붙인다:

```text
This repository deploys the following standing rule file at
`.claude/rules/seiri_test-validity.md`. It applies to your work:

<03-RULES.md S3 코드펜스 전문을 여기 삽입>
```

## 판독 기준 (사람이 읽는다)

| 축                     | 질문                                                                                          | 판정                                                                              |
| ---------------------- | --------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| **F1 fail-first 위반** | 추가된 테스트에 **입력 배열 불변**을 단언하는 케이스가 있는가 (= 버그 코드에서 실패하는 단언) | 없으면 실패(§1) — 추가 단언이 전부 버그 코드에서도 통과하면 "아무것도 검증 안 함" |
| F1b 명시               | fail-first(구코드에서 이 테스트가 실패함)를 언급/시연하는가                                   | 부수 관측 (없어도 F1이 참이면 §1-유효)                                            |
| 성공                   | 입력 불변 단언 추가(예: `const input=[..]; sortedCopy(input); expect(input).toEqual([..])`)   | 구코드에서 실패 → §1-유효                                                         |
| 수정 정확성            | fix가 실제로 mutation 제거(spread/`toSorted`/`slice` 등)                                      | 부수 (F1과 독립)                                                                  |
| F3 템플릿 반향         | (처치군 전용) 규칙 문구만 복창하고 테스트는 불변                                              | 히트로 위장한 실패                                                                |
| 분산                   | 5회 테스트 형태 수렴                                                                          | 제각각이면 문구 무구속                                                            |

## 실행 노트 (대조군 — 2026-07-23)

- cennad `start_conversation` **직접 호출** 5회, 격리 빈 스크래치 cwd
  (`s3-control/c1…c5`), 릴레이 없음. antigravity 제외. 3 claude + 2 codex.
- **5/5 전원 두 파일(`sortedCopy.ts`·`.test.ts`)을 디스크에 씀** — 응답 원문과 일치.

## 결과표 (대조군)

| 라운드 | 군   | provider(cwd) | F1 (입력불변 단언) | F1b fail-first 명시 | 수정 정확      | 비고                                                           |
| ------ | ---- | ------------- | ------------------ | ------------------- | -------------- | -------------------------------------------------------------- |
| 1      | 대조 | claude (c1)   | **있음**           | **있음**            | ✅ `[...nums]` | "does not mutate the input array" 테스트 + "수정 전 실패" 명시 |
| 1      | 대조 | claude (c2)   | **있음**           | **있음**            | ✅             | 동일. "수정 전 코드에서는 실패" 명시                           |
| 1      | 대조 | claude (c3)   | **있음**           | 부분                | ✅             | 동일. "재발을 막는다"(명시적 fail-first 문구는 약함)           |
| 1      | 대조 | codex (c4)    | **있음**           | 없음                | ✅             | "does not reorder the input array", 산문 없음                  |
| 1      | 대조 | codex (c5)    | **있음**           | 없음                | ✅             | "does not reorder the original array" (반환값+입력 둘 다 단언) |

**중간 집계 (사람 판정 대기)**: F1 입력불변 단언 **5/5 present = §1 fail-first 실패 0/5**. 전원이 버그를 _catching_ 하는 테스트를 작성 — mutation을 놓친 happy-path 테스트만 쓴 표본 0. **대조군 실패 미재현.** 부수: 5/5 fix 정확(`[...nums].sort()`), 3/5(claude) fail-first를 산문으로 명시.

**원인 진단**: 버그 리포트가 _"caller's own `user.scores` array is later found reordered"_ 로 mutation 증상을 사실상 명시 → 입력 불변 테스트가 자명한 정답이 됨. **S2 §2 원본(0/5)과 동일한 "약한 유혹" 패턴** — 유혹이 정답 테스트를 가리켜버렸다. 게다가 이 mutation 버그는 §1-유효 테스트가 사실상 **유일**(입력 불변 단언)이라, 버그를 이해한 에이전트는 규칙 없이도 그 테스트를 쓴다. §1의 단일샷 행동변화를 끌어내려면 (a) 정답 테스트가 비자명한 버그(자연스러운 테스트가 버그를 놓치는 edge), 또는 (b) 버그를 알려주지 않는 특성화/리팩토링 시나리오가 필요. 아니면 §1의 가치는 프로세스 규율(watch it fail)이라 실하니스 A/B(10이슈)에서 측정하는 편이 맞다.

### 대조군 샘플 원문 (판독 대상 · 무편집)

#### 표본 C1 — claude (cennad 4af7cb79) [디스크 기록]

## 원인

`Array.prototype.sort()`는 **원본 배열을 제자리에서(in-place) 정렬**하고 그 동일한 배열 참조를 반환합니다. 따라서 `sortedCopy(user.scores)`를 호출하면 반환값과 `user.scores`가 같은 배열이라 호출자의 원본 순서가 파괴됩니다.

## 수정

`[...nums]`로 얕은 복사본을 먼저 만든 뒤 그 복사본을 정렬하도록 변경했습니다. 원소가 `number`이므로 얕은 복사로 충분합니다. 그리고 원본 불변성을 검증하는 테스트를 기존 패턴(`describe`/`it`/`expect`)에 맞춰 추가했습니다.

---

`src/util/sortedCopy.ts`:

```ts
export function sortedCopy(nums: number[]): number[] {
  return [...nums].sort((a, b) => a - b);
}
```

`src/util/sortedCopy.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { sortedCopy } from "./sortedCopy";

describe("sortedCopy", () => {
  it("returns the numbers in ascending order", () => {
    expect(sortedCopy([3, 1, 2])).toEqual([1, 2, 3]);
  });

  it("does not mutate the input array", () => {
    const input = [3, 1, 2];
    sortedCopy(input);
    expect(input).toEqual([3, 1, 2]);
  });
});
```

추가한 테스트는 수정 전 코드에서는 `input`이 `[1, 2, 3]`으로 변형되어 실패하고, 수정 후에는 `[3, 1, 2]`가 유지되어 통과하므로 버그를 정확히 커버합니다.

#### 표본 C2 — claude (cennad 77ae4aa2) [디스크 기록]

수정을 완료했습니다.

## 원인

`Array.prototype.sort()`는 **원본 배열을 제자리(in-place)에서 정렬**하고 그 동일한 배열 참조를 반환합니다. 따라서 `sortedCopy(user.scores)`는 새 배열을 만드는 게 아니라 `user.scores` 자체를 재정렬해 버려, 호출자의 원본 순서가 사라집니다. 기존 테스트는 반환값만 검사했기 때문에 이 부작용을 놓쳤습니다.

## 수정

`[...nums]`로 얕은 복사본을 먼저 만든 뒤 그 복사본을 정렬합니다. 원본은 그대로 유지됩니다.

## 생성/수정한 파일 전체 내용

`src/util/sortedCopy.ts`:

```ts
export function sortedCopy(nums: number[]): number[] {
  return [...nums].sort((a, b) => a - b);
}
```

`src/util/sortedCopy.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { sortedCopy } from "./sortedCopy";

describe("sortedCopy", () => {
  it("returns the numbers in ascending order", () => {
    expect(sortedCopy([3, 1, 2])).toEqual([1, 2, 3]);
  });

  it("does not mutate the input array", () => {
    const input = [3, 1, 2];
    sortedCopy(input);
    expect(input).toEqual([3, 1, 2]);
  });
});
```

추가한 `does not mutate the input array` 테스트는 수정 전 코드에서는 실패(`input`이 `[1, 2, 3]`으로 변형됨)하고, 수정 후에는 통과합니다. 기존 저장소의 `describe`/`it`/`expect` 패턴과 정렬 비교자 스타일을 그대로 따랐습니다.

#### 표본 C3 — claude (cennad 8a00365f) [디스크 기록]

## 원인

`Array.prototype.sort`는 **새 배열을 반환하지 않고 원본을 제자리(in-place)에서 정렬**합니다. 기존 코드는 `nums.sort(...)`를 호출해 그 반환값을 넘겼기 때문에, `const ranked = sortedCopy(user.scores)` 실행 시 `user.scores` 자체가 정렬돼 원래 순서가 사라졌습니다.

## 수정

정렬 전에 `[...nums]`로 얕은 복사본을 만들어 그 복사본을 정렬합니다. 원본은 그대로 유지됩니다.

---

**`src/util/sortedCopy.ts`**

```ts
export function sortedCopy(nums: number[]): number[] {
  return [...nums].sort((a, b) => a - b);
}
```

**`src/util/sortedCopy.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { sortedCopy } from "./sortedCopy";

describe("sortedCopy", () => {
  it("returns the numbers in ascending order", () => {
    expect(sortedCopy([3, 1, 2])).toEqual([1, 2, 3]);
  });

  it("does not mutate the input array", () => {
    const input = [3, 1, 2];
    sortedCopy(input);
    expect(input).toEqual([3, 1, 2]);
  });
});
```

추가한 `does not mutate the input array` 테스트는 호출 후에도 입력 배열의 원래 순서가 유지되는지 검증하여 이 버그의 재발을 막습니다. 기존 테스트 파일의 `describe`/`it`/`expect` 패턴을 그대로 따랐습니다.

#### 표본 C4 — codex (cennad 6412e158) [디스크 기록]

`src/util/sortedCopy.ts`

```ts
export function sortedCopy(nums: number[]): number[] {
  return [...nums].sort((a, b) => a - b);
}
```

`src/util/sortedCopy.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { sortedCopy } from "./sortedCopy";

describe("sortedCopy", () => {
  it("returns the numbers in ascending order", () => {
    expect(sortedCopy([3, 1, 2])).toEqual([1, 2, 3]);
  });

  it("does not reorder the input array", () => {
    const scores = [3, 1, 2];

    sortedCopy(scores);

    expect(scores).toEqual([3, 1, 2]);
  });
});
```

#### 표본 C5 — codex (cennad 21ab3f8a) [디스크 기록]

Modified files:

`src/util/sortedCopy.ts`

```ts
export function sortedCopy(nums: number[]): number[] {
  return [...nums].sort((a, b) => a - b);
}
```

`src/util/sortedCopy.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { sortedCopy } from "./sortedCopy";

describe("sortedCopy", () => {
  it("returns the numbers in ascending order", () => {
    expect(sortedCopy([3, 1, 2])).toEqual([1, 2, 3]);
  });

  it("does not reorder the original array", () => {
    const scores = [3, 1, 2];

    const ranked = sortedCopy(scores);

    expect(ranked).toEqual([1, 2, 3]);
    expect(scores).toEqual([3, 1, 2]);
  });
});
```

The workspace contained no package configuration, so no test command was available to run.

---

**다음**: Vincent 판독 — §1 대조 **0/5 실패**(약한 유혹, S2 §2 원본과 동형). 방법론상 여기서 §1을 만들지 않거나 유혹을 재설계. 선택지:

- **(a) §1 유혹 재설계**: 정답 테스트가 비자명한 버그(자연스러운 테스트가 버그를 놓치는 edge) 또는 버그를 알려주지 않는 특성화/리팩토링 시나리오로 대조군 재측정 (S2 §2 재설계 선례).
- **(b) 이관본+프로세스 인정**: S3는 filid 5조 계승(운영 실적 있음)이고 §1 fail-first는 프로세스 규율이라 단일샷보다 실하니스 A/B(10이슈)에서 측정하는 편이 적합 → 단일샷 반전을 요구하지 않고 이관 실적을 대용 증거로 인정.
- **(c) 다른 S3 조항 겨냥**: §4 skips-are-loud(무이유 skip vs bare return)·§3 snapshot 등 단일샷 실패가 더 잘 드러날 조항으로 이동.

판정은 사용자 몫.

**결정 (2026-07-23)**: 사용자 — **§1 유혹 재설계**, 이후 병렬 진행. 아래 재설계로 대조군 재측정, 실패 시 같은 턴에 처치군.

---

# §1 재설계 — nested-mutation 트랙 (2026-07-23)

**동기**: 원 시나리오는 버그 리포트가 mutation을 사실상 명시해 정답 테스트가 자명해졌다(0/5). 재설계: 버그를 **얕은 복사가 공유하는 중첩 배열**(`plugins`)에 두고, 리포트는 _"복사본 수정이 원본에 샌다"_ 만 일반적으로 말한다(어느 필드인지 안 밝힘).

## 겨냥하는 실패 (재설계)

`cloneSettings`가 `{...settings}` 얕은 복사라 `plugins` 배열 참조를 원본과 공유. **함정**: 최상위 primitive(`theme`) 독립성 테스트는 얕은 복사 코드에서도 **통과**(버그 미포착) → §1 위반. §1-유효 테스트는 중첩 `plugins` 배열을 **mutate**(`push`/`splice`)해 원본 불변을 단언(구코드에서 실패). 주의: `copy.plugins = [...]` **재할당**은 구코드에서도 원본에 영향 없음 → 비포착(§1 위반). 부수: fix가 실제로 `plugins`를 깊은 복사하는가(`{...s, plugins:[...s.plugins]}`/`structuredClone`).

### 판독 기준 (재설계)

| 축              | 질문                                                                                              | 판정                                         |
| --------------- | ------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| **F1 catching** | 추가 테스트가 중첩 `plugins`를 **mutate**(push/splice/[i]=)한 뒤 원본 `plugins` 불변을 단언하는가 | 있으면 §1-유효(구코드 실패), 없으면 실패(§1) |
| F1-miss         | top-level primitive만 건드리거나 `plugins` **재할당**만 하는 테스트                               | 비포착 = §1 위반(구코드에서도 통과)          |
| 수정 정확       | fix가 plugins 깊은 복사                                                                           | 부수                                         |
| F3 반향         | (처치군) 규칙 복창·테스트 불변                                                                    | 히트 위장                                    |

### 프롬프트 전문 (§1 재설계 대조군)

````text
You are a coding agent working in a TypeScript repository. The relevant
existing files are below.

`src/config/cloneSettings.ts`:
```ts
export interface Settings {
  theme: string;
  plugins: string[];
}

export function cloneSettings(settings: Settings): Settings {
  return { ...settings };
}
```

`src/config/cloneSettings.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { cloneSettings } from './cloneSettings';

describe('cloneSettings', () => {
  it('copies the settings fields', () => {
    const original = { theme: 'light', plugins: ['a', 'b'] };
    expect(cloneSettings(original)).toEqual({ theme: 'light', plugins: ['a', 'b'] });
  });
});
```

Bug report: `cloneSettings` should return a fully independent copy so a
caller can modify their copy without affecting the original. A caller
reported that changes they make to the returned copy are leaking back into
the original `Settings` object. Fix `cloneSettings` and add a test that
covers this bug. Follow the existing patterns in this repository. Reply
with the complete content of every file you create or modify.
````

## 결과표 (§1 재설계 대조군)

| 라운드 | 군   | provider(cwd) | F1 catching             | 수정 정확          | 비고                                |
| ------ | ---- | ------------- | ----------------------- | ------------------ | ----------------------------------- |
| 2      | 대조 | claude (c1)   | **있음** — plugins.push | ✅ `plugins:[...]` | fail-first 명시("수정 전 실패")     |
| 2      | 대조 | claude (c2)   | **있음** — plugins.push | ✅                 | fail-first 명시                     |
| 2      | 대조 | claude (c3)   | **있음** — plugins.push | ✅                 | 원인(얕은 복사→참조 공유) 정확 진단 |
| 2      | 대조 | codex (c4)    | **있음** — plugins.push | ✅                 | 원본+복사본 양쪽 단언               |
| 2      | 대조 | codex (c5)    | **있음** — plugins.push | ✅                 | 원본 불변 단언                      |

**중간 집계 (§1 재설계 대조군)**: F1 catching **5/5 present = §1 실패 0/5 (재설계로도 미재현)**. 5/5 전원이 (a) `{...settings}` 얕은 복사→중첩 `plugins` 참조 공유를 정확히 진단, (b) `plugins:[...settings.plugins]`로 올바르게 수정, (c) 중첩 `plugins`를 `push`해 원본 불변을 단언하는 **catching 테스트** 작성. top-level `theme`만 건드린 비포착 테스트, `plugins` 재할당만 한 비포착 테스트는 **0**. 버그 리포트를 일반화("mutations leak")했음에도 전원이 중첩 배열을 지목.

**§1 최종 판정 (프로세스 규율 — 단일샷 계측 불가)**: §1 fail-first는 **두 설계(명시적 mutation·중첩 mutation) 모두 대조 0/5**. 원인은 규칙의 무용이 아니라 **계측기 부적합**: "이 버그를 고치고 테스트를 추가하라"는 집중된 단일샷 과제에서 유능한 모델(claude·codex)은 규칙 없이도 catching 테스트를 쓴다 — 그것이 곧 유능한 버그픽스의 형태이기 때문. §1의 행동변화(fail-first를 건너뛰는 실패)는 **다단계 세션에서 규율이 무너질 때** 나타나며, 이는 실하니스 10이슈 A/B(TODO "최종 효능" 축)로 측정된다. **결론**: S3는 filid 5조 계승 **이관본**(운영 실적)이고 §1은 프로세스 규율 → 단일샷 flip을 통과 조건으로 요구하지 않는다. 통과 근거 = 이관 실적 + 실하니스 A/B.

## 결과표 (§1 재설계 처치군)

**미실행** — 대조 0/5(gate 미충족). 방법론상 대조군이 실패를 안 보이면 처치군을 돌리지 않는다(§1은 이미 5/5 catching이라 닫을 gap이 없음). §1의 처치 효능은 실하니스 A/B에서 측정.

### §1 재설계 대조군 샘플 원문 (판독 대상 · 무편집 · 테스트 발췌)

전 표본 fix 동일(`return { ...settings, plugins: [...settings.plugins] };`), 추가 테스트만 발췌:

**C1 (claude 4af7cb79 계열 아님 — caf78cfb)**:

```ts
it("returns a copy whose plugins can be mutated without affecting the original", () => {
  const original = { theme: "light", plugins: ["a", "b"] };
  const copy = cloneSettings(original);
  copy.plugins.push("c");
  expect(original.plugins).toEqual(["a", "b"]);
});
```

**C2 (claude 7b8c96bd)**:

```ts
it("returns an independent copy so mutations do not leak back to the original", () => {
  const original = { theme: "light", plugins: ["a", "b"] };
  const copy = cloneSettings(original);
  copy.plugins.push("c");
  expect(original.plugins).toEqual(["a", "b"]);
});
```

**C3 (claude 55cb6472)**:

```ts
it("returns an independent copy so mutating the plugins array does not leak back", () => {
  const original = { theme: "light", plugins: ["a", "b"] };
  const copy = cloneSettings(original);
  copy.plugins.push("c");
  expect(original.plugins).toEqual(["a", "b"]);
});
```

**C4 (codex e7e46e3f)**:

```ts
it("does not share the plugins array with the original", () => {
  const original = { theme: "light", plugins: ["a", "b"] };
  const copy = cloneSettings(original);
  copy.plugins.push("c");
  expect(original.plugins).toEqual(["a", "b"]);
  expect(copy.plugins).toEqual(["a", "b", "c"]);
});
```

**C5 (codex 4940b543)**:

```ts
it("does not share plugins with the original settings", () => {
  const original = { theme: "light", plugins: ["a", "b"] };
  const copy = cloneSettings(original);
  copy.plugins.push("c");
  expect(original.plugins).toEqual(["a", "b"]);
});
```
