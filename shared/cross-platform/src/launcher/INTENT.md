## Purpose

OS 기본 핸들러로 URL/파일 열기. `process.platform` 분기를 본 모듈 내부에만 두고, 호출자는 `openBrowser(url)` 같은 추상 API 만 사용. headless / unsupported 환경에서는 silent no-op.

## Structure

| File              | Role                                |
| ----------------- | ----------------------------------- |
| `index.ts`        | barrel                              |
| `open-browser.ts` | `openBrowser(url)` — detached spawn |

## Conventions

- **`OGHAM_NO_BROWSER` 가 모노레포 단일 스위치**다. 비어있지 않은 값이면 전 호출이 no-op — 테스트·CI·headless 호스트용. 플러그인별 `*_NO_BROWSER` 변수를 다시 만들지 않는다(구 `FILID_`·`IMBAS_`·`DEILEN_` 3종이 갈라져 일부 호출부엔 스위치가 아예 없었다).
- detached + unref + `stdio: "ignore"` — 자식 프로세스가 부모 종료에 묶이지 않음.
- 어떤 에러도 throw 하지 않음 (CI / SSH / headless 호환).
- Windows 는 `cmd.exe /c start "" <url>` — 빈 `""` 가 `start` 의 window title 오인 방지.
- 단위 테스트는 `process.platform` mock + spawn mock 으로 3 OS 케이스 커버.

## Boundaries

### Always do

- 모든 URL/파일 외부 핸들러 기동은 본 모듈 경유.
- 새 OS 핸들러는 본 모듈 내부에만 분기 추가.

### Ask first

- macOS / Windows / Linux 외 OS 지원 (BSD 류).
- 동기 변형 (`openBrowserSync`) 노출.

### Never do

- 호출 측에 `process.platform` 분기 노출.
- `node:child_process` 직접 import (cross-spawn 만).

## Dependencies

- 외부: `cross-spawn ^7` (inline).
- 내부: 없음.
