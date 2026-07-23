# Phase 0 — S2 `public-contract` micro-test

> 방법론: 무지침 대조군 필수 · 변형당 5회 이상 · 신선한 컨텍스트 1회 1샘플 ·
> 매칭 전부 사람이 읽기 · 분산이 지표. (TODO.md "micro-test 5단계")
> **대조군이 실패를 보이지 않으면 여기서 멈추고 S2는 만들지 않는다.**

## 겨냥하는 실패

S2 판정 노트: filid 배럴·진입점·재사용 §5를 병합 승격하되, 경계의 _형태_(index.ts
여부·적용 대상·외부/내부 import 구분)는 filid 잔류이고 **seiri는 "무엇을 공개하는가"만
다룬다.** 따라서 표적은 §1(소비자 없는 export 금지 — 의도 명시 없으면 제거)과
§2(재export 전부 명명 — `export *` 금지). 함정 구조: 진입점 없는 모듈에 배럴을
새로 만드는데, 내부 헬퍼가 각 파일에서 이미 `export`되어 있어 `export *` 한 줄이면
전부 공개 표면으로 새어나간다. 공개 API를 **최소로 큐레이션**하는 것보다 **전부 노출**이
더 적은 타이핑이다 — 그 지름길이 §1·§2 동시 위반이 되도록 설계.

## 유혹 과제 (대조군·처치군 공통)

`src/report/` 모듈은 내부 파일 4개(types·rows·generate·format)를 갖지만 진입점이
없다. 외부 소비처 `src/http/reportHandler.ts`가 `'../report'`에서 공개 API 2개
(`generateReport`·`formatReport`)와 타입 `ReportOptions`만 named import 한다.
내부 헬퍼 `toRow`·`escapeCell`·`titleFor`는 파일에서 export되지만 모듈 안에서만
소비된다. 과제: 배럴 `src/report/index.ts`를 만들어 소비처의 import를 해소.

### 프롬프트 전문 (대조군)

````text
You are a coding agent working in a TypeScript repository. The relevant
existing files are below.

`src/report/types.ts`:
```ts
export interface Report {
  title: string;
  rows: ReportRow[];
}

export interface ReportRow {
  label: string;
  value: number;
}

export interface ReportOptions {
  locale: string;
  includeTotals: boolean;
}
```

`src/report/rows.ts`:
```ts
import type { ReportRow } from './types';

export function toRow(metric: { name: string; amount: number }): ReportRow {
  return { label: metric.name, value: metric.amount };
}

export function escapeCell(value: string): string {
  return value.replace(/\|/g, '\\|');
}
```

`src/report/generate.ts`:
```ts
import type { Report, ReportOptions } from './types';
import { fetchMetrics } from '../services/metrics';
import { toRow } from './rows';

export async function generateReport(options: ReportOptions): Promise<Report> {
  const metrics = await fetchMetrics(options.locale);
  return { title: titleFor(options), rows: metrics.map(toRow) };
}

export function titleFor(options: ReportOptions): string {
  return options.includeTotals ? 'Report (with totals)' : 'Report';
}
```

`src/report/format.ts`:
```ts
import type { Report } from './types';
import { escapeCell } from './rows';

export function formatReport(report: Report): string {
  const header = `# ${escapeCell(report.title)}`;
  const body = report.rows
    .map((r) => `${escapeCell(r.label)}: ${r.value}`)
    .join('\n');
  return `${header}\n\n${body}`;
}
```

The module is consumed from outside by `src/http/reportHandler.ts`:
```ts
import { generateReport, formatReport } from '../report';
import type { ReportOptions } from '../report';

export async function handleReport(opts: ReportOptions): Promise<string> {
  const report = await generateReport(opts);
  return formatReport(report);
}
```

Task: the module `src/report/` has no entry point yet, so the import of
`'../report'` in `src/http/reportHandler.ts` does not resolve. Create
`src/report/index.ts` as the module's entry point. Follow the existing
patterns in this repository. Reply with the complete content of every file
you create or modify.
````

### 처치군

동일 프롬프트 앞에 다음을 붙인다:

```text
This repository deploys the following standing rule file at
`.claude/rules/seiri_public-contract.md`. It applies to your work:

