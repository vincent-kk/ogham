# Phase 0 — S5 `naming` micro-test (축소 표본)

> 이관본(filid 네이밍 + 재사용 §6 병합). 표본 축소(3). §1 mirror는 모델 기본 행동이라
> 단일샷 실패가 잘 안 남(S3 §1 유형) — 대신 실제 경향성이 있는 **§3 no-grab-bags**를 겨냥.

## 겨냥하는 실패

S5 §3 _"No grab-bags: `common`, `misc`, `util2`, `temp`, `new`, `stuff`, `extra`…"_
표적: 서로 무관한 작은 헬퍼 여럿을 `utils.ts`/`helpers.ts`/`misc.ts`/`common.ts` 같은
**잡동사니 파일**에 몰아넣는 실패. 함정: 세 헬퍼가 실제로 무관(id 포맷·카드 마스킹·복수화)해서
"공용 유틸"로 묶고 싶어진다.

## 유혹 과제 (대조군)

````text
You are a coding agent working in a TypeScript repository. The relevant
existing files are below.

`src/order/placeOrder.ts`:
​```ts
import type { Order } from './types';

export function placeOrder(order: Order): void {
  // persists the order
}
​```

`src/order/cancelOrder.ts`:
​```ts
export function cancelOrder(orderId: string): void {
  // marks the order cancelled
}
​```

Task: the order flow needs three small helper functions:
1. format an order id for display — `42` becomes `#00042` (a `#` then the
   number zero-padded to 5 digits);
2. mask a credit-card number so only the last four digits show —
   `"4111111111111234"` becomes `"**** 1234"`;
3. pluralize a noun by count — `(1, "item")` returns `"1 item"`,
   `(3, "item")` returns `"3 items"`.

Add these to the repository following the existing patterns. Reply with the
complete content of every file you create or modify.
````

## 판독 기준

| 축              | 질문                                                             | 판정                                       |
| --------------- | ---------------------------------------------------------------- | ------------------------------------------ |
| **F1 grab-bag** | 세 헬퍼를 `utils`/`helpers`/`misc`/`common` 류 파일에 몰아넣는가 | 그러면 §3 실패 / 도메인 명명 파일이면 성공 |
| 분산            | 3회 수렴                                                         | —                                          |

## 결과표 (대조군 — 2026-07-23)

| 표본 | provider | F1              | 비고                                                               |
| ---- | -------- | --------------- | ------------------------------------------------------------------ |
| c1   | claude   | **도메인 명명** | `formatOrderId.ts`·`maskCardNumber.ts`·`pluralize.ts` (1함수/파일) |
| c2   | claude   | **도메인 명명** | 동일 3파일                                                         |
| c3   | codex    | **도메인 명명** | `formatOrderId.ts`·`maskCreditCard.ts`·`pluralize.ts`              |

**중간 집계**: F1 grab-bag **0/3** — 3/3 전원 도메인 명명 파일(1함수/파일), `utils`/`helpers`/`misc`/`common` 잡동사니 0. 세션 원문: c1 93fbb990 · c2 e35ccf9a · c3 bd79e31d. **판정(이관본)**: §5 §3 no-grab-bags(및 §1 mirror)는 모델의 단일샷 기본 행동 → 대조군 실패 미재현(S3 §1·S4 §1와 동형). filid 운영 실적이 증거. 처치군 미실행(gate 미충족).
