# 05. 플러그인 운영 비용 & 성능 영향

> `@ogham/filid` 1.0 기준. 훅 오버헤드, MCP 서버 비용, 컨텍스트 비용, 번들 크기, 비용 절감 설계.
>
> **측정 기준**: 아래 번들 크기·바이트 캡·주입 문자 수는 1.0 빌드 산출물에서 직접 측정한 값이다. 지연 시간(ms) 수치는 이 개정에서 재측정하지 않았으므로 싣지 않는다. 필요하면 `yarn filid bench:run`으로 직접 측정한다.

---

## Hook 오버헤드

### 등록된 훅 3개

| 훅                       | 이벤트             | matcher             | timeout | 번들 크기 |
| ------------------------ | ------------------ | ------------------- | ------- | --------- |
| `setup.mjs`              | `SessionStart`     | `*`                 | 30초    | 9,492 B   |
| `user-prompt-submit.mjs` | `UserPromptSubmit` | `*`                 | 5초     | 11,666 B  |
| `pre-tool-use.mjs`       | `PreToolUse`       | `Read\|Write\|Edit` | 10초    | 25,278 B  |

`run-hook.cmd`(54 B, Windows shim)와 `run-agy.mjs`(3,351 B, agy host 러너)는 훅이 아니라 러너다. 실행 진입은 `libs/run.cjs`가 담당한다.

1.0에는 `SubagentStart` 역할 제한 훅과 `PostToolUse` change tracking이 없다. 훅 수가 6개에서 3개로 줄면서 이벤트당 프로세스 기동 횟수도 함께 줄었다.

### 빌드 시 강제되는 바이트 캡

`scripts/buildHooks.mjs`가 번들마다 상한과 금지 모듈 목록을 검사하고, 넘으면 빌드를 실패시킨다. 이것이 "훅은 가벼워야 한다"를 의견이 아니라 게이트로 만든다.

| 등급          | 캡       | 대상                     |
| ------------- | -------- | ------------------------ |
| session-start | 49,152 B | `setup.mjs`              |
| heavy         | 32,768 B | `pre-tool-use.mjs`       |
| light         | 16,384 B | `user-prompt-submit.mjs` |
| run-agy       | 12,288 B | `run-agy.mjs`            |

현재 사용률은 각각 약 19%, 77%, 71%, 27%다. 캡보다 더 강한 방어선은 금지 모듈 가드다 — 훅 도달 코드가 배럴(`index.js`)을 import하면 esbuild가 배럴이 재노출하는 모듈 전체를 훅 번들로 끌어오고, 이 가드가 그것을 잡는다.

### 호출 빈도

| 훅                   | 트리거             | 빈도                         |
| -------------------- | ------------------ | ---------------------------- |
| `user-prompt-submit` | 매 사용자 프롬프트 | **높음** — 모든 상호작용마다 |
| `pre-tool-use`       | Read/Write/Edit    | **중간** — 파일 접근 시      |
| `setup`              | 세션 시작          | **매우 낮음** — 세션 1회     |

### stdin/stdout 비용

- 입력이 가장 큰 경우는 `PreToolUseInput`이다. `content` 필드에 파일 전체 내용이 들어올 수 있다.
- 출력은 항상 작다. 통과 시 `{"continue":true}`, 차단 시 사유 문자열이 붙는다.
- 병목은 로직이 아니라 stdin 수집(`for await...of`)이다.

### 전달 캐시

`PreToolUse`는 모듈 규칙을 **매번 보내지 않는다.** `[filid:ctx]` 블록은 그 모듈에서 첫 read/write일 때, 그리고 캐시가 stale해졌을 때만 전달된다. `[filid:map]`은 방문 집합이 바뀔 때만 나온다. 같은 모듈을 연속으로 편집하는 동안 추가 컨텍스트 비용은 0이다.

---

## MCP 서버 비용

### 서버 기동

| 항목        | 값                                                |
| ----------- | ------------------------------------------------- |
| 번들 형식   | CJS, minified                                     |
| 번들 크기   | **399,800 B (≈390 KB)** (`bridge/mcp-server.cjs`) |
| 외부 의존성 | **없음** — external 처리 대상이 0개다             |
| 기동 방식   | `node bridge/mcp-server.cjs` → stdio transport    |

0.8.x 대비 번들이 크게 줄었다. `@ast-grep/napi`와 TypeScript Compiler API, `fast-glob`, AST/metrics/compress 모듈, legacy 도구 14종이 모두 사라졌기 때문이다. external 의존이 0이므로 `NODE_PATH` 전역 모듈 탐색 banner도 제거했다 — 기동 시 `npm root -g` 자식 프로세스를 띄우지 않는다.

MCP 서버는 세션당 1회 기동 후 상주한다. 기동 비용은 초기 1회만 발생한다.

### 도구 비용의 지배 요인

1.0의 도구는 AST 파싱을 하지 않는다. 비용은 두 가지가 지배한다.

1. **snapshot 생성** — 디렉터리 traversal과 구조 판정에 쓰인 파일 내용의 SHA-256. `fractal_scan`, `context_resolve`, `restructure_plan`, `structure_validate`, `verification_scan`이 모두 같은 snapshot을 소비하므로 한 번만 만든다. traversal은 git-ignored 경로를 걸러내기 위해 `git ls-files`를 **scan당 한 번** spawn한다 — 경로당이 아니라 스캔당이며, 결과 집합은 그 스캔 동안 재사용된다. 걸러낸 경로만큼 이후 단계의 입력이 줄어들지만, 순비용의 방향은 측정하지 않았다.
2. **lexical scan** — 어댑터가 의존성·진입점·case를 세는 단일 패스. 정규식 기반 전체 파싱이 아니라 문자열·주석·괄호 nesting만 구분한다.

