# Phase 0 — S1 `agent-legible` micro-test

> 방법론: 무지침 대조군 필수 · 변형당 5회 이상 · 신선한 컨텍스트 1회 1샘플 ·
> 매칭 전부 사람이 읽기 · 분산이 지표. (TODO.md "micro-test 5단계")
> **대조군이 실패를 보이지 않으면 여기서 멈추고 S1은 만들지 않는다.**

## 겨냥하는 실패

S1 §1 "State the invisible wiring" — 프레임워크가 경로·이름 규약으로 호출하는
파일을 추가할 때, **보이지 않는 배선의 표지판을 빠뜨리는** 실패. 오독 6메커니즘 중
②암묵 관례가 표적. 함정 구조: 형제 파일을 미러링하면(S5의 옳은 행동) 형제의
침묵까지 복제되므로, 표지판을 빠뜨리는 것이 가장 자연스러운 경로가 된다.

## 유혹 과제 (대조군·처치군 공통)

파일 스캔 + 파일명 유래 키로 자동 등록되는 잡 시스템에 새 잡을 추가하는 과제.
새 파일에는 보이는 호출 지점이 없고, 파일명이 잡 키를 결정한다(이중 암묵 배선).

### 프롬프트 전문 (대조군)

````text
You are a coding agent working in a TypeScript repository. The relevant
existing files are below.

`src/jobs/registry.ts`:
```ts
import { readdirSync } from 'node:fs';
import { join, basename } from 'node:path';

const TASK_DIR = join(__dirname, 'tasks');

export interface JobTask {
  schedule: string;
  run(): Promise<void>;
}

export function loadTasks(): Map<string, JobTask> {
  const tasks = new Map<string, JobTask>();
  for (const file of readdirSync(TASK_DIR)) {
    if (!file.endsWith('.task.js')) continue;
    const key = basename(file, '.task.js');
    const mod = require(join(TASK_DIR, file));
    tasks.set(key, mod.default);
  }
  return tasks;
}
```

`src/jobs/tasks/send-welcome-email.task.ts`:
```ts
import type { JobTask } from '../registry';
import { mailer } from '../../services/mailer';
import { usersCreatedSince } from '../../services/users';

const task: JobTask = {
  schedule: '*/10 * * * *',
  async run() {
    const users = await usersCreatedSince(Date.now() - 10 * 60 * 1000);
    for (const user of users) {
      await mailer.sendWelcome(user.email);
    }
  },
};

export default task;
```

`src/services/webhooks.ts` exposes:
```ts
export function failedDeliveries(olderThanMs: number): Promise<WebhookDelivery[]>;
export function redeliver(d: WebhookDelivery): Promise<void>;
```

Task: add a job that retries failed webhook deliveries once every hour.
Follow the existing patterns in this repository. Reply with the complete
content of every file you create or modify.
````

### 처치군

동일 프롬프트 앞에 다음을 붙인다:

```text
This repository deploys the following standing rule file at
`.claude/rules/seiri_agent-legible.md`. It applies to your work:

<03-RULES.md S1 코드펜스 전문을 여기 삽입>
```

## 판독 기준 (사람이 읽는다)

| 축                  | 질문                                                                                                       | 판정                                                                   |
| ------------------- | ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| **F1 파일 내 표지** | 새 `.task.ts` 파일 안에 "registry가 glob으로 자동 발견하며 파일명이 잡 키를 결정한다"는 취지의 줄이 있는가 | 있으면 성공, 없으면 실패                                               |
| F2 산문만 언급      | 배선 설명이 답변 산문에는 있으나 파일에는 없음                                                             | **실패로 집계** (산문은 저장소에 남지 않음) — 단 F1 실패와 구분해 기록 |
| F3 템플릿 반향      | 규칙 문구를 그대로 복창만 하고 행동(파일 내용)은 불변                                                      | 히트로 위장한 실패 — 처치군에서 특히 주의                              |
| 분산                | 5회 산출물의 형태가 수렴하는가                                                                             | 제각각이면 문구 무구속 — 형태를 조인다                                 |

## 실행 노트 (2026-07-23)

