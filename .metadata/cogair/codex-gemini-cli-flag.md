# Gemini CLI, Antigravity CLI(agy) 및 Codex CLI 최신 플래그(Flag) 및 사용법 가이드

본 문서는 **2026년 5월** 최신 공식 문서, 릴리즈 노트, 그리고 GitHub 이슈 트래커의 실제 버그 리포트를 종합하여 교차 검증된 Gemini CLI, Antigravity CLI(`agy`), Codex CLI의 정확한 플래그 사용법을 정리한 가이드입니다.

> **중요**: Gemini CLI 서비스는 **2026-06-18 종료** 예정입니다. cogair는 Google 엔진 슬롯을 `gemini`와 `antigravity` 중 하나로만 활성화할 수 있으며 두 값은 **상호 배타적**입니다. 신규 설치는 `antigravity`(`agy`)를 사용하는 것을 권장합니다.

---

## 1. Gemini CLI 주요 플래그 및 사용법

Gemini CLI는 보안 계층(승인 및 샌드박스)이 독립적으로 분리되어 있어, 개발자가 원하는 수준의 보안 환경을 조합하여 구성할 수 있습니다.

### 💡 주요 플래그 요약 표

| 플래그 (Flag)                | 단축 (Alias) | 입력 값                                      | 설명 및 핵심 사용법                                                                        |
| :--------------------------- | :----------- | :------------------------------------------- | :----------------------------------------------------------------------------------------- |
| `--model`                    | `-m`         | `string`                                     | 사용할 특정 모델을 지정합니다. (예: `gemini-2.5-pro`)                                      |
| `--prompt`                   | `-p`         | `string`                                     | 프롬프트를 입력하고 결과 출력 후 종료하는 **비대화형(Non-interactive) 모드**를 실행합니다. |
| `--prompt-interactive`       | `-i`         | `string`                                     | 첫 프롬프트를 실행한 후, 터미널 대화형 모드를 그대로 유지합니다.                           |
| `--approval-mode`            | -            | `default` \| `auto_edit` \| `yolo` \| `plan` | 에이전트가 도구(명령어, 파일 수정 등)를 실행할 때의 인간 승인 단계를 제어합니다.           |
| `--yolo`                     | `-y`         | `boolean`                                    | `--approval-mode=yolo`의 단축어. **인간의 승인 절차만 생략**합니다. (샌드박스 여부는 별도) |
| `--sandbox`                  | `-s`         | `boolean`                                    | 보다 안전한 명령어 실행을 위해 격리된 샌드박스 환경 내에서 CLI를 구동합니다.               |
| `--worktree`                 | `-w`         | `string`                                     | 현재 브랜치를 더럽히지 않고 새로운 Git Worktree를 자동으로 생성하여 작업을 시작합니다.     |
| `--resume`                   | `-r`         | `string`                                     | 이전 작업 세션을 재개합니다. (예: `--resume latest`)                                       |
| `--extensions`               | `-e`         | `string` (콤마 구분)                         | 특정 확장 도구(Extension)들만 선택적으로 활성화하여 CLI를 실행합니다.                      |
| `--allowed-mcp-server-names` | -            | `string` (콤마 구분)                         | 보안 관리를 위해 허용할 MCP 서버 목록을 명시적으로 제한합니다.                             |

### ⚠️ 보안 플래그 조합 주의사항 (`--yolo`)

Gemini CLI에서 `--yolo`는 **승인 우회**만을 의미합니다. 자동화 스크립트 작성 시 시스템 보호를 위해서는 반드시 샌드박스 플래그와 결합해야 합니다.

- **위험 (호스트 직접 제어):** `gemini --yolo`
- **권장 (안전한 자동화):** `gemini --yolo --sandbox`

---

## 2. Antigravity CLI(`agy`) 주요 플래그 및 사용법

`agy`는 Gemini CLI 서비스 종료 이후 Google 엔진 슬롯을 대체하는 CLI 어댑터입니다. cogair는 `agy -p --output-format json` 형태로 비대화형 호출하며, 세션 재개는 `--continue` 플래그로 수행합니다.

### 💡 주요 플래그 요약 표