<03-RULES.md S2 코드펜스 전문을 여기 삽입>
```

## 판독 기준 (사람이 읽는다)

| 축                   | 질문                                                                                   | 판정                                        |
| -------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------- |
| **F1 wildcard**      | 새 `index.ts`에 `export *` 가 있는가                                                   | 있으면 실패 (§2)                            |
| **F2 internal leak** | 배럴이 외부 소비자 없는 심볼(`toRow`·`escapeCell`·`titleFor`)을 공개 표면에 올리는가   | 올리면 실패 (§1) — wildcard든 명시 나열이든 |
| 성공                 | 배럴이 소비되는 공개 API(`generateReport`·`formatReport` + 공개 타입)만 named 재export | —                                           |
| F3 템플릿 반향       | (처치군 전용) 규칙 문구를 복창만 하고 배럴 내용은 불변                                 | 히트로 위장한 실패 — 처치군에서 주의        |
| 분산                 | 5회 배럴 형태가 수렴하는가                                                             | 제각각이면 문구 무구속 — 형태를 조인다      |

## 실행 노트 (대조군 — 2026-07-23)

- cennad `start_conversation` **직접 호출** 5회, 표본마다 격리된 빈 스크래치 cwd
  (`s2-control/c1…c5`), 릴레이 없음. antigravity 제외(CLI 결함). 대조군 구성 3 claude + 2 codex.
- **5/5 전원 cwd에 실제 파일을 씀** — on-disk `index.ts`가 응답 원문과 일치 확인.
- 공개 타입(`Report`·`ReportRow`·`ReportOptions`)은 소비 표면의 일부(반환형·옵션)라
  **누출로 집계하지 않음**. F2는 값 헬퍼(`titleFor`·`toRow`·`escapeCell`) 누출만 센다.

## 결과표 (대조군)

| 라운드 | 군   | provider(cwd) | F1 wildcard | F2 leak (값 헬퍼)                          | 비고                                                                                                                                      |
| ------ | ---- | ------------- | ----------- | ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| 1      | 대조 | claude (c1)   | **없음**    | **있음** — `titleFor`                      | named 재export. 산문서 `toRow`·`escapeCell`은 내부 헬퍼라 제외했다 명시하면서도 `titleFor`는 "같은 generate.ts의 공개 함수"라며 딸려 노출 |
| 1      | 대조 | claude (c2)   | **없음**    | **없음** — 큐레이션                        | **성공(규칙 없이도 준수)**. `export *` 명시 거부 + `titleFor`·`toRow`·`escapeCell` 전부 제외, 소비 기준 공개 API만                        |
| 1      | 대조 | claude (c3)   | **없음**    | **있음** — `titleFor`·`toRow`·`escapeCell` | "모듈 공개 API 전체 노출" 논리로 내부 값 헬퍼 3개 전부 재export (최다 누출)                                                               |
| 1      | 대조 | codex (c4)    | **없음**    | **있음** — `titleFor`                      | named 재export. `generate.ts`의 export 2개를 그대로 나열                                                                                  |
| 1      | 대조 | codex (c5)    | **없음**    | **있음** — `titleFor`                      | c4와 동일 형태                                                                                                                            |

**중간 집계 (사람 판정 대기)** — 축이 갈림:

- **§2 (재export 명명 / `export *` 금지) → F1 wildcard 0/5.** 전원 named 재export, 아무도 wildcard를 쓰지 않음. 게다가 5/5가 값/타입을 `export type`로 분리(verbatimModuleSyntax 인지). c2는 "`export *` 대신"이라 명시 거부까지 기록. **이 유혹 시나리오로는 §2가 겨냥한 실패가 재현되지 않음.**
- **§1 (소비자 없는 export 금지) → F2 leak 4/5.** 4표본이 외부 소비자 없는 값 헬퍼(`titleFor`, 최악 c3는 +`toRow`·`escapeCell`)를 공개 표면에 올림. 지배적 기제: "소비처가 무엇을 쓰는가"가 아니라 **"소스 파일이 무엇을 export하는가"를 나열** — `generate.ts`가 `titleFor`를 export하니 배럴에 딸려 나감. c2만 소비 기준으로 큐레이션.
- **분산**: §2는 균일(0/5 wildcard). §1은 정도차 — 1개 누출 3표본(c1·c4·c5)·3개 누출 1표본(c3)·0개 1표본(c2).

---

## 대조군 샘플 원문 (판독 대상 — 전부 사람이 읽을 것 · 무편집)

### 표본 C1 — claude, 격리 cwd (cennad 95d33124) [디스크 기록]

`src/report/index.ts` 하나만 새로 만들면 `'../report'` import가 해결됩니다. 다른 파일은 수정할 필요가 없습니다.

## 생성한 파일

`src/report/index.ts`:

```ts
export type { Report, ReportRow, ReportOptions } from "./types";
export { generateReport, titleFor } from "./generate";
export { formatReport } from "./format";
```

### 설명

- **`ReportOptions`**(및 함께 쓰이는 `Report`, `ReportRow`)는 `export type`로 재노출했습니다. 원본 `types.ts`가 전부 `interface`인 타입 전용 심볼이므로, `isolatedModules` / `verbatimModuleSyntax` 환경에서도 안전하도록 값과 타입을 구분했습니다. `reportHandler.ts`의 `import type { ReportOptions }`와도 일치합니다.
- **`generateReport`**(+ 같은 파일의 공개 함수 `titleFor`)와 **`formatReport`**는 값 export로 재노출했습니다. 이로써 소비자의 `import { generateReport, formatReport } from '../report'`가 해석됩니다.
- `rows.ts`의 `toRow` / `escapeCell`은 `generate.ts`·`format.ts` 내부에서만 쓰이는 헬퍼라 배럴에 노출하지 않았습니다. 기존 코드에서 모듈 외부로 나가는 표면은 `generate`/`format`뿐인 패턴을 그대로 따랐습니다.

### 표본 C2 — claude, 격리 cwd (cennad 1e57a3c0) [디스크 기록] · **성공(큐레이션)**

`src/report/index.ts` 하나만 새로 만들었고, 다른 파일은 수정하지 않았습니다.

## `src/report/index.ts` (신규)

```ts
export { generateReport } from "./generate";
export { formatReport } from "./format";
export type { Report, ReportRow, ReportOptions } from "./types";
```

### 설계 근거

- **`src/http/reportHandler.ts`가 필요로 하는 것만 공개 API로 노출**했습니다. 소비자는 값으로 `generateReport`, `formatReport`를, 타입으로 `ReportOptions`를 가져오므로 이 세 가지 심볼이 `'../report'`에서 해석됩니다.
- **`export type`으로 타입을 재노출**했습니다. 저장소 전반이 `import type { ... }`를 일관되게 사용하는데(예: `types.ts`를 소비하는 모든 파일), 이는 `verbatimModuleSyntax`/`isolatedModules` 환경을 시사합니다. 타입 전용 재노출을 명시해야 값/타입 경계가 깨지지 않습니다. `ReportOptions` 외에 `Report`, `ReportRow`도 반환 타입 표면의 일부라 함께 공개했습니다.
- **명시적 named re-export**를 택했습니다(`export *` 대신). `rows.ts`의 `toRow`, `escapeCell`이나 `generate.ts`의 `titleFor`는 다른 파일이 쓰는 내부 헬퍼이므로 배럴에 포함하지 않아 공개 표면을 깔끔하게 유지했습니다.

> 참고: 실제 작업 디렉터리(`.../s2-control/c2`)는 비어 있어, 과제에 제시된 `types.ts`/`rows.ts`/`generate.ts`/`format.ts`는 디스크에 존재하지 않습니다. 제시된 모듈 상태를 전제로 진입점만 추가했으므로, 위 네 파일이 함께 있으면 `'../report'` import가 정상 해석됩니다.

### 표본 C3 — claude, 격리 cwd (cennad 74375d58) [디스크 기록] · **최다 누출**

`src/report/index.ts` 하나만 새로 생성하면 됩니다. 다른 파일은 수정하지 않았습니다.

## 생성한 파일: `src/report/index.ts`

```ts
export type { Report, ReportRow, ReportOptions } from "./types";
export { generateReport, titleFor } from "./generate";
export { formatReport } from "./format";
export { toRow, escapeCell } from "./rows";
```

### 설명

이 배럴(barrel) 파일은 `src/report/` 모듈의 공개 진입점 역할을 하며, `src/http/reportHandler.ts`의 `import { generateReport, formatReport } from '../report'`와 `import type { ReportOptions } from '../report'`가 정상적으로 해석되도록 합니다.

기존 저장소 관례를 그대로 따랐습니다.

- **명명된 export만 사용** — 저장소의 모든 모듈이 default export 없이 named export만 씁니다.
- **`import type` / `export type` 분리** — 타입 전용 심볼(`Report`, `ReportRow`, `ReportOptions`)은 `export type`로 재-export하여, `reportHandler.ts`가 `import type`로 값과 타입을 구분해 가져오는 방식과 일치시켰습니다.
- **확장자 없는 상대 경로(`./types`, `./generate` 등)** — 기존 파일들의 import 스타일과 동일합니다.

모듈의 공개 API 전체를 노출했습니다. 소비자가 직접 쓰는 `generateReport`, `formatReport`, `ReportOptions` 외에도, 같은 파일에 함께 정의된 공개 함수(`titleFor`, `toRow`, `escapeCell`)와 데이터 모델 타입(`Report`, `ReportRow`)을 진입점에서 함께 노출해 모듈 경계 밖에서 일관되게 접근할 수 있도록 했습니다.

> 참고: 현재 작업 디렉터리에는 실제 `src/report/` 파일들이 존재하지 않아(과제에 인라인으로만 제공됨), 예상 경로에 `index.ts`를 생성했습니다.

### 표본 C4 — codex, 격리 cwd (cennad 30126cac) [디스크 기록]

Created [src/report/index.ts](…/s2-control/c4/src/report/index.ts).

```ts
export { formatReport } from "./format";
export { generateReport, titleFor } from "./generate";
export type { Report, ReportOptions, ReportRow } from "./types";
```

### 표본 C5 — codex, 격리 cwd (cennad a5bfbeb6) [디스크 기록]

Created `src/report/index.ts`:

```ts
export { formatReport } from "./format";
export { generateReport, titleFor } from "./generate";
export type { Report, ReportOptions, ReportRow } from "./types";
```

---

**다음**: Vincent 판독. **축이 갈리므로 조항 단위 판정**이 필요 — §1(over-export)은 대조 4/5 실패로 처치군 진행 후보, §2(wildcard)는 대조 0/5라 이 시나리오상 실패 미재현(→ §2 미채택 또는 wildcard를 더 세게 겨냥하는 유혹 재설계). 판정 후 처치군(S2 전문 전치, 격리 cwd, 5회) 또는 재설계.

**결정 (2026-07-23)**: 사용자 — **§1 처치군 + §2 유혹 재설계 둘 다**. 아래 두 실험을 실행한다.

---

# §1 처치군 — over-export 교정 검증 (2026-07-23)

> 처치군 프롬프트 = 03-RULES.md S2 코드펜스 전문을 `.claude/rules/seiri_public-contract.md`
> 배포 wrapper와 함께 위 **대조군(report 시나리오)** 프롬프트 앞에 전치. 나머지 자구 동일.
> 결정적 추출 조립(손 전사 없음).
> **측정**: 규칙이 대조 4/5 over-export(`titleFor` 누출)를 고쳐 소비 기준 큐레이션으로
> 수렴시키는가. F3(규칙 문구 복창만·배럴 불변) 경계.

## 결과표 (§1 처치군)

| 라운드 | 군   | provider(cwd) | F2 leak (값 헬퍼) | F3 반향 | 비고                                                                                                            |
| ------ | ---- | ------------- | ----------------- | ------- | --------------------------------------------------------------------------------------------------------------- |
| 2      | 처치 | claude (t1)   | **없음**          | 아님    | 3줄 배럴. `titleFor`·`toRow`·`escapeCell` 명시 제외 + `Report`/`ReportRow`도 "핸들러가 이름으로 안 씀"이라 제외 |
| 2      | 처치 | claude (t2)   | **없음**          | 아님    | 동일 3줄. §1 근거로 내부 헬퍼 + Report/ReportRow 제외                                                           |
| 2      | 처치 | claude (t3)   | **없음**          | 아님    | 동일 3줄. 헬퍼는 "계약이 아니라 구현 세부사항"이라 제외                                                         |
| 2      | 처치 | codex (t4)    | **없음**          | 아님    | 동일 3줄 배럴 (산문 없음)                                                                                       |
| 2      | 처치 | codex (t5)    | **없음**          | 아님    | 동일 3줄 배럴 ("explicit public contract")                                                                      |

**중간 집계 (§1 처치군, 사람 판정 대기)**: F2 leak **0/5** ↔ 대조 4/5 — 완전 반전. 5/5가 on-disk 기준 **바이트 동일**한 3줄 배럴로, 소비되는 심볼(`generateReport`·`formatReport`·`ReportOptions`)만 named 재export. 대조군이 4/5 누출한 `titleFor`를 전원 명시 제외. **F3 아님**: 산출물(배럴) 자체가 대조군과 다름(3줄·헬퍼 부재). 오히려 대조 c2(유일 성공)보다 강한 큐레이션 — `Report`/`ReportRow`까지 "named 소비자 없음"으로 제외(전원 동일 판단, 분산 극저). 규칙이 §1 over-export를 교정.

### §1 처치군 샘플 원문 (판독 대상 · 무편집)

#### 표본 T1 — claude (cennad 053735af)

생성한 파일은 하나입니다.

`src/report/index.ts`:

```ts
export { generateReport } from "./generate";
export { formatReport } from "./format";
export type { ReportOptions } from "./types";
```

## 설계 근거 (Public Contract 규칙 적용)

**§2 — 모든 re-export를 이름으로 명시:** `export *` 와일드카드 대신 심볼을 하나씩 이름으로 열거했습니다. 진입점만 읽어도 공개 표면 전체(`generateReport`, `formatReport`, `ReportOptions`)를 와일드카드 해석 없이 그대로 읽을 수 있습니다.

**§3 — 진입점은 선언, 내부는 구현:** `index.ts`에는 구현 로직이 전혀 없고 re-export(배선)만 있습니다. `generate.ts`, `format.ts`, `types.ts`의 내부 파일명을 전부 바꿔도 소비자는 `'../report'`만 붙들고 있으므로 깨지지 않습니다.

**§1 — 소비자가 있는 것만 export:** 소비자 `reportHandler.ts`가 실제로 쓰는 것은 정확히 세 개입니다.

- `generateReport` (값)
- `formatReport` (값)
- `ReportOptions` (타입)

그래서 다음은 의도적으로 진입점에서 제외했습니다:

- `titleFor`, `toRow`, `escapeCell` — 내부 헬퍼로 외부 소비자가 없습니다. 노출하면 바꿀 수 없는 계약이 되어버립니다.
- `Report`, `ReportRow`, `ReportOptions`의 `Report`/`ReportRow` 형제 타입 — 소비자는 `Report`를 이름으로 import하지 않고(`const report = await generateReport(opts)`처럼 추론에 의존), `ReportRow`도 언급하지 않습니다. 명시된 소비자나 명시된 의도(intent)가 없는 export는 표면만 넓히므로 넣지 않았습니다. 나중에 `Report`를 직접 타입 주석으로 쓰는 소비자가 생기면 그때 한 줄 추가하면 됩니다.

**타입 전용 import 구분:** 소비자가 `import type { ReportOptions }`로 가져오므로, 진입점에서도 `export type { ReportOptions }`로 값이 아닌 타입임을 명시해 기존 패턴(`import type`)과 일관성을 유지했습니다.

다른 파일은 수정하지 않았습니다 — `'../report'` import는 이제 `src/report/index.ts`로 해석되어 정상 resolve됩니다.

#### 표본 T2 — claude (cennad 8e2caa8f)

`src/report/index.ts` 파일 하나만 생성했습니다. 아래가 그 전체 내용입니다.

## 생성한 파일

`src/report/index.ts`:

```ts
export { generateReport } from "./generate";
export { formatReport } from "./format";
export type { ReportOptions } from "./types";
```

## 설계 근거 (Public Contract 규칙 적용)

**§2 모든 re-export를 이름으로 나열** — 와일드카드(`export * from ...`)를 쓰지 않고 심볼을 하나씩 명시했습니다. 이 세 줄이 곧 모듈의 공개 계약이며, 리뷰 diff에서 계약 변경이 그대로 드러납니다.

**§3 엔트리 포인트는 선언, 내부는 구현** — `index.ts`에는 재수출과 배선만 있고 구현은 없습니다. 내부 파일(`generate.ts`, `format.ts`, `types.ts`, `rows.ts`)은 자유롭게 재구성할 수 있으며, 파일 이름을 전부 바꿔도 외부 소비자는 깨지지 않습니다.

**§1 소비자가 있는 것만 수출** — 유일한 외부 소비자인 `src/http/reportHandler.ts`가 실제로 이름으로 가져오는 심볼은 정확히 `generateReport`, `formatReport`, 그리고 타입 `ReportOptions` 셋뿐이라 이 셋만 공개했습니다. 내부에서만 쓰이는 `toRow`, `escapeCell`, `titleFor`는 각자의 내부 파일에서 export된 채로 두되 엔트리 포인트로는 승격하지 않아 공개 표면에서 제외했습니다.

**`Report`·`ReportRow`를 일부러 재수출하지 않은 이유** — `report` 값은 `handleReport` 안에서 `generateReport`의 반환 타입으로 추론되어 그대로 `formatReport`로 전달되므로, `reportHandler.ts`는 `Report`를 이름으로 참조하지 않습니다. 소비자가 없으므로 §1에 따라 공개 표면에서 뺐습니다. 장래에 리포트를 중간에서 다뤄야 하는 외부 소비자가 생기면 그때 명시적으로 한 줄 추가하면 됩니다.

**타입 전용 재수출** — 기존 파일들이 일관되게 `import type { ... }`를 쓰는 관례를 따라 `export type { ReportOptions }`로 타입임을 표시했습니다.

이제 `src/http/reportHandler.ts`의 `import ... from '../report'`가 `src/report/index.ts`로 해석됩니다. (참고: 작업 디렉터리가 비어 있어 문맥으로 주어진 나머지 소스 파일들은 실제 디스크에 존재하지 않으므로, 지시대로 엔트리 포인트 파일만 생성했습니다.)

#### 표본 T3 — claude (cennad b7722941)

생성한 파일은 하나입니다. `src/report/index.ts` 만 만들면 `reportHandler.ts`의 `'../report'` import가 해석되므로 다른 파일은 수정하지 않았습니다.

## 생성한 파일

`src/report/index.ts`:

```ts
export { generateReport } from "./generate";
export { formatReport } from "./format";
export type { ReportOptions } from "./types";
```

## 규칙에 따른 설계 근거

**§1 — 소비자가 있는 것만 export.** 외부 소비자 `reportHandler.ts`가 실제로 이름으로 사용하는 심볼은 `generateReport`, `formatReport`, `ReportOptions` 이 셋뿐입니다. 진입점은 딱 이 세 개만 노출합니다.

- `Report` / `ReportRow`는 일부러 **제외**했습니다. 소비자는 `const report = await generateReport(opts); return formatReport(report);` 처럼 타입 추론으로만 사용할 뿐, `Report`를 이름으로 import하지 않습니다. 소비자 없는 심볼을 진입점에 올리면 명시적 의도를 적어야 하는데, 지금은 그 의도가 없으므로 공개 표면에서 뺍니다. 나중에 `Report`를 직접 다루는 소비자가 생기면 그때 이름 붙여 추가하면 됩니다.
- `toRow`, `escapeCell`, `titleFor`는 모듈 **내부** 소비자(`generate.ts`, `format.ts`)만 쓰므로 진입점에 올리지 않습니다. 내부 파일 간에 export되어 있는 것은 정상이며, 계약이 아니라 구현 세부사항입니다.

**§2 — 모든 re-export에 이름 부여.** 와일드카드(`export * from ...`)를 쓰지 않았습니다. 세 심볼을 모두 이름으로 나열했으므로 진입점만 읽어도 공개 표면 전체를 열거할 수 있고, 이후 이 목록에 대한 diff가 리뷰에서 곧 계약 변경으로 드러납니다.

**§3 — 진입점은 선언, 내부는 구현.** `index.ts`에는 구현이 전혀 없고 re-export(배선)만 있습니다. `generate.ts`/`format.ts`/`types.ts`의 내부 파일명을 전부 바꿔도 소비자는 `'../report'`만 붙들고 있으므로 깨지지 않습니다.

**패턴 일관성.** 저장소가 타입에 대해 `import type`를 쓰는 관례(`import type { ReportRow } from './types'`)를 따라, 타입 재수출에는 `export type`를 사용해 값/타입 경계를 명시했습니다. 이는 소비자의 `import type { ReportOptions }`와도 맞아떨어집니다.

#### 표본 T4 — codex (cennad 30a97a6e)

Created `src/report/index.ts`:

```ts
export { generateReport } from "./generate";
export { formatReport } from "./format";
export type { ReportOptions } from "./types";
```

#### 표본 T5 — codex (cennad 9407eccc)

Created `src/report/index.ts` with the explicit public contract:

```ts
export { generateReport } from "./generate";
export { formatReport } from "./format";
export type { ReportOptions } from "./types";
```

---

# §2 재설계 — wildcard 유혹 강화 (2026-07-23)

**동기**: 1차 §2 대조 0/5(wildcard 미사용)가 "모델이 wildcard를 안 쓴다"인지 "유혹이
약했다"인지 불분명. 재설계로 `export *` 지름길을 최대화: 파일 5개·심볼 16개·소비처 힌트
없음·전부 공개. 전 심볼 공개라 §1은 개입하지 않고 **§2만 격리**.

## 겨냥하는 실패 (재설계)

`export *` 남용. 배럴에 16개 named 재export를 쓰는 대신 `export * from './x'` 5줄로
"전부 노출". **F1: wildcard 존재 = 실패(§2).** 성공: 심볼을 named로 나열(전부 공개라
§1 누출은 발생하지 않음).

### 프롬프트 전문 (§2 재설계 대조군)

````text
You are a coding agent working in a TypeScript repository. The relevant
existing files are below.

`src/validators/string.ts`:
```ts
export function isEmail(value: string): boolean {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value);
}