- **라운드 1은 전령(cennad courier 서브에이전트) 릴레이로 실행했다가 폐기 수순** — claude에 과제가 3회 미전달, antigravity 산출물 없음. 원인 규명 전에 같은 방식을 반복하지 않는다.
- **cwd 오염 사고**: provider CLI가 워크스페이스 쓰기 권한으로 tirnanog(vault 레포)에 실제 파일을 생성했고, 후속 claude 세션이 그 파일을 읽어 샘플이 오염됐다. 부산물은 확인 후 제거 완료(`src/` 원상복구).
- **교정**: 이후 라운드는 (a) cennad 도구 **직접 호출**(릴레이 없음 — 응답이 도구 결과로 회수됨), (b) `project_root`를 **빈 스크래치 디렉터리**로 격리(샘플 간 교차 오염 차단). **프롬프트는 라운드 1과 자구 동일** — 환경만 격리.

## 결과표

| 라운드 | 군   | provider(모델)            | F1                                 | F2                                                            | 비고                                                                                                                                                                                            |
| ------ | ---- | ------------------------- | ---------------------------------- | ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1      | 대조 | codex (mid)               | **실패 후보** — 새 파일에 표지 0줄 | —                                                             | **유효 샘플** (첫 기록자라 디스크 오염 없음). 형제 미러링이 timestamp/duration 시그니처 불일치 호출(`failedDeliveries(Date.now() - 3600000)`)까지 복제 — S1 축은 아니나 미러링 위험의 부수 관측 |
| 1      | 대조 | antigravity               | 무효                               | 무효                                                          | 호출 실패 — 산출물 없음                                                                                                                                                                         |
| 1      | 대조 | claude (opus)             | 무효                               | 무효                                                          | 과제 미전달 3회, 4번째는 디스크의 선행 시도를 읽음(신선 컨텍스트 위반). 참고 관측만: 파일 무표지 + 산문에서 자동 등록을 상세 설명(F2 패턴) + 시그니처 버그 자발 교정 + 확인 질문으로 종결       |
| 2      | 대조 | antigravity               | 무효                               | 무효                                                          | `cli_error` 2연속("agy returned no output… update the agy CLI") — **CLI 자체 결함으로 이번 실험에서 제외.** 동일 접근 3회 반복 안 함                                                            |
| 2      | 대조 | claude ① (opus, 격리 cwd) | **실패 후보** — 표지 0줄           | **있음** — 산문 "설계 근거"가 파일명-키 자동 등록을 상세 설명 | 유효. `olderThanMs` 의미는 자발적으로 올바르게 처리                                                                                                                                             |
| 2      | 대조 | claude ② (opus, 격리 cwd) | **실패 후보** — 표지 0줄           | **있음** — 산문이 timestamp 함정("5만 년 전")까지 명시 경고   | 유효. **앎이 산문에 있고 산출물에 없음** — S1 전제의 가장 강한 증거                                                                                                                             |
| 2      | 대조 | codex (mid, 격리 cwd)     | **실패 후보** — 표지 0줄           | — (산문 최소)                                                 | 유효                                                                                                                                                                                            |
| 2      | 대조 | claude ③ (opus, 격리 cwd) | **실패 후보** — 표지 0줄           | **있음**                                                      | 유효                                                                                                                                                                                            |

**중간 집계 (사람 판정 대기)**: 유효 대조군 **5/5 전원 F1 실패 후보**, 분산 극저 — 5개 산출물이 사실상 동일(스케줄 `0 * * * *`·직접 duration 인자·주석 0줄). 대조군이 실패를 보였으므로 **방법론상 처치군 진행 가능** — 단 아래 원문의 사람 판독 후.

**질적 관측**: claude 3표본 모두 산문에서는 자동 등록 메커니즘(때로 timestamp 함정까지)을 정확히 설명하면서 파일에는 0줄 — **write-time에 존재하는 앎이 산출물에 기록되지 않고 증발**한다. 다음 독자는 산문을 받지 못한다. S1이 겨냥한 바로 그 간극.

---

## 샘플 원문 (판독 대상 — 전부 사람이 읽을 것)

### 표본 V1 — codex, 라운드 1 (cennad d3a6face)

```ts
// src/jobs/tasks/retry-failed-webhook-deliveries.task.ts
import type { JobTask } from "../registry";
import { failedDeliveries, redeliver } from "../../services/webhooks";

const task: JobTask = {
  schedule: "0 * * * *",
  async run() {
    const deliveries = await failedDeliveries(Date.now() - 60 * 60 * 1000);
    for (const delivery of deliveries) {
      await redeliver(delivery);
    }
  },
};

export default task;
```

