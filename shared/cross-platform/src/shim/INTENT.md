## Purpose

빌드 시점에 Windows `.cmd` shim 파일을 생성하는 generator. 각 플러그인이 `bridge/run-hook.cmd` 같은 entry shim 을 자체 build script 에서 호출.

## Structure

| File                      | Role                                            |
| ------------------------- | ----------------------------------------------- |
| `index.ts`                | barrel                                          |
| `generate-windows-cmd.ts` | `generateWindowsCmd(opts)` — .cmd 텍스트 emit   |

## Conventions

- `.cmd` 본문 템플릿: `@echo off\r\n"%~dp0<node>" "%~dp0<script>" %*\r\n`.
- CRLF 줄바꿈 — Windows .cmd 호환.
- nodeRelativePath 미지정 시 `node.exe` (PATH 의존); caller 가 명시 권장.

## Boundaries

### Always do

- 출력 디렉토리 없으면 자동 생성.
- CRLF 줄바꿈으로 출력.

### Ask first

- PowerShell launcher (.ps1) 추가.
- shim 본문 템플릿 변경.

### Never do

- Unix 환경에서 .cmd 실행 시도 (본 모듈은 생성만 책임).

## Dependencies

- 외부: 없음.
- 내부: 없음 (Node 내장만).
