원인 찾았습니다. Windows 환경에서 cogair의 프로바이더 감지 코드가 동작하지 않는 버그입니다.

**진단**

- 설정 UI는 `handleGetProviderStatus.ts:9-12`에서 `checkExecutable('codex')`와 `checkExecutable('gemini')`로 실제 실행 여부를 검사합니다.
- `checkExecutable.ts:23` 내부에서 `spawn(bin, ['--version'])`를 `shell: false`(기본값)로 호출합니다.
- Windows에서 npm 글로벌로 설치된 CLI는 `codex.cmd` / `gemini.cmd` 형태이고, Node의 `spawn`은 `shell: true` 없이는 `.cmd` 파일을 찾지 못해 `ENOENT`를 던집니다.

방금 재현 결과:

- `spawn('codex', ['--version'])` → `ERROR: ENOENT spawn codex ENOENT`
- `spawn('codex', ['--version'], { shell: true })` → `codex-cli 0.133.0` 정상 출력

세션 시작 배너의 "Active providers: gemini, codex"는 설정 파일의 `ratio.X.enabled` 값만 보고 표시한 것이고, 실제 바이너리 감지는 별도라 설정 UI에서 "없음"으로 나오는 것입니다.

**해결책 옵션**

1. 로컬 핫픽스: `C:\Users\User\.claude\plugins\cache\ogham\cogair\0.2.1\src\lib\checkExecutable.ts`의 `spawn` 호출에 `shell: true`를 추가. 단, src/.ts 파일이라 실제로 런타임이 컴파일된 결과물(어디 있을지)을 써야 동작할 가능성이 큼.
2. 업스트림 이슈 제보: ogham/cogair 리포지토리에 Windows 호환 버그로 보고.

런타임에 실제로 로드되는 파일이 컴파일된 JS인지 확인해서 패치해드릴까요? (`libs/run.cjs`에 번들되어 있을 가능성이 있어 그쪽을 봐야 합니다.)