산문: "Created `src/jobs/tasks/retry-failed-webhook-deliveries.task.ts`" 한 줄뿐. 배선 설명 없음. **부수 관측**: 형제 미러링이 `Date.now() - …` 타임스탬프 호출 형태까지 복제 — `olderThanMs`(duration) 시그니처와 불일치.

### 표본 V2 — claude ①, 격리 cwd (cennad fc47c702)

```ts
// src/jobs/tasks/retry-failed-webhooks.task.ts
import type { JobTask } from "../registry";
import { failedDeliveries, redeliver } from "../../services/webhooks";

const task: JobTask = {
  schedule: "0 * * * *",
  async run() {
    const deliveries = await failedDeliveries(60 * 60 * 1000);
    for (const delivery of deliveries) {
      await redeliver(delivery);
    }
  },
};

export default task;
```

산문(발췌): _"`registry.loadTasks()`가 파일명(`retry-failed-webhooks`)을 키로 자동 등록하므로 별도 등록 코드가 필요 없습니다."_ — 파일에는 이 사실이 0줄.

### 표본 V3 — claude ②, 격리 cwd (cennad f690622a)

파일: V2와 동일 구조(표지 0줄). 산문(발췌): _"만약 welcome-email 패턴을 그대로 복사해 `Date.now() - ...`를 넘겼다면 약 1.7조라는 값이 들어가 '5만 년 전보다 오래된 항목'을 찾게 되어 항상 빈 결과가 나옵니다."_ — **함정의 존재를 정확히 알면서 파일에 경고를 남기지 않음.**

### 표본 V4 — codex, 격리 cwd (cennad cc607e15)

파일: V2와 동일(파일명·본문·표지 0줄). 산문: "Created …" 한 줄.

### 표본 V5 — claude ③, 격리 cwd (cennad 5504e737)

파일: V2와 동일(표지 0줄). 산문(발췌): _"레지스트리가 파일명(`retry-failed-webhooks`)을 키로 자동 등록합니다."_ + duration 의미 설명.

---

**대조군 판독 요청에 대한 사용자 응답 (2026-07-23)**: _"알 수 없다. 실증을 통해 판단하라."_ — 대조군 단독 판독(안락의자) 대신 **처치군을 실행해 A/B 대비로 판단 근거를 세운다**는 지시로 해석. 처치군 5회를 아래에 기록한다.

---

# 처치군 (라운드 3 — 2026-07-23)

> 처치군 프롬프트 = 03-RULES.md S1 코드펜스 전문(라인 157–254, `# Agent-Legible Code` … `leave them standing.`)을 `.claude/rules/seiri_agent-legible.md` 배포 wrapper와 함께 대조군 프롬프트 **앞에 전치**. 나머지 자구 동일(조립 총 5,784 B). 조립은 두 원본 문서(03-RULES.md·본 파일)에서 **결정적 추출 스크립트**로 수행 — 손 전사 없음.

## 실행 노트 (처치군)

- cennad `start_conversation` **직접 호출** 5회(릴레이 없음 — 응답이 도구 결과로 회수됨). 표본마다 격리된 빈 스크래치 cwd(`s1-treatment/t1…t5`).
- 대조군 구성(3 claude + 2 codex) 미러링. **antigravity 제외**(CLI 결함).
- 4/5(t1·t3·t4·t5)가 cwd에 실제 파일을 씀 — **on-disk 파일이 응답 원문과 일치 확인**. t2는 디스크 미기록(빈 작업 디렉터리라 "가짜 저장소를 만들지 않는다"며 응답에 파일 내용 제공).

## 결과표 (처치군)

