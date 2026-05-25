# cogair — Windows 호환성 이슈 종합 보고

## 개요

Windows 환경(Windows 11, Node 20+, npm 글로벌 설치)에서 `codex` / `gemini` CLI를 정상 설치/인증했음에도, cogair가 두 프로바이더를 모두 "not installed"로 인식하고 실제 호출 시에도 `cli_error: External CLI failed to execute.`로 즉시(약 30ms) 실패합니다. 원인은 Node `child_process.spawn`이 Windows에서 `.cmd`/`.bat` 셸 스크립트를 `shell: true` 없이는 실행하지 못하는 잘 알려진 동작입니다. npm 글로벌 CLI는 `codex.cmd`, `gemini.cmd` 형태로 설치되므로 영향을 받습니다.

## 환경 정보

- OS: Windows 11 Home 10.0.26200
- Shell: PowerShell
- cogair: 0.2.1 (`C:\Users\User\.claude\plugins\cache\ogham\cogair\0.2.1`)
- codex-cli: 0.133.0 (`C:\Users\User\AppData\Roaming\npm\codex.cmd`)
- gemini CLI: 0.43.0 (`C:\Users\User\AppData\Roaming\npm\gemini.cmd`)

## 재현 절차

```js
// (1) shell 옵션 없이 → ENOENT
node -e "const {spawn}=require('child_process'); spawn('codex',['--version']).on('error',e=>console.log(e.code))"
// → ERROR: ENOENT spawn codex ENOENT

// (2) shell:true → 정상
node -e "const {spawn}=require('child_process'); spawn('codex',['--version'],{shell:true}).stdout.on('data',d=>process.stdout.write(d))"
// → codex-cli 0.133.0
```

## 영향 받는 파일 (소스 기준)

1. `src/lib/checkExecutable.ts:23` — 프로바이더 설치 여부 감지
2. `src/dispatcher/codex/operations/spawn.ts:21` — codex 디스패치 호출
3. `src/dispatcher/gemini/operations/spawn.ts:28` — gemini 디스패치 호출

> 참고: `src/mcp/tools/openSettings/utils/openBrowser.ts`는 이미 `shell: process.platform === 'win32'`로 처리되어 있어 같은 저장소 내 선례가 있습니다.

## 증상 3가지

### 증상 1 — 설정 UI에서 프로바이더 둘 다 "not installed"

- `/cogair:setup` Providers 패널이 codex/gemini 모두 미설치로 표시.
- `mcp/tools/openSettings/webServer/handlers/handleGetProviderStatus.ts`가 `checkExecutable('codex')` / `checkExecutable('gemini')`를 호출하는데, 내부 `spawn`이 ENOENT로 즉시 실패.
- 반면 SessionStart 훅 배너의 "Active providers: gemini, codex"는 설정의 `ratio.X.enabled` 값만 보고 표시하므로 실제 감지 결과와 괴리.

### 증상 2 — 감지 타임아웃 부족 (Windows 한정)

- `shell: process.platform === 'win32'`만 적용해도 **gemini는 여전히 not installed**로 표시.
- 원인: `DEFAULT_TIMEOUT_MS = 1500`이지만 Windows에서 `gemini --version`은 첫 출력까지 약 2.7s, 프로세스 종료까지 약 3.9s 소요 (Node 콜드 스타트 + gemini-cli 초기화).
- codex-cli는 500ms 안에 끝나지만 gemini-cli는 1500ms 안에 못 끝남.

실측:

```
gemini --version  +2792ms data: "0.43.0\n"
gemini --version  +3934ms exit 0
```

### 증상 3 — `/cogair:codex`, `/cogair:gemini` 디스패치 즉시 실패

- 호출 시 30ms 안에 `{ status: 'failure', error: { code: 'cli_error', message: 'External CLI failed to execute.' } }` 반환.
- 원인: `spawnCodex` / `spawnGemini` 또한 같은 패턴으로 `shell` 없이 spawn → ENOENT → 디스패처가 `cli_error`로 매핑.

## 정식 수정 요청

### 권장안 — `cross-spawn` 도입

세 곳의 `import { spawn } from 'node:child_process'` 만 `import spawn from 'cross-spawn'`로 교체하면 `.cmd`/`.bat` 해석 및 args escape를 모두 라이브러리가 처리합니다. 의존성 한 줄 추가로 플랫폼 차이 자체를 제거.

```ts
// before
import { spawn } from "node:child_process";
// after
import spawn from "cross-spawn";
```

`devDependencies`가 아닌 `dependencies`에 `cross-spawn`을 추가해야 합니다.

### 차선안 — 플랫폼별 shell 옵션

의존성 추가가 부담스럽다면 세 spawn 사이트에 모두 다음을 추가:

```ts
shell: process.platform === 'win32',
```

이때 다음 두 가지 주의:

- **보안**: `shell: true`는 args를 escape 없이 concat합니다. cogair 디스패처는 프롬프트 본문을 stdin으로 보내고 argv는 고정 플래그(`--model`, `exec` 등) 위주로 보이므로 비교적 안전하지만, `cwd`/`options.env`/사용자 모델 alias가 argv로 흘러갈 여지가 있다면 별도 escape 또는 화이트리스트 검증을 권장. 이런 이유로 `cross-spawn` 쪽을 더 권장.
- **deprecation 경고**: Node 22+에서 `shell:true`와 args 배열 조합은 `DEP0190` 경고 발생. `cross-spawn`을 쓰면 회피됨.

### 부가 수정 — `checkExecutable` 타임아웃 상향

`src/lib/checkExecutable.ts`의 `DEFAULT_TIMEOUT_MS`를 5000~8000ms로 상향. 또는 호출자가 결정할 수 있도록 인자만 노출해도 됨. Windows + gemini-cli 조합 외에는 1500ms로도 충분하지만, 마진을 두는 편이 안전합니다.

### Acceptance criteria

- [ ] Windows 11 + Node 20/22, npm 글로벌 설치만으로 `/cogair:setup` Providers 패널이 codex/gemini를 모두 "installed"로 표시
- [ ] `/cogair:codex`, `/cogair:gemini` 호출 시 실제 CLI가 정상 실행되어 응답 반환
- [ ] `/cogair:crosscheck`도 정상 동작
- [ ] macOS / Linux 동작에 회귀 없음
- [ ] DEP0190 등 Node deprecation 경고 미발생 (cross-spawn 채택 시)

---

## 별첨 — 로컬 임시 수정 (참고용, 정식 수정 반영 후 제거 예정)

번들된 `bridge/mcp-server.cjs`에 직접 적용. 백업은 `bridge/mcp-server.cjs.bak`.

| 함수(번들 식별자) | 원 소스 위치                                   | 변경                                                                                         |
| ----------------- | ---------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `Bi`              | `src/lib/checkExecutable.ts:23`                | spawn 옵션에 `shell: process.platform === "win32"` 추가, 타임아웃 상수 `Tx=1500` → `Tx=8000` |
| `Zp`              | `src/dispatcher/codex/operations/spawn.ts:21`  | spawn 옵션에 `shell: process.platform === "win32"` 추가                                      |
| `Cr`              | `src/dispatcher/gemini/operations/spawn.ts:28` | spawn 옵션에 `shell: process.platform === "win32"` 추가                                      |

플러그인 업데이트 시 캐시 디렉터리가 갱신되면 패치는 사라집니다. 정식 수정이 반영되는 시점에 `.bak` 파일을 그대로 덮어써 원복할 수 있습니다.

---

위 내용을 그대로 GitHub Issue로 사용하거나, PR description에 붙여 쓰셔도 무리 없는 형태로 정리했습니다.