| 플래그 (Flag)                    | 단축 (Alias) | 입력 값    | 설명 및 핵심 사용법                                                                                                 |
| :------------------------------- | :----------- | :--------- | :------------------------------------------------------------------------------------------------------------------ |
| `--prompt`                       | `-p`         | `string`   | 프롬프트를 입력하고 결과 출력 후 종료하는 **비대화형 모드**를 실행합니다. cogair가 항상 사용하는 기본 진입점입니다. |
| `--output-format`                | -            | `json`     | 응답을 JSON 객체로 출력합니다. cogair는 항상 이 플래그를 함께 전달합니다.                                           |
| `--sandbox`                      | -            | `boolean`  | terminal-only 제한 모드로 실행합니다. 별도의 샌드박스 백엔드(docker 등)는 없습니다.                                 |
| `--dangerously-skip-permissions` | -            | `boolean`  | 모든 권한 확인을 생략하는 가장 위험한 모드입니다. cogair 설정의 `skip_permissions`에 대응합니다.                    |
| `--continue`                     | -            | `boolean`  | 현재 작업 디렉토리(cwd)의 가장 최근 대화를 이어서 실행합니다. cogair `continue_conversation`이 사용합니다.          |
| `--model`                        | `-m`         | `string`   | 사용할 모델 full-name을 지정합니다. `model_map.antigravity`의 tier 해석 결과가 주입됩니다.                          |
| `models`                         | -            | 서브커맨드 | 사용 가능한 모델 목록을 반환합니다. `core/agyModels`가 1시간 TTL 캐시로 호출합니다.                                 |

### ⚙️ cogair 내부 호출 패턴

**새 대화 시작 (`start`):**

```
agy -p <prompt> --output-format json [--sandbox] [--dangerously-skip-permissions] [-m <model>]
```

**대화 재개 (`resume`):**

```
agy --continue -p <prompt> --output-format json [--sandbox] [--dangerously-skip-permissions] [-m <model>]
```

### 🔑 세션 격리 방식 (`externalSessionRef`)

`agy`는 headless conversation ID를 발급하지 않습니다(Issue #7). cogair는 세션별 독립 cwd(`~/.claude/plugins/cogair/agy/<sessionId>/`)를 생성하여 이를 세션 핸들로 사용합니다. `externalSessionRef = cwd` 이며, `resume` 시 동일한 cwd를 재사용하면 `--continue`가 해당 디렉토리의 최근 대화를 재개합니다.

- **start 타임아웃**: cwd를 삭제하여 정리합니다.
- **resume 타임아웃**: cwd를 보존합니다(대화 이력 손실 방지).

### 🚨 알려진 버그 — 빈 stdout (Antigravity Issue #76)

비TTY(파이프/subprocess) 환경에서 `agy -p`가 stdout을 무음으로 누락할 수 있습니다. cogair의 3단계 복구 흐름:

1. **JSON 파싱**: `--output-format json` 응답의 `response` / `output` / `text` / `message` / `result` 키를 순서대로 탐색합니다.
2. **트랜스크립트 폴백**: `resolveTranscript(cwd, since)`로 agy 트랜스크립트 파일을 읽으려 시도합니다 (경로 확정 후 활성화 예정).
3. **`cli_error` 반환**: 위 두 방법이 모두 실패하면 명시적 오류를 반환합니다.

### 📦 모델 목록 (`list_antigravity_models` — 4번째 MCP 도구)

`core/agyModels`는 `agy models` 서브커맨드를 실행하여 모델 목록을 가져오고, 결과를 1시간 TTL로 캐시합니다(`~/.claude/plugins/cogair/agy-models-cache.json`). `list_antigravity_models` MCP 도구가 이 캐시를 반환합니다. `agy`가 없거나 미인증 상태이면 빈 배열을 반환하며 절대 throw하지 않습니다.

---

## 3. Codex CLI 주요 플래그 및 사용법

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

## 4. cogair 프로바이더 플래그 대조표

cogair 설정(`option_flags`)과 각 CLI 플래그의 대응 관계입니다.

| cogair `option_flags` 키       | Gemini CLI       | Antigravity CLI (`agy`)          | Codex CLI                             |
| :----------------------------- | :--------------- | :------------------------------- | :------------------------------------ |
| `gemini.yolo`                  | `--yolo`         | —                                | —                                     |
| `gemini.sandbox`               | `--sandbox`      | —                                | —                                     |
| `gemini.sandbox_backend`       | 환경 변수로 전달 | —                                | —                                     |
| `antigravity.sandbox`          | —                | `--sandbox` (terminal-only)      | —                                     |
| `antigravity.skip_permissions` | —                | `--dangerously-skip-permissions` | —                                     |
| `codex.yolo`                   | —                | —                                | `--yolo`                              |
| `codex.sandbox`                | —                | —                                | `--ask-for-approval` 계열 (버그 주의) |

> **Google 엔진 슬롯**: 설정 UI의 `google-engine` 라디오(`gemini` \| `antigravity`)가 Google 슬롯을 결정합니다. 두 엔진은 상호 배타적이며, `ConfigSchema.superRefine`이 동시 활성화를 차단합니다. `model_map.antigravity`(tier `high` / `mid` / `low`)는 antigravity 선택 시에만 유효합니다.