| 라운드 | 군   | provider(cwd) | F1                                          | F2  | 비고                                                                                                           |
| ------ | ---- | ------------- | ------------------------------------------- | --- | -------------------------------------------------------------------------------------------------------------- |
| 3      | 처치 | claude (t1)   | **표지 있음** — 파일 헤더 4줄               | —   | `RETRY_AFTER_MS` 명명·duration 인자 정확. 표지: registry 자동스캔·파일명→키·"`.ts` 수정(컴파일 `.js` 아님)"    |
| 3      | 처치 | claude (t2)   | **표지 있음** — 헤더 5줄(응답 내, 디스크 X) | —   | duration 인자 정확. 산문서 name trap(`olderThanMs` vs `Date.now()`) 명시 + rule 2 키 유일성 언급               |
| 3      | 처치 | claude (t3)   | **표지 있음** — 파일 헤더 4줄               | —   | `RETRY_AFTER_MS` 명명·duration 인자 정확. 에러 처리 판단지점을 사용자에게 질문으로 남김                        |
| 3      | 처치 | codex (t4)    | **표지 있음** — 파일 헤더 2줄               | —   | `ONE_HOUR_MS` 명명·duration 인자 정확. export 이름 서술적(`retryFailedWebhookDeliveriesTask`)                  |
| 3      | 처치 | codex (t5)    | **표지 있음** — 파일 헤더 1줄               | —   | **duration 함정 재발**: `failedDeliveries(Date.now() - …)` (대조군 V1과 동일 시그니처 버그). F1 축은 표지 있음 |

**중간 집계 (사람 판정 대기)**: 처치군 F1 **5/5 표지 있음** ↔ 대조군 F1 5/5 표지 없음 — **F1 축 완전 반전**. 분산 낮음 — 5개 모두 파일 진입부 헤더 주석으로 "레지스트리 자동 로드 + 파일명→키" 배선을 명시(길이 1–5줄, 형태 수렴). **F3(템플릿 반향) 아님**: 표지가 규칙의 템플릿 `loaded by <mechanism>; <path/name/annotation> determines <what>` 를 **구체값으로 채움**(`registry.ts`·`loadTasks`·glob·실제 키 문자열) — 산출물(파일) 자체가 바뀜.

**부수 관측(2차 축)**: rule 3(name trap)/시그니처 의미 — 4/5가 `olderThanMs`를 duration으로 올바르게 처리(명명 상수화). t5(codex)만 대조군 V1처럼 timestamp 관용구를 복제. **규칙 1(불가시 배선)은 5/5 착지, 규칙 3(이름 함정)은 4/5.**

---

## 처치군 샘플 원문 (판독 대상 — 전부 사람이 읽을 것 · 무편집)

### 표본 T1 — claude, 격리 cwd (cennad 691039f9) [디스크 기록]

생성한 파일은 하나입니다. 레지스트리(`src/jobs/registry.ts`)는 `src/jobs/tasks/*.task.js`를 자동으로 스캔·등록하므로, 파일명 규칙만 지키면 별도 수정 없이 이 잡이 등록됩니다.

**`src/jobs/tasks/retry-webhook-deliveries.task.ts`** (신규)

```ts
// Loaded by ../registry.ts (loadTasks), which scans src/jobs/tasks/*.task.js
// at startup and registers each default export. There is no direct call site:
// the filename minus `.task.js` — here `retry-webhook-deliveries` — becomes
// this job's registry key. Edit the `.task.ts` source, not the compiled `.js`.
import type { JobTask } from "../registry";
import { failedDeliveries, redeliver } from "../../services/webhooks";

// Retry deliveries that have been in a failed state for at least this long.
// One hour matches the schedule below, so each failure gets one retry per run.
const RETRY_AFTER_MS = 60 * 60 * 1000;

const task: JobTask = {
  schedule: "0 * * * *",
  async run() {
    const deliveries = await failedDeliveries(RETRY_AFTER_MS);
    for (const delivery of deliveries) {
      await redeliver(delivery);
    }
  },
};

export default task;
```

주요 결정 사항:

- **패턴 준수**: `send-welcome-email.task.ts`와 동일하게 `JobTask`를 구현하고 `default`로 내보냅니다. 파일명은 kebab-case + `.task.ts` 규칙을 따랐고, 레지스트리 키는 `retry-webhook-deliveries`가 됩니다.
- **스케줄**: "매시간 1회" → cron `0 * * * *`(매시 0분).
- **인자**: `failedDeliveries`의 파라미터는 타임스탬프가 아니라 상대 경과 시간(`olderThanMs`)이므로, 방금 실패한 건을 성급히 재시도하지 않도록 `RETRY_AFTER_MS`(1시간) 임계값을 상수로 명명해 전달했습니다.
- **가시성 없는 배선 명시**(적용된 규칙 1·3): 이 파일은 직접 호출부가 없고 레지스트리가 파일명 규칙으로 로드합니다. 그 메커니즘과, 컴파일된 `.js`가 아닌 `.task.ts` 소스를 수정해야 한다는 점을 헤더 주석에 한 줄로 기록했습니다. 기존 태스크 파일과 레지스트리는 수정하지 않았습니다.

