# agy Upstream Watch — 워크어라운드 추적

cennad antigravity dispatcher 가 우회 중인 agy(Antigravity CLI) 업스트림 결함의 현재 상태와
각 워크어라운드의 해제 조건을 추적한다. agy 업데이트가 나오면 아래 재검증 절차를 실행하고
검증 로그에 결과를 추가한다.

업스트림 저장소: <https://github.com/google-antigravity/antigravity-cli>

## 워크어라운드와 해제 조건

**1. 빈 stdout → brain transcript 읽기 전용 복구** — [Issue #76](https://github.com/google-antigravity/antigravity-cli/issues/76) (closed 2026-07-12)

- 증상: 비-TTY(파이프/서브프로세스)에서 `agy -p` 가 stdout 을 무음 드롭(빈 출력, exit 0)
  하거나, 로깅 초기화 이전에 블로킹되어 행(hang) — `--print-timeout` 도 행 변종을 종료하지
  못한다. TTY 대화형 사용은 정상.
- 코드: `plugins/cennad/src/dispatcher/antigravity/utils/resolveTranscript.ts`,
  `agyTranscriptStore.ts` (`callAgy` 3단계 폴백의 2단계).
- 상태: **#76 종결·재검증 통과(2026-07-15)했으나 폴백은 제거하지 않고 유지.** cennad 는 agy
  버전을 강제하지 않아 구버전(#76 미해결) 사용자에게 여전히 필요한 안전망이며, stdout 이
  정상일 땐 발동하지 않아 정상 경로에 영향이 없다.
- 복구 대상: 완료 대화의 마지막 `PLANNER_RESPONSE.content`. 도구 사용 대화도 동일하게
  복구된다(2026-07-23 실측 — 중간 도구 스텝은 `content` 없이 `thinking`+`tool_calls` 만
  담아 자동 제외될 뿐이며, "스키마 드리프트로 복구 불가"는 오진이었다). 단 권한
  auto-deny(워크어라운드 6)로 미완성된 대화는 최종 답변 엔트리가 없어 복구 대상이 아니다.

**2. `--sandbox` 부착** — 복원 완료 (2026-07-15)

- 코드: `buildStartArgs.ts` / `buildResumeArgs.ts` 가 `if (args.flags.sandbox)
argv.push('--sandbox')` 로 부착. `types/dispatch.ts` 의 `AntigravityFlags.sandbox` 는
  config 기본 **true**(2026-07-23 워크어라운드 6 과 짝으로 격상 — skip_permissions 만
  켜고 sandbox 를 끄면 unsandboxed 실행까지 무제한 우회라 함께 켠다). settings
  UI(`mcp/pages/settings/index.html`·`scripts/app.js`)의 sandbox 토글도 `disabled`
  해제·config 양방향 바인딩 복원.
- 경위: 과거 #76(non-TTY 출력 드롭) 악화 요인이라 wiring 을 주석 처리했으나, #76 종결 후
  비-TTY + `--sandbox` 조합 재검증(agy 1.1.2)에서 정상 출력을 확인해 복원했다.

**3. cwd 격리 세션 핸들** — [Issue #7](https://github.com/google-antigravity/antigravity-cli/issues/7) (open)

- 증상: `-p` 실행이 conversation id 를 stdout/stderr/문서화된 파일 어디에도 내보내지 않아
  headless 호출자가 특정 대화를 안정적으로 재개할 수 없다. `--conversation <id>` 플래그는
  존재하지만(1.1.2 확인) id 를 캡처할 방법이 없다.
- 코드: `utils/ensureCwd.ts` — `externalSessionRef = runtime/antigravity-cwd/<sessionId>/`.
- 해제 조건: `-p` 가 conversation id 를 출력(또는 공식 headless 출력 포맷 제공)하면
  `--conversation` 기반 resume 으로 교체 검토.

**4. transcript JSONL 스키마 의존** — 이슈 아님 (비문서화 내부 구조)

- agy 1.0.4 부터 SQLite(`conversations/<id>.db`)가 공식 대화 포맷이며 brain JSONL 과 병행
  기록된다(1.1.2 에서도 JSONL 생존 확인). JSONL 폐기 시 복구가 깨진다 — 그 경우 `cli_error`
  로 안전 실패하도록 설계됨.
- 해제 조건: agy 가 공식 headless 출력 경로(`--output`/`--format json`)를 제공하면
  `agyTranscriptStore` 만 교체. 1.1.2 기준 아직 미제공.

**5. `agy models` 빈 출력 재시도** — #76 파생 (기존 미추적분)

- 증상: #76 과 동일한 non-TTY stdout 드롭이 `agy models` 조회에도 영향을 줄 수 있다.
- 코드: `core/agyModels/operations/refreshModels.ts` — stdout 파싱 실패 시 stderr 파싱,
  그래도 빈 결과면 최대 3회 재시도. `utils/parseModels.ts` 는 JSON/텍스트/테이블·ANSI 대응.
- 상태: 저비용 재시도라 #76 종결 후에도 무해. 제거는 선택.

**6. headless 권한 auto-deny → `--dangerously-skip-permissions` 기본 부착** — agy 1.1.3+ 동작 변경

- 증상: agy 1.1.3+ 는 headless `-p` 에서 권한 프롬프트가 필요한 도구(`run_command` 등)를
  auto-deny 하고 빈 stdout(exit 0)으로 종료한다 — 모델이 도구를 쓰는 코딩 프롬프트에서
  비결정적으로 실패(모델이 도구를 안 쓰면 정상). agy 는 원인·조치를 stderr 로 안내한다
  ("a tool required the command permission ... re-run with --dangerously-skip-permissions").
- 코드: `constants/defaults.ts` 의 `option_flags.antigravity.skip_permissions` 기본 **true**
  → `buildStartArgs`/`buildResumeArgs` 가 `--dangerously-skip-permissions` 부착.
  `callAgy` 는 빈 출력+복구 실패 시 `emptyOutputMessage` 로 stderr 를 `cli_error` 에 반영.
  기존 사용자 config 는 저장값이 기본값을 덮으므로(`mergeOptionFlags`) `/setup` 또는 설정
  UI 에서 켜야 반영된다.
- 상태: agy 는 자체 scratch(`~/.gemini/antigravity-cli/scratch/`)에서 작업하므로 부착해도
  사용자 트리를 오염하지 않음(2026-07-23 실측). 해제 조건: agy 가 headless 위임용 무프롬프트
  실행을 공식 지원하면 기본값 재검토.

## 검증 로그

**2026-07-23 — agy 1.1.5, macOS (Darwin 25.5)**

- 사용자 실패 재현: 코딩 프롬프트(생성/수정 파일 전체 내용 요구)에서 `agy -p --sandbox` 가
  빈 stdout(exit 0). cli 로그에 `soft-denying tool confirmation "Bash"` +
  `RunCommand approved=false`, transcript 마지막이 `run_command` tool_call 로 끝나 최종
  답변 미생성. 같은 프롬프트라도 모델이 도구를 안 쓰면 정상 출력(비결정적).
- 대조 실험(동일 프롬프트, 도구 사용 강제): `--sandbox` 만 → stdout **0B**(실패);
  `--sandbox --dangerously-skip-permissions` → **1426B** 정상. 인과 확정.
- stderr 안내 확인: 빈 출력 시 agy 가 "a tool required the command permission ... re-run
  with --dangerously-skip-permissions" 를 stderr 로 출력(exit 0). cennad 가 이를 버리고
  generic "no output" 을 내던 것을 `emptyOutputMessage` 로 반영하도록 수정.
- transcript 스키마 실측: 완료 대화의 최종 답변은 마지막 `PLANNER_RESPONSE.content`
  (도구 사용 대화도 동일; 중간 도구 스텝은 content 없이 thinking+tool_calls). 기존
  `extractPlannerResponse` 가 이미 정확히 복구 — "스키마 드리프트로 복구 실패" 오진 정정.
- 격리 확인: skip-permissions 하에서도 agy 는 `~/.gemini/antigravity-cli/scratch/` 에서
  작업 — 사용자 트리 비오염.
- 조치: `skip_permissions` 기본 true(워크어라운드 6 신설), 빈 출력 `cli_error` 에 stderr 반영,
  복구 계약을 "완료 대화의 마지막 `PLANNER_RESPONSE.content`" 로 명문화. #7 여전히 open
  (cwd 격리 유지). #76 은 구버전 안전망으로 복구 경로 유지.

**2026-07-15 — agy 1.1.2, macOS (Darwin 25.5)**

- #76 **closed 2026-07-12**, #7 여전히 open (`gh api` 확인).
- 비-TTY 스모크 통과: `agy -p … > out.txt` 정상 종료(exit 0)·out 632바이트·행 없음·최신
  로그 14 KB. 6월의 행 변종(약 8분 후 SIGTERM·0바이트)은 재현되지 않음.
- `--sandbox` 조합 스모크도 통과: exit 0·out 555바이트·정상 응답 — 워크어라운드 2 복원 근거.
- `agy --help`: 공식 headless 출력 경로(`--output`/`--format json`) 여전히 없음.
  `--conversation <id>` 재개는 가능하나 `-p` 가 id 를 emit 하지 않음(#7 근거).
- brain `transcript.jsonl` 1.1.2 에서도 기록됨 (복구 경로·스키마 생존).
- 조치: 워크어라운드 2 복원. 1(폴백)은 구버전 호환 안전망으로 유지, 3(cwd 격리)은 #7 open
  이라 유지, 5(models 재시도)는 무해하게 유지.

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
4. 결과를 검증 로그에 추가. 해제 조건 충족 시: 코드 wiring 복원 →
   `src/dispatcher/antigravity/DETAIL.md` · `plugins/cennad/CLAUDE.md` · 본 문서 갱신.