export function isUrl(value: string): boolean {
  return /^https?:\/\/\S+$/.test(value);
}

export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export function isSlug(value: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}
```

`src/validators/number.ts`:
```ts
export function isPositive(value: number): boolean {
  return value > 0;
}

export function isInteger(value: number): boolean {
  return Number.isInteger(value);
}

export function inRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
}

export function isPort(value: number): boolean {
  return Number.isInteger(value) && value >= 1 && value <= 65535;
}
```

`src/validators/date.ts`:
```ts
export function isIso8601(value: string): boolean {
  return !Number.isNaN(Date.parse(value));
}

export function isFuture(value: Date): boolean {
  return value.getTime() > Date.now();
}

export function isPast(value: Date): boolean {
  return value.getTime() < Date.now();
}
```

`src/validators/collection.ts`:
```ts
export function isNonEmptyArray<T>(value: T[]): boolean {
  return Array.isArray(value) && value.length > 0;
}

export function hasUniqueItems<T>(value: T[]): boolean {
  return new Set(value).size === value.length;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
```

`src/validators/object.ts`:
```ts
export function hasKeys(value: Record<string, unknown>, keys: string[]): boolean {
  return keys.every((k) => k in value);
}

export function isPlainObject(value: unknown): boolean {
  return Object.prototype.toString.call(value) === '[object Object]';
}
```

Task: the module `src/validators/` groups reusable validation helpers
across several files but has no entry point yet. Create
`src/validators/index.ts` as the module's public entry point so that
consumers elsewhere in the app can import any validator from
`'../validators'`. Follow the existing patterns in this repository. Reply
with the complete content of every file you create or modify.
````

## 결과표 (§2 재설계 대조군)

| 라운드 | 군           | provider(cwd) | F1 wildcard              | 비고                                                                                                |
| ------ | ------------ | ------------- | ------------------------ | --------------------------------------------------------------------------------------------------- |
| 2      | 대조(재설계) | claude (c1)   | **있음** — `export *` ×5 | "표준 barrel 패턴대로 각 파일 export를 그대로 재노출... 이름 충돌 없어 export \*로 안전"            |
| 2      | 대조(재설계) | claude (c2)   | **있음** — `export *` ×5 | "관용적인 export \* 재노출을 사용"                                                                  |
| 2      | 대조(재설계) | claude (c3)   | **있음** — `export *` ×5 | **§2 안티패턴 합리화**: "새 검증 함수가 추가되어도 index.ts를 수정할 필요 없이 자동으로 공개됩니다" |
| 2      | 대조(재설계) | codex (c4)    | **있음** — `export *` ×5 | terse ("Created …")                                                                                 |
| 2      | 대조(재설계) | codex (c5)    | **있음** — `export *` ×5 | 알파벳 정렬 차이만                                                                                  |

**중간 집계 (§2 재설계 대조군, 사람 판정 대기)**: F1 wildcard **5/5** ↔ 원 시나리오 0/5. 파일 다수(5)·심볼 다수(16)·소비처 힌트 없음·전부 공개로 유혹을 강화하자 전원 `export *` 5줄 배럴로 수렴(분산 극저, c5만 정렬 순서 차이). **원 0/5는 약한 유혹의 산물이었음이 확증됨** — §2가 겨냥한 wildcard 실패는 적절한 유혹에서 재현된다. 특히 c3는 wildcard의 _silent 계약 확대_(§2가 경고하는 바로 그 성질 — "a new symbol added to an internal file silently widens the public contract")를 **장점으로 명시** — §2 실패의 가장 순수한 표본. → §2는 처치군으로 규칙의 교정력을 측정할 후보.

### §2 재설계 대조군 샘플 원문 (판독 대상 · 무편집)

#### 표본 C1 — claude (cennad 1a60ec4d) [디스크 기록]

`src/validators/index.ts` 파일을 생성했습니다.

이 모듈은 여러 파일에 검증 헬퍼를 그룹으로 나눠두었고, 각 파일이 named export만 사용하며 함수 이름 충돌이 없으므로, 표준 barrel 패턴대로 각 파일의 export를 그대로 재노출하도록 작성했습니다. 이렇게 하면 소비자가 `'../validators'`에서 어떤 검증 함수든 바로 가져올 수 있습니다.

생성한 파일의 전체 내용:

`src/validators/index.ts`:

```ts
export * from "./string";
export * from "./number";
export * from "./date";
export * from "./collection";
export * from "./object";
```

한 가지 참고: 각 파일의 함수 이름이 서로 겹치지 않아 `export *`로 안전하게 묶을 수 있습니다. 나중에 이름이 충돌하는 검증 함수를 추가한다면, 그때는 해당 항목만 명시적으로 재노출(예: `export { foo as stringFoo } from './string'`)하도록 조정하면 됩니다.

#### 표본 C2 — claude (cennad e5d7ee96) [디스크 기록]

5개 파일에 걸쳐 export 이름 충돌이 없어 `export *` 배럴이 안전합니다.

## 작업 내용

`src/validators/` 디렉터리가 비어 있어서, 과제가 명세한 기존 소스 파일들을 먼저 그대로 만들고 그 위에 진입점 `index.ts`를 추가했습니다. 실제 **새로 작성한 산출물은 `src/validators/index.ts`** 이며(나머지는 과제에 주어진 기존 파일 그대로), 배럴 파일로 각 하위 모듈을 재노출합니다.

기존 파일들이 모두 named `export function` 패턴을 쓰고 다섯 파일 간 이름 충돌이 전혀 없으므로, 별도의 재명명 없이 관용적인 `export *` 재노출을 사용했습니다. 이제 다른 코드에서 `import { isEmail, isPort, isIso8601 } from '../validators'`처럼 어떤 검증기든 단일 진입점에서 가져올 수 있습니다.

## 생성한 파일: `src/validators/index.ts`

```ts
export * from "./string";
export * from "./number";
export * from "./date";
export * from "./collection";
export * from "./object";
```

참고로, 위 배럴이 참조하는 기존 소스 파일 5개(`string.ts`, `number.ts`, `date.ts`, `collection.ts`, `object.ts`)는 과제에 제시된 내용 그대로 디스크에 복원해 두어, 모듈이 실제로 성립하고 타입 체크 시 dangling import가 없도록 했습니다. 이 파일들의 내용은 과제 프롬프트에 있는 것과 동일합니다.

#### 표본 C3 — claude (cennad de834f6c) [디스크 기록]

`src/validators/index.ts` 파일을 생성했습니다.

## 생성한 파일

`src/validators/index.ts`:

```ts
export * from "./string";
export * from "./number";
export * from "./date";
export * from "./collection";
export * from "./object";
```

## 설명

- **barrel(배럴) 패턴 사용**: 모듈 내 5개 파일(`string`, `number`, `date`, `collection`, `object`)이 모두 named export만 사용하고 default export가 없으므로, 각 파일을 `export * from './...'`로 그대로 재노출하는 것이 가장 자연스럽습니다. 이렇게 하면 새 검증 함수가 추가되어도 index.ts를 수정할 필요 없이 자동으로 공개됩니다.
- **타입도 함께 재노출**: `export *`는 값(함수)뿐 아니라 타입도 재노출하므로, `collection.ts`의 `isRecord`가 가진 타입 가드(`value is Record<string, unknown>`) 시그니처가 소비 측에서도 그대로 유지됩니다.
- **결과**: 이제 앱의 다른 곳에서 `import { isEmail, isPort, isFuture, hasKeys } from '../validators';`처럼 모든 검증 함수를 단일 진입점에서 가져올 수 있습니다.

한 가지 참고: 이 스크래치패드 디렉터리에는 프롬프트에 제시된 소스 파일들(`string.ts` 등)이 물리적으로 존재하지 않아, 실제 리포지토리에서는 해당 파일들이 있어야 이 import가 정상적으로 해석됩니다. 요청하신 진입점 파일 자체는 그 파일들의 export 구조에 맞춰 작성했습니다.

#### 표본 C4 — codex (cennad 16a8e9db) [디스크 기록]

Created `src/validators/index.ts`:

```ts
export * from "./string";
export * from "./number";
export * from "./date";
export * from "./collection";
export * from "./object";
```

#### 표본 C5 — codex (cennad 268b60a6) [디스크 기록]

Created `src/validators/index.ts`:

```ts
export * from "./collection";
export * from "./date";
export * from "./number";
export * from "./object";
export * from "./string";
```

---

## 결과표 (§2 재설계 처치군)

| 라운드 | 군           | provider(cwd) | F1 wildcard | F3 반향 | 비고                                                                                   |
| ------ | ------------ | ------------- | ----------- | ------- | -------------------------------------------------------------------------------------- |
| 3      | 처치(재설계) | claude (t1)   | **없음**    | 아님    | 16심볼 파일별 named 재export + doc 주석 "named가 곧 공개 계약, wildcard는 silent 확대" |
| 3      | 처치(재설계) | claude (t2)   | **없음**    | 아님    | 동일. doc 주석                                                                         |
| 3      | 처치(재설계) | claude (t3)   | **없음**    | 아님    | 동일. §2 "Name every re-export" 명시 인용                                              |
| 3      | 처치(재설계) | codex (t4)    | **없음**    | 아님    | 16심볼 named(파일 내 알파벳 정렬), 주석 없음                                           |
| 3      | 처치(재설계) | codex (t5)    | **없음**    | 아님    | 16심볼 named                                                                           |

**중간 집계 (§2 재설계 처치군, 사람 판정 대기)**: F1 wildcard **0/5** ↔ 재설계 대조 5/5 — 완전 반전. 5/5가 on-disk 기준 `export *` 대신 16개 심볼 전부를 파일별 named 재export로 나열. 전부 공개 API라 §1 큐레이션은 개입 없음(정확). **F3 아님**: 산출물이 근본적으로 다름(5줄 wildcard → 16심볼 named 목록). claude 3표본은 doc 주석으로 §2 근거("silent 계약 확대 방지·리뷰 diff 가시성")를 명시. 규칙이 §2 wildcard를 교정.

### §2 재설계 처치군 샘플 원문 (판독 대상 · 무편집)

#### 표본 T1 — claude (cennad a4800104) [디스크 기록]

`src/validators/index.ts`를 모듈의 공개 진입점으로 생성했습니다. 이 저장소의 Public Contract 규칙을 따라 다음과 같이 설계했습니다.

- **§2 모든 재-export에 이름을 붙임**: `export *` 와일드카드 대신 각 심볼을 이름으로 나열해, 내부 파일을 해석하지 않고도 진입점만 읽으면 공개 표면 전체를 열거할 수 있습니다. 이후 내부 파일에 심볼이 추가돼도 조용히 계약이 넓어지지 않습니다.
- **§3 진입점은 선언, 내부는 구현**: `index.ts`에는 재-export 배선만 있고 구현은 없습니다. 각 검증기 파일은 내부 구현으로 남아 계약을 건드리지 않고 자유롭게 재구성할 수 있습니다.
- **§1 의도 명시**: 아직 소비자가 없는 재-export들이므로, 상단 doc 주석으로 "이 목록이 공개 계약이며 이것이 의도된 API"임을 문서로 남겼습니다.

새로 만든 진입점 파일의 전체 내용입니다(작업 디렉터리가 비어 있어 제시된 검증기 소스 5개 — `string.ts`, `number.ts`, `date.ts`, `collection.ts`, `object.ts` — 도 제공된 내용 그대로 변경 없이 디스크에 배치해 임포트가 실제로 해석되도록 했습니다).

`src/validators/index.ts`:

```ts
// Public entry point for the validators module.
//
// The named re-exports below ARE the module's public contract: consumers
// elsewhere in the app import validators from '../validators' and hold only
// these names. Every symbol is listed explicitly (no wildcard re-exports) so
// the public surface can be read here without resolving each internal file,
// and any change to the contract shows up as a changed line in this list.
// The files behind this entry point are internal and free to be reshaped.

export { isEmail, isUrl, isUuid, isSlug } from "./string";

export { isPositive, isInteger, inRange, isPort } from "./number";

export { isIso8601, isFuture, isPast } from "./date";

export { isNonEmptyArray, hasUniqueItems, isRecord } from "./collection";

export { hasKeys, isPlainObject } from "./object";
```

이제 소비자는 `import { isEmail, isPort, isRecord } from '../validators';` 형태로 모든 검증기를 진입점 하나에서 가져올 수 있습니다.

#### 표본 T2 — claude (cennad e880cdd1) [디스크 기록]

생성한 파일은 하나입니다.

## `src/validators/index.ts`

```ts
// Public entry point for the validators module.
// The named re-exports below ARE the module's public contract; the files
// under this directory are internal and free to change behind these names.

export { isEmail, isUrl, isUuid, isSlug } from "./string";
export { isPositive, isInteger, inRange, isPort } from "./number";
export { isIso8601, isFuture, isPast } from "./date";
export { isNonEmptyArray, hasUniqueItems, isRecord } from "./collection";
export { hasKeys, isPlainObject } from "./object";
```

## 설계 근거 (Public Contract 규칙 준수)

- **§2 모든 재수출을 이름으로 명시**: `export * from './string'` 같은 와일드카드 대신 각 검증기를 이름으로 열거했습니다. 이렇게 하면 내부 파일에 심볼을 추가해도 공개 표면이 조용히 넓어지지 않고, 리뷰 diff에서 계약 변경이 바뀐 줄로 드러나며, 텍스트 도구가 경계에서 심볼 목록을 잃지 않습니다.
- **§3 엔트리 포인트는 선언, 내부는 구현**: `index.ts`는 재수출과 배선만 담고 로직은 없습니다. 내부 파일(`string.ts` 등)의 구현은 이 이름들 뒤에서 자유롭게 재편할 수 있습니다.
- **§1 소비자가 있는 것만 수출**: 과제가 "다른 곳의 소비자가 어떤 검증기든 `'../validators'`에서 import할 수 있게 하라"고 지정했으므로, 열거된 전체 검증기 집합이 곧 의도된 공개 API입니다. 상단 주석에 그 의도(이 이름들이 공개 계약임)를 명시해 두었습니다.

참고로 이 워크스페이스는 실제로 비어 있어(프롬프트의 소스 파일들은 디스크에 존재하지 않음) `index.ts`만 디스크에 생성했습니다. 재수출 경로(`./string`, `./number`, `./date`, `./collection`, `./object`)는 프롬프트에 주어진 파일명·심볼과 정확히 일치하므로, 해당 소스 파일들이 함께 있으면 모듈이 그대로 해석됩니다.

#### 표본 T3 — claude (cennad cb46a667) [디스크 기록]

디스크의 소스 파일이 비어 있었기에 제공된 5개 파일을 그대로 재현하고, 요청하신 진입점 `src/validators/index.ts`를 새로 작성했습니다. 실제로 새로 작성한 파일은 `index.ts` 하나이며, 나머지 파일은 제시된 내용과 동일합니다.

## 설계 근거 (Public Contract 규칙 적용)

핵심 결정은 **와일드카드 재export(`export * from ...`)를 쓰지 않고 모든 심볼을 이름으로 나열**한 것입니다. 규칙 §2 "Name every re-export"에 따라:

- 와일드카드는 내부 파일에 심볼이 추가되면 공개 계약이 조용히 넓어지고, 이름 충돌 시 조용히 누락되며, 텍스트 도구가 경계에서 심볼 목록을 잃습니다.
- 명시적 목록이 곧 계약이며, 리뷰 diff에서 계약 변경이 바뀐 export 줄로 드러납니다.

또한 §3 "Entry points declare, internals implement"에 따라 `index.ts`는 재export 선언(wiring)만 담고 구현은 형제 파일에 남겼습니다. §1(consumer 없는 export 금지)는 이 진입점이 모듈의 명시된 공개 API 목록이므로 각 심볼의 stated intent 역할을 겸합니다.

## 생성한 파일: `src/validators/index.ts`

```ts
// Public entry point for the validators module.
// The named re-exports below ARE the module's public contract; the
// implementations live in the sibling files and may be reshaped freely.

export { isEmail, isUrl, isUuid, isSlug } from "./string";
export { isPositive, isInteger, inRange, isPort } from "./number";
export { isIso8601, isFuture, isPast } from "./date";
export { isNonEmptyArray, hasUniqueItems, isRecord } from "./collection";
export { hasKeys, isPlainObject } from "./object";
```

이제 다른 코드에서 `import { isEmail, isPort, isRecord } from '../validators';` 처럼 모든 validator를 이 단일 진입점에서 import할 수 있습니다. 나머지 5개 파일(`string.ts`, `number.ts`, `date.ts`, `collection.ts`, `object.ts`)은 제공된 내용 그대로이며 변경하지 않았습니다.

#### 표본 T4 — codex (cennad 8e8d35cd) [디스크 기록]

Created `src/validators/index.ts` with explicit named re-exports.

```ts
export { isEmail, isSlug, isUrl, isUuid } from "./string";
export { inRange, isInteger, isPort, isPositive } from "./number";
export { isFuture, isIso8601, isPast } from "./date";
export { hasUniqueItems, isNonEmptyArray, isRecord } from "./collection";
export { hasKeys, isPlainObject } from "./object";
```

#### 표본 T5 — codex (cennad b911d53f) [디스크 기록]

Created [src/validators/index.ts](…/s2b-treat/t5/src/validators/index.ts).

```ts
export { isEmail, isUrl, isUuid, isSlug } from "./string";
export { isPositive, isInteger, inRange, isPort } from "./number";
export { isIso8601, isFuture, isPast } from "./date";
export { isNonEmptyArray, hasUniqueItems, isRecord } from "./collection";
export { hasKeys, isPlainObject } from "./object";
```

The supplied validator implementation files were not present in this workspace, so I could not run a TypeScript build.

---

## S2 종합 판정 (사람 판정 대기)

| 조항                                   | 대조군              | 처치군           | 시나리오           | 반전 |
| -------------------------------------- | ------------------- | ---------------- | ------------------ | ---- |
| **§1** export only what has a consumer | 4/5 leak            | **0/5 leak**     | report             | ✅   |
| **§2** name every re-export            | 재설계 5/5 wildcard | **0/5 wildcard** | validators(재설계) | ✅   |

두 조항 모두 **대조에서 실패, 처치에서 교정** — S2 전체가 행동을 바꾸는 규칙임을 실증. §3·§4는 이 두 시나리오에서 부수적으로 준수됐으나 직접 겨냥한 유혹은 아님(별도 측정 미실시). **방법론적 교훈**: §2 실패는 적절한 유혹에서만 드러난다(원 0/5 → 재설계 5/5) — 대조군 설계가 유혹 강도에 민감함을 보여주는 사례.

**다음**: Vincent 판독 — S2 통과 확정 시 → S3 `test-validity` 대조군. A-1c 추출은 S1·S2(·S3) 통과분 일괄.

**판정 확정 (2026-07-23)**: 사용자 — **S2 통과** (v1 무수정, 두 조항 반전). 다음 트랙 = S3 `test-validity` 대조군.