### 표본 T2 — claude, 격리 cwd (cennad c73b1763) [디스크 미기록]

작업 디렉터리는 비어 있고, 제시된 파일들은 인라인 컨텍스트입니다. 따라서 디스크에 가짜 저장소를 만들지 않고, 요청대로 생성/수정할 파일의 전체 내용을 답변으로 제공하겠습니다.

## 분석

`registry.ts`는 `src/jobs/tasks/` 안의 `*.task.js` 파일을 자동 로드합니다. 따라서 **새 task 파일 하나만 추가하면 되고, 레지스트리는 수정할 필요가 없습니다.** 기존 `send-welcome-email.task.ts` 패턴(`import type { JobTask }` → 서비스 named import → `const task: JobTask` → `for` 루프 → `export default task`)을 그대로 따릅니다.

주의한 두 가지 함정:

1. **파라미터 의미 차이 (name trap).** 기존 예제는 `usersCreatedSince(Date.now() - 10*60*1000)`처럼 **절대 타임스탬프**를 넘깁니다. 하지만 `failedDeliveries(olderThanMs)`는 이름 그대로 **경과 시간(duration)** 을 받으므로, `Date.now() - ...` 관용구를 그대로 흉내내면 틀립니다. 그래서 `60 * 60 * 1000`(1시간)을 직접 넘깁니다.
2. **보이지 않는 배선 (rule 1).** 이 파일에는 호출 지점이 없고 레지스트리의 파일명 규칙으로만 로드됩니다. 게다가 레지스트리는 컴파일된 `.task.js`를 글롭하고 파일명에서 키를 뽑습니다. 리더가 파일 하나만 보고도 실행 조건을 알 수 있도록 진입부에 한 줄 표지를 답니다.

## 생성할 파일

`src/jobs/tasks/retry-failed-webhooks.task.ts`:

```ts
// Loaded by src/jobs/registry.ts: it globs the compiled *.task.js files in
// this directory and registers each file's default export under a key
// derived from the filename (basename minus `.task.js` → "retry-failed-webhooks").
// There is no direct call site — this task runs when the registry's scheduler
// fires the cron `schedule` below. Edit this .ts source, not the compiled .js.
import type { JobTask } from "../registry";
import { failedDeliveries, redeliver } from "../../services/webhooks";

// `failedDeliveries` takes an age threshold (olderThanMs), NOT an absolute
// timestamp like `usersCreatedSince`. Retry only deliveries that have been
// failing for at least an hour, so we skip very recent failures that may
// still be in-flight.
const RETRY_AFTER_MS = 60 * 60 * 1000;

const task: JobTask = {
  schedule: "0 * * * *", // top of every hour
  async run() {
    const deliveries = await failedDeliveries(RETRY_AFTER_MS);
    for (const delivery of deliveries) {
      await redeliver(delivery);
    }
  },
};

export default task;
```

## 수정할 파일

없습니다. `registry.ts`가 `tasks/` 디렉터리를 자동 스캔하므로, 새 파일을 추가하면 다음 배포 시 키 `retry-failed-webhooks`로 자동 등록됩니다. 파일명이 유일하므로 레지스트리 키도 충돌하지 않습니다(rule 2).

### 표본 T3 — claude, 격리 cwd (cennad be9c47c2) [디스크 기록]

매 시간 실패한 웹훅 전송을 재시도하는 작업을 추가했습니다.

## 생성한 파일: `src/jobs/tasks/retry-failed-webhooks.task.ts`

```ts
// Loaded by src/jobs/registry.ts (loadTasks): every *.task.js file in
// src/jobs/tasks/ is registered automatically, and the filename minus
// ".task" becomes the task key ("retry-failed-webhooks"). There is no
// explicit call site — do not import this file directly.
import type { JobTask } from "../registry";
import { failedDeliveries, redeliver } from "../../services/webhooks";

// Only retry deliveries that have been failing for at least this long, so a
// transient outage has time to clear before we re-send.
const RETRY_AFTER_MS = 60 * 60 * 1000;

const task: JobTask = {
  schedule: "0 * * * *",
  async run() {
    const deliveries = await failedDeliveries(RETRY_AFTER_MS);
    for (const delivery of deliveries) {
      await redeliver(delivery);
    }
  },
};

export default task;
```

