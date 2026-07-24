# Phase 0 — S4 `reuse-first` micro-test (축소 표본)

> 이관본(filid 재사용 규칙 계승). 표본 축소(3) — 운영 실적이 대용 증거, 단일샷은 보강.
> **대조군이 실패를 보이지 않으면 이관본 근거로만 통과 처리.**

## 겨냥하는 실패

S4 §1 _"Reuse before you write: search first, compose second, write last."_
표적: 저장소에 이미 있는 유틸(`formatMoney`)이 그대로 쓸 수 있는데 **인라인 재구현**하는 실패.
함정: 새 파일에서 가격 포매팅이 필요하고, `(cents/100).toFixed(2)` 를 직접 쓰는 것이 import보다 손쉽다.

## 유혹 과제 (대조군)

````text
You are a coding agent working in a TypeScript repository. The relevant
existing files are below.

`src/money/formatMoney.ts`:
​```ts
export function formatMoney(cents: number, currency: string): string {
  const amount = (cents / 100).toFixed(2);
  return `${currency} ${amount}`;
}
​```

Task: add a function `renderReceiptLine(item)` in a new file
`src/receipt/renderReceiptLine.ts`. Given an item
`{ name: string; priceCents: number; currency: string }`, it returns a
single line such as `Coffee — USD 4.50` (an em dash between the name and
the formatted price). Follow the existing patterns in this repository.
Reply with the complete content of every file you create or modify.
````

## 판독 기준

| 축            | 질문                                                                                                          | 판정                             |
| ------------- | ------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| **F1 재구현** | 가격 포매팅에 기존 `formatMoney`를 import·사용하는가, 아니면 `(cents/100).toFixed(2)`류를 인라인 재구현하는가 | 재구현 = §4 실패 / 재사용 = 성공 |
| 분산          | 3회 수렴                                                                                                      | —                                |

## 결과표 (대조군 — 2026-07-23)

| 표본 | provider | F1         | 비고                                                    |
| ---- | -------- | ---------- | ------------------------------------------------------- |
| c1   | claude   | **재사용** | `import { formatMoney }` 후 위임 (`${name} — ${price}`) |
| c2   | claude   | **재사용** | 동일. `import { formatMoney }`                          |
| c3   | codex    | **재사용** | `import { formatMoney }` + `ReceiptItem` 타입 추출      |

**중간 집계**: F1 재사용 **3/3 = §4 실패 0/3.** 전원이 기존 `formatMoney`를 import·위임, 인라인 재구현 0. 세션 원문: c1 c48f6432 · c2 7b7949ba · c3 bc93860b. **판정(이관본+프로세스)**: §4 §1 reuse는 유능한 모델의 단일샷 기본 행동 → 대조군 실패 미재현(S3 §1·S5 §3와 동형). filid 운영 실적 + 실하니스 A/B가 증거. 단일샷 flip을 통과 조건으로 요구하지 않음. 처치군 미실행(gate 미충족).
