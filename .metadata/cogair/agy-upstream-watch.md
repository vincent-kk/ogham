# agy Upstream Watch — 워크어라운드 추적

cogair antigravity dispatcher 가 우회 중인 agy(Antigravity CLI) 업스트림 결함의 현재 상태와
각 워크어라운드의 해제 조건을 추적한다. agy 업데이트가 나오면 아래 재검증 절차를 실행하고
검증 로그에 결과를 추가한다.

업스트림 저장소: <https://github.com/google-antigravity/antigravity-cli>

## 워크어라운드와 해제 조건

**1. 빈 stdout → brain transcript 읽기 전용 복구** — [Issue #76](https://github.com/google-antigravity/antigravity-cli/issues/76) (open)

- 증상: 비-TTY(파이프/서브프로세스)에서 `agy -p` 가 stdout 을 무음 드롭(빈 출력, exit 0)
  하거나, 로깅 초기화 이전에 블로킹되어 행(hang) — `--print-timeout` 도 행 변종을 종료하지
  못한다. TTY 대화형 사용은 정상.
- 코드: `plugins/cogair/src/dispatcher/antigravity/utils/resolveTranscript.ts`,
  `agyTranscriptStore.ts` (`callAgy` 3단계 폴백의 2단계).
- 해제 조건: #76 종결 + 아래 재검증 통과. 통과하더라도 폴백은 안전망으로 유지 가능 — 제거는 선택.

**2. `--sandbox` 미부착 (wiring 주석 처리)** — #76 악화 요인

- 코드: `buildStartArgs.ts` / `buildResumeArgs.ts` 의 주석 처리된 wiring,
  `types/dispatch.ts` 의 `AntigravityFlags.sandbox` 주석 (config 하위호환용으로 스키마 잔존).
- 업스트림 1.0.6 이 "headless print 모드 `--sandbox` 전파"를 수정했으나, headless `-p`
  자체(#76)가 미해결이므로 복원 게이트는 **#76 종결**이다.
- 해제 조건: #76 종결 후 비-TTY + `--sandbox` 조합 재검증 통과 시 주석 복원.

**3. cwd 격리 세션 핸들** — [Issue #7](https://github.com/google-antigravity/antigravity-cli/issues/7) (open)

- 증상: `-p` 실행이 conversation id 를 stdout/stderr/문서화된 파일 어디에도 내보내지 않아
  headless 호출자가 특정 대화를 안정적으로 재개할 수 없다. `--conversation <id>` 플래그는
  존재하지만 id 를 캡처할 방법이 없다.
- 코드: `utils/ensureCwd.ts` — `externalSessionRef = runtime/antigravity-cwd/<sessionId>/`.
- 해제 조건: `-p` 가 conversation id 를 출력(또는 공식 headless 출력 포맷 제공)하면
  `--conversation` 기반 resume 으로 교체 검토.

**4. transcript JSONL 스키마 의존** — 이슈 아님 (비문서화 내부 구조)

- agy 1.0.4 부터 SQLite(`conversations/<id>.db`)가 공식 대화 포맷이며 brain JSONL 과 병행
  기록된다. JSONL 폐기 시 복구가 깨진다 — 그 경우 `cli_error` 로 안전 실패하도록 설계됨.
- 해제 조건: agy 가 공식 headless 출력 경로를 제공하면 `agyTranscriptStore` 만 교체.

## 검증 로그

**2026-06-10 — agy 1.0.7, macOS (Darwin 25.5)**

- #76 · #7 모두 open (`gh api` 확인, 메인테이너 응답·라벨 없음). 1.0.6 까지 재현 보고 지속.
- 비-TTY 스모크에서 **행 변종 재현**: 로그 파일 0바이트(로깅 초기화 전 블로킹), 대화 미생성,
  `--print-timeout=150s` 무시, 약 8분 후 SIGTERM 종료 — stdout/stderr 0바이트.
  같은 시각 TTY 대화형 사용은 정상.
- brain `transcript.jsonl` 은 1.0.7 에서도 기록됨 (업데이트 직후 대화에서 실측) — 복구 경로 생존.
- 1.0.7 의 "stale callbacks upon cache hits" / "stuck pending state" 수정은 #76 과 연결 근거 없음.
- 결론: 워크어라운드 전부 유지.

## 재검증 절차

1. 이슈 상태 — `gh api repos/google-antigravity/antigravity-cli/issues/76 --jq '{state,closed_at}'`
   (#7 동일).
2. 비-TTY 스모크 — 임시 디렉토리에서 파이프 리다이렉트로 실행:
   `(cd "$(mktemp -d)" && agy -p "Write a ~600 word essay about container shipping." --print-timeout=150s > out.txt 2> err.txt)`
   판정: 정상 종료 + `out.txt` 0바이트 초과 + `~/.gemini/antigravity-cli/log/` 최신 로그 비어
   있지 않음. 행이면 프로세스 kill 후 미해결로 기록.
3. 저장 구조 — 새 대화의
   `~/.gemini/antigravity-cli/brain/<convId>/.system_generated/logs/transcript.jsonl` 존재 확인.
4. 결과를 검증 로그에 추가. 해제 조건 충족 시: 코드 주석 wiring 복원 →
   `src/dispatcher/antigravity/DETAIL.md` · `plugins/cogair/CLAUDE.md` · 본 문서 갱신.
