# Antigravity CLI(agy), Codex CLI 및 Claude CLI 최신 플래그(Flag) 및 사용법 가이드

본 문서는 최신 공식 문서, 릴리즈 노트, 그리고 GitHub 이슈 트래커의 실제 버그 리포트를 종합하여 교차 검증된 Antigravity CLI(`agy`), Codex CLI, Claude CLI의 정확한 플래그 사용법을 정리한 가이드입니다.

> **참고**: Gemini CLI 서비스는 **2026-06-18 종료**되었습니다. Google 라우팅은 `antigravity`(`agy`)로 통합되었습니다.

---

## 1. Antigravity CLI(`agy`) 주요 플래그 및 사용법

`agy`는 Google 엔진 슬롯을 담당하는 CLI 어댑터입니다. cennad는 `agy -p` 형태로 비대화형 호출하며(plain text 출력 — `--output-format` 플래그 없음), 세션 재개는 `--continue` 플래그로 수행합니다.

### 💡 주요 플래그 요약 표

| 플래그 (Flag)                    | 단축 (Alias) | 입력 값    | 설명 및 핵심 사용법                                                                                                                                |
| :------------------------------- | :----------- | :--------- | :------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--prompt`                       | `-p`         | `string`   | 프롬프트를 입력하고 결과 출력 후 종료하는 **비대화형 모드**를 실행합니다. cennad가 항상 사용하는 기본 진입점입니다.                                |
| `--sandbox`                      | -            | `boolean`  | cennad 는 부착하지 않습니다 — #76 종결까지 비활성([agy-upstream-watch.md](./agy-upstream-watch.md)). 별도의 샌드박스 백엔드(docker 등)는 없습니다. |
| `--dangerously-skip-permissions` | -            | `boolean`  | 모든 권한 확인을 생략하는 가장 위험한 모드입니다. cennad 설정의 `skip_permissions`에 대응합니다.                                                   |
| `--continue`                     | -            | `boolean`  | 현재 작업 디렉토리(cwd)의 가장 최근 대화를 이어서 실행합니다. cennad `continue_conversation`이 사용합니다.                                         |
| `--model`                        | -            | `string`   | `--model=<name>` 등호 형식(`-m` 별칭 없음). `model_map.antigravity`의 tier 해석 결과가 주입됩니다.                                                 |
| `models`                         | -            | 서브커맨드 | 사용 가능한 모델 목록을 반환합니다. `core/agyModels`가 1시간 TTL 캐시로 호출합니다.                                                                |

### ⚙️ cennad 내부 호출 패턴

**새 대화 시작 (`start`):**

```
agy -p <prompt> [--dangerously-skip-permissions] [--model=<name>]
```

**대화 재개 (`resume`):**

```
agy --continue -p <prompt> [--dangerously-skip-permissions] [--model=<name>]
```

### 🔑 세션 격리 방식 (`externalSessionRef`)

`agy`는 headless conversation ID를 발급하지 않습니다(Issue #7). cennad는 세션별 독립 cwd(`<CENNAD_HOME>/runtime/antigravity-cwd/<sessionId>/`)를 생성하여 이를 세션 핸들로 사용합니다. `<CENNAD_HOME>` 은 기본 `~/.claude/plugins/cennad` 이며 `CENNAD_CONFIG_PATH` 로 override 가능합니다. `externalSessionRef = cwd` 이며, `resume` 시 동일한 cwd를 재사용하면 `--continue`가 해당 디렉토리의 최근 대화를 재개합니다.

- **start 타임아웃**: cwd를 삭제하여 정리합니다.
- **resume 타임아웃**: cwd를 보존합니다(대화 이력 손실 방지).

### 🚨 알려진 버그 — 빈 stdout (Antigravity Issue #76)

비TTY(파이프/subprocess) 환경에서 `agy -p`가 stdout을 무음으로 누락하거나 행에 걸릴 수 있습니다 (1.0.7 에서도 미해결 — 추적: [agy-upstream-watch.md](./agy-upstream-watch.md)). cennad의 3단계 복구 흐름:

1. **JSON 파싱**: stdout 이 JSON 이면 `response` / `output` / `text` / `message` / `result` 키를 순서대로 탐색하고, plain text 면 그대로 반환합니다.
2. **트랜스크립트 폴백**: `resolveTranscript(cwd, since)` → `agyTranscriptStore` 가 agy brain transcript(JSONL)에서 읽기 전용으로 복구합니다.
3. **`cli_error` 반환**: 위 두 방법이 모두 실패하면 명시적 오류를 반환합니다.

### 📦 모델 목록 (`core/agyModels` 내부 캐시)

`core/agyModels`는 `agy models` 서브커맨드를 실행하여 모델 목록을 가져오고, 결과를 1시간 TTL로 캐시합니다(`<CENNAD_HOME>/runtime/agy-models.json`). `getAvailableModels` 가 이 캐시를 반환하며, settings UI 의 `/provider-status` 웹 라우트가 이를 직접 호출합니다. `agy`가 없거나 미인증 상태이면 빈 배열을 반환하며 절대 throw하지 않습니다.

---

## 2. Codex CLI 주요 플래그 및 사용법

Codex CLI는 터미널 내에서 직접 코드를 수정하는 경량 에이전트입니다. 문서상 존재하는 일부 플래그가 실제 런타임(`exec`) 및 특정 OS(Windows) 환경에서 오작동하는 이슈가 있으므로 주의가 필요합니다.

### 💡 주요 플래그 요약 표

| 플래그 (Flag)                                           | 단축 (Alias) | 입력 값            | 설명 및 핵심 사용법                                                                                                       |
| :------------------------------------------------------ | :----------- | :----------------- | :------------------------------------------------------------------------------------------------------------------------ |
| `--dangerously-bypass-approvals-and-sandbox` / `--yolo` | -            | `boolean`          | **승인(Approval)과 샌드박스(Sandbox)를 동시에 우회**합니다. 시스템 직접 제어 권한을 즉시 부여하는 가장 위험한 모드입니다. |
| `--full-auto`                                           | -            | `boolean`          | 레거시 버전의 자동 실행 동작을 강제하는 대안 플래그입니다.                                                                |
| `--add-dir`                                             | -            | `path`             | 기본 작업 공간 외에 에이전트가 접근 및 수정해야 하는 추가 디렉토리 경로를 명시합니다.                                     |
| `--cd`                                                  | `-C`         | `path`             | 에이전트가 작업을 시작하기 전 기준점으로 삼을 메인 작업 디렉토리(Working Directory)를 명시적으로 변경합니다.              |
| `--config`                                              | `-c`         | `key=value`        | 로컬 설정 파일의 특정 설정을 런타임에서 임시로 오버라이드합니다.                                                          |
| `--image`                                               | `-i`         | `path` (콤마 구분) | 초기 프롬프트와 함께 목업 이미지나 UI 스크린샷 파일을 첨부합니다.                                                         |
| `--model`                                               | `-m`         | `string`           | 기본 설정 파일(`.toml`)에 지정된 모델 대신 임시로 다른 모델을 사용합니다.                                                 |
| `--oss`                                                 | -            | `boolean`          | OpenAI 원격 API 대신 로컬 오픈소스 LLM 프로바이더 인프라(Ollama 등)를 활용하여 실행합니다.                                |
| `--profile`                                             | `-p`         | `string`           | 로컬 설정 파일(`~/.codex/config.toml`) 내에 정의된 특정 환경 프로필 세팅을 불러옵니다.                                    |

### 🚨 알려진 버그 및 미지원 기능 (`--ask-for-approval`)

공식 문서에는 `--ask-for-approval` 플래그(`untrusted`, `on-request`, `never` 값 지원)가 명시되어 있으나, 현재 다음과 같은 치명적인 이슈가 있습니다.

1. **`codex exec` 서브커맨드 에러:** 단발성 비대화형 명령어인 `exec`에서 해당 플래그 사용 시 파싱 에러(`unexpected argument`)가 발생하여 실행이 중단됩니다.
2. **Windows 환경 무한 승인 루프:** 대화형 세션에서 권한을 우회하려 해도 디렉토리 신뢰도 및 승인을 반복적으로 묻는 버그가 존재합니다.

- **대안:** 완전한 무인 자동화가 필요하다면 격리된 컨테이너 환경을 구축한 뒤 `--yolo` 또는 `--full-auto` 플래그를 사용하는 것이 현재로서는 유일한 우회책입니다.

---

## 3. Claude CLI(`claude`) 주요 플래그 및 사용법

Claude CLI는 Anthropic의 Claude Code CLI입니다. cennad는 `claude -p` 형태로 비대화형 호출하며 출력 포맷은 항상 `--output-format json`으로 고정합니다.

### 💡 주요 플래그 요약 표

| 플래그 (Flag)         | 단축 (Alias) | 입력 값                                                                            | 설명 및 핵심 사용법                                                                                                       |
| :-------------------- | :----------- | :--------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------ |
| `--prompt`            | `-p`         | `string`                                                                           | 프롬프트를 입력하고 결과 출력 후 종료하는 **비대화형 모드**를 실행합니다. cennad가 항상 사용하는 기본 진입점입니다.       |
| `--output-format`     | -            | `json`                                                                             | cennad는 항상 `json`으로 호출합니다. 응답은 단일 JSON 객체이며 `result` 필드에 응답 내용이 담깁니다.                      |
| `--session-id`        | -            | `string`                                                                           | 새 대화 시작 시 세션 ID를 주입합니다. cennad의 `externalSessionRef`로 저장됩니다.                                         |
| `--resume`            | -            | `string`                                                                           | 세션 재개 시 `--session-id` 대신 사용합니다. `externalSessionRef`(세션 ID)를 값으로 전달합니다.                           |
| `--permission-mode`   | -            | `default` \| `acceptEdits` \| `auto` \| `dontAsk` \| `plan` \| `bypassPermissions` | 에이전트가 도구(파일 수정, 명령어 등)를 실행할 때의 승인 방식을 제어합니다. cennad 설정의 `permission_mode`에 대응합니다. |
| `--model`             | -            | `string`                                                                           | `model_map.claude`의 tier 해석 결과가 주입됩니다.                                                                         |
| `--effort`            | -            | `low` \| `medium` \| `high` \| `xhigh` \| `max`                                    | 추론 노력 수준을 지정합니다. 모델별 지원 범위가 상이합니다.                                                               |
| `--fallback-model`    | -            | `string`                                                                           | 폴백 모델 체인을 지정합니다. 새 대화 시작(`start`) 시에만 사용합니다.                                                     |
| `--strict-mcp-config` | -            | `boolean`                                                                          | 자식 프로세스가 부모 세션의 MCP 서버를 상속하지 않도록 격리합니다. 항상 부착합니다.                                       |
| `--safe-mode`         | -            | `boolean`                                                                          | 부모 세션의 hooks, CLAUDE.md, skills를 상속하지 않도록 격리합니다. 항상 부착합니다.                                       |

### ⚙️ cennad 내부 호출 패턴

**새 대화 시작 (`start`):**

```
claude -p <prompt> --output-format json --session-id <sessionId> --permission-mode <mode> --model <model> [--effort <effort>] [--fallback-model <chain>] --strict-mcp-config --safe-mode
```

**대화 재개 (`resume`):**

```
claude -p <prompt> --output-format json --resume <sessionId> --permission-mode <mode> --model <model> [--effort <effort>] --strict-mcp-config --safe-mode
```

### 🔑 세션 격리 방식 (`externalSessionRef`)

cennad가 `start` 시 주입한 `--session-id` 값이 `externalSessionRef`로 저장됩니다. `resume` 시 `--resume <externalSessionRef>`로 동일 세션을 재개합니다. `--strict-mcp-config`와 `--safe-mode`는 자식 claude 프로세스가 부모 세션의 MCP 서버, hooks, CLAUDE.md, skills를 상속하지 않도록 항상 부착합니다.

### 📊 모델 및 Effort 매핑

`model_map.claude`는 tier(`high` / `mid` / `low`)별 `{model, effort}` 쌍을 정의합니다. 환경 변수 `CENNAD_CLAUDE_<TIER>_MODEL` / `CENNAD_CLAUDE_<TIER>_EFFORT`로 오버라이드할 수 있습니다.

**모델별 effort 지원 범위:**

| 모델 별칭                           | 지원 effort                                    |
| :---------------------------------- | :--------------------------------------------- |
| `opus`, `fable`, `best`, `opus[1m]` | `low` / `medium` / `high` / `xhigh` / `max`    |
| `sonnet`, `sonnet[1m]`              | `low` / `medium` / `high` / `max` (xhigh 없음) |
| `haiku`                             | effort 미지원                                  |

---

## 4. cennad 프로바이더 플래그 대조표

cennad 설정(`option_flags`)과 각 CLI 플래그의 대응 관계입니다.

| cennad `option_flags` 키       | Antigravity CLI (`agy`)          | Codex CLI                             | Claude CLI          |
| :----------------------------- | :------------------------------- | :------------------------------------ | :------------------ |
| `antigravity.sandbox`          | `--sandbox` — 미부착(#76 게이트) | —                                     | —                   |
| `antigravity.skip_permissions` | `--dangerously-skip-permissions` | —                                     | —                   |
| `codex.yolo`                   | —                                | `--yolo`                              | —                   |
| `codex.sandbox`                | —                                | `--ask-for-approval` 계열 (버그 주의) | —                   |
| `claude.permission_mode`       | —                                | —                                     | `--permission-mode` |