## 설계 노트

- **기존 패턴을 그대로 따름**: `send-welcome-email.task.ts`와 동일하게 `JobTask`를 `const task`로 정의하고 `default`로 export합니다. `registry.ts`가 `tasks/` 디렉터리를 스캔해 자동 등록하므로 **registry는 수정할 필요가 없습니다** (파일 하나만 생성).
- **스케줄 `0 * * * *`**: 매 시간 0분에 한 번 실행 → "매 시간 한 번".
- **불가시 배선을 명시 (agent-legible 규칙 1)**: 이 파일은 명시적 호출부가 없고 파일 경로/이름 규칙(`*.task.js`)으로만 로드됩니다. 이 저장소의 새 규칙(`.claude/rules/seiri_agent-legible.md`)에 따라, 파일만 봐도 실행 조건을 알 수 있도록 파일 상단에 로딩 메커니즘·키 유도 규칙을 한 줄 주석으로 남겼습니다. 기존 파일의 스타일과 충돌하지 않으면서 배선만 라벨링한 것입니다.
- **`RETRY_AFTER_MS` 상수화**: `failedDeliveries`의 인자는 타임스탬프가 아니라 "경과 시간(age)"입니다 (`olderThanMs`). welcome-email 예시의 `usersCreatedSince(timestamp)`와는 의미가 다르므로, 방금 실패한 건까지 즉시 재시도하지 않고 일시적 장애가 해소될 시간을 주도록 1시간 임계값을 이름 있는 상수로 두고 의도를 주석으로 명시했습니다.

한 가지 판단이 필요한 지점: 현재는 `redeliver`가 예외를 던지면 루프가 중단되어 남은 건들이 재시도되지 않습니다. 이는 기존 `send-welcome-email` 작업(`sendWelcome` 미보호 루프)과 동일한 방식이라 패턴 일관성을 위해 그대로 두었습니다. 재시도 작업 특성상 개별 실패를 삼키고(try/catch) 계속 진행하는 편이 더 견고할 수 있는데, 그렇게 바꾸길 원하시면 반영하겠습니다.

### 표본 T4 — codex, 격리 cwd (cennad 38ecc619) [디스크 기록]

Created [retry-failed-webhook-deliveries.task.ts](/private/tmp/…/s1-treatment/t4/src/jobs/tasks/retry-failed-webhook-deliveries.task.ts:1).

```ts
// Loaded by `loadTasks()` in `src/jobs/registry.ts`; this filename compiles to
// a `.task.js` file, whose basename registers this task under its job key.
import type { JobTask } from "../registry";
import { failedDeliveries, redeliver } from "../../services/webhooks";

const ONE_HOUR_MS = 60 * 60 * 1000;

const retryFailedWebhookDeliveriesTask: JobTask = {
  schedule: "0 * * * *",
  async run() {
    const deliveries = await failedDeliveries(ONE_HOUR_MS);
    for (const delivery of deliveries) {
      await redeliver(delivery);
    }
  },
};

export default retryFailedWebhookDeliveriesTask;
```

### 표본 T5 — codex, 격리 cwd (cennad d7436dcc) [디스크 기록]

Created `src/jobs/tasks/retry-failed-webhook-deliveries.task.ts`:

```ts
import type { JobTask } from "../registry";
import { failedDeliveries, redeliver } from "../../services/webhooks";

// Loaded by jobs/registry.ts; this *.task.js filename determines discovery and its registry key.
const task: JobTask = {
  schedule: "0 * * * *",
  async run() {
    const deliveries = await failedDeliveries(Date.now() - 60 * 60 * 1000);
    for (const delivery of deliveries) {
      await redeliver(delivery);
    }
  },
};

export default task;
```

---

**다음**: Vincent 처치군 판독 → F1 5/5 반전(표지 있음)이 "규칙이 실제 행동을 바꿈"으로 확정되면 S1 통과 → A-1c(`templates/rules/seiri_agent-legible.md` 추출·manifest 등재·빌드). 재설계/추가 표본 지시 시 그에 따름.

**판정 확정 (2026-07-23)**: 사용자 판독 — **S1 통과** (v1 무수정). 다음 트랙 = S2 `public-contract` 대조군. A-1c 추출은 S2·S3 통과분과 일괄.
