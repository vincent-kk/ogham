# Testing Strategy & Acceptance Criteria

Windows와 Unix (macOS, Linux) 런타임 간의 호환성 무결성을 보장하기 위한 테스트 전략과 검증 기준입니다.

## 1. 테스트 통합 전략

### 1.1 CI 매트릭스 (Matrix) 구성
- `os: [ubuntu-latest, macos-latest, windows-latest]`
- `node: [20, 22]`
- 워크스페이스 전역을 대상으로 `yarn test:run` 실행 및 패키지별 E2E 동작 무결성 상시 점검.

### 1.2 단위/모킹 환경 구성
- `vi.mock('node:os')` 및 `vi.stubGlobal('process')`를 활용하여 Windows/Unix 운영체제 환경 모방 단위 테스트.

### 1.3 통합 / E2E 테스트 인프라
- **Fake Binary Suite**: `tests/fixtures/bin-fake/` 폴더 내에 `.cmd` 셸 스크립트와 표준 스크립트 모의 바이너리 구현, PATH 우회 응답 검증.
- **Windows Runner Real Binary**: E2E 스텝 내에서 직접 실제 외부 프로그램(`winget` 경유 `node`, `git` 등) 설치 후 플러그인 실제 구동 점검.

---

## 2. Acceptance Criteria (패키지별 합격 기준)

### `cogair`
- [ ] `/cogair:setup` 의 도구 패널에서 Windows(Node 20/22) 환경상 `codex`, `gemini` 정상 인식 여부(`installed`).
- [ ] 파서에서 CRLF 라인 엔딩 정상 취급, 에러 또는 오동작 방지.

### `filid`
- [ ] `mcp__plugin_filid_t__*` 도구가 Windows 기반 서버 환경에서도 정상 노출/호출.
- [ ] Git 미설치 환경에서도 충돌하지 않고 graceful fallback 구동(`error-log` 기록 및 적절한 메시지 반환).
- [ ] `ast-grep` 경로 화이트리스트가 `C:\Windows\System32` 등 시스템 디렉토리를 정상 제어.

### `maencof`
- [ ] Windows 환경에서도 `SessionStart` 컨텍스트가 페르소나를 성공적으로 주입.
- [ ] Hook 부팅 실패 시 즉각적으로 에러 사유를 로깅(`error-log.json`)하고 터미널에 가시적 경고 송출 (Silent failure 0건).

### `imbas`
- [ ] 임시 디렉토리 캐싱 로직이 `process.env.HOME` 대신 `USERPROFILE` 기반으로도 올바르게 경로 생성.
- [ ] `build-mcp-server.mjs` 가 글로벌 `npm` 없이도 `process.execPath`로 안전하게 우회 빌드 성공.

### `maencof-lens`
- [ ] `/` 와 `\` 가 섞인 Windows 혼합 파일 시스템 경로 입력에서도 정규화 및 슬라이스 무결성 확보.
- [ ] `config-loader`의 `os.tmpdir()` 전환 관련 테스트 일관성 증명.

### 공통 (Repo-wide)
- [ ] `node:child_process` API의 직접 Import 금지 린트 통과.
- [ ] Linux/macOS 기존 테스트들에 대한 Regression Zero 달성.