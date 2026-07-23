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

**다음**: Vincent 판독·판정 → 통과 시 처치군(동일 프롬프트 + S1 전문 전치, 격리 cwd, 5회).