`project_init`, `rule_docs_sync`, `open_settings`, `review_state`는 snapshot을 필요로 하지 않는다.

---

## 컨텍스트 비용

### PreToolUse 가이드 블록

| 항목      | 값                                      |
| --------- | --------------------------------------- |
| 문자 수   | **711자** (7줄, `HOOK_GUIDE_BLOCK`)     |
| 추정 토큰 | 약 170–190 토큰 (영문 기준 추정치)      |
| 주입 빈도 | 모듈별 첫 접근 시 1회 + stale 시 재전달 |

여기에 해당 모듈의 `INTENT.md` 인라인 내용과 부모 체인 경로가 붙는다. INTENT.md가 50줄 상한을 갖는 이유가 여기 있다 — 이 문서는 컨텍스트에 **실제로 실리는** 비용이다.

### MCP 반환 예산

| 항목                       | 값       |
| -------------------------- | -------- |
| `TOOL_INLINE_BUDGET_BYTES` | 16 KiB   |
| `SCAN_RESULT_MAX_CHARS`    | 30,000자 |

16 KiB를 넘는 payload는 `data`를 빼고 전체를 plugin cache의 `artifacts/<tool>/<sha256>.json`에 atomic write한 뒤, 경로·바이트 수·SHA-256만 반환한다. `data` 제거 후 실제 envelope를 **다시 측정**하며, diagnostics가 여전히 예산을 넘으면 bounded diagnostic으로 바꾼다. summary와 artifact metadata만으로도 예산을 넘으면 안정적인 structured error를 반환하고 16 KiB 상한은 깨지 않는다.

도구가 우회할 수 있는 예산은 예산이 아니다. 반환이 길어질 가능성이 있는 모든 도구가 이 envelope를 통과한다.

### 차단·경고 메시지

정상 통과 시 추가 토큰은 0이다. 차단 시에만 사유 문자열이 붙으며, 차단은 `permissionDecision: 'deny'`로 해당 도구 호출 하나만 막고 턴을 중단하지 않는다.

---

## 번들 크기

| 파일                            | 크기                    | 형식 |
| ------------------------------- | ----------------------- | ---- |
| `bridge/mcp-server.cjs`         | 399,800 B               | CJS  |
| `bridge/pre-tool-use.mjs`       | 25,278 B                | ESM  |
| `bridge/user-prompt-submit.mjs` | 11,666 B                | ESM  |
| `bridge/setup.mjs`              | 9,492 B                 | ESM  |
| `bridge/run-agy.mjs`            | 3,351 B                 | ESM  |
| `bridge/run-hook.cmd`           | 54 B                    | cmd  |
| `public/settings.html`          | 26,157 B                | HTML |
| **합계**                        | **475,798 B (≈465 KB)** |      |

훅 3개 합계는 46,436 B다. `dist/` 라이브러리 산출물은 1.0에 존재하지 않는다.

---

## 비용 절감 설계

### 1. 하나의 snapshot을 모두가 공유한다

scan, validate, plan이 각자 트리를 만들지 않는다. 같은 실행 안에서 서로 다른 트리를 보는 도구들은 모순된 결과를 낼 뿐 아니라 traversal 비용도 곱한다.

snapshot hash는 정렬된 상대 경로와 구조 판정에 쓰인 파일 내용의 SHA-256을 결합하며 root 경로와 mtime에 독립이다. checkout이나 clone이 거짓 무효화를 일으키지 않는다.

### 2. 16 KiB를 넘으면 artifact로 내보낸다

컨텍스트는 에이전트 세션의 가장 희소한 자원이다. 큰 결과를 인라인으로 돌려주는 것은 그 자체로 비용이다. artifact는 content-addressed이므로 같은 결과를 두 번 저장하지 않는다.

### 3. 훅 컨텍스트는 캐시로 한 번만 전달한다

모듈 규칙은 그 모듈 첫 접근 시에만 전달되고, 방문 맵은 턴마다 리셋된다. 같은 파일을 반복 편집하는 동안 컨텍스트 비용이 누적되지 않는다.

### 4. 빌드가 훅 무게를 강제한다

바이트 캡과 금지 모듈 가드가 CI에서 실패로 나타난다. 훅이 무거워지는 회귀는 리뷰어의 주의력이 아니라 빌드가 잡는다.

### 5. 분석은 명시적 호출 시에만 실행한다

MCP 도구는 스킬이 호출할 때만 동작한다. 일반 개발 중에는 훅만 실행된다. 전체 FCA 감사는 `/filid:scan` 한 곳에만 있으며 자동 트리거되지 않는다.

### 6. 계획은 만들되 실행하지 않는다

`restructure_plan`은 프로젝트 트리를 건드리지 않는다. 계획 생성이 실패해도 저장소는 그대로이며, 재시도 비용은 계획 재생성뿐이다.

---

## 관련 문서

- [01-ARCHITECTURE.md](./01-ARCHITECTURE.md) — 번들링과 envelope ADR
- [06-HOW-IT-WORKS.md](./06-HOW-IT-WORKS.md) — 훅·MCP 내부 동작
- [04-USAGE.md](./04-USAGE.md) — 빌드 및 설치 방법
