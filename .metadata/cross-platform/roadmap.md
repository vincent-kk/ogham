# Migration Roadmap

본 로드맵은 총 약 11.5 영업일 규모의 점진적 마이그레이션 계획을 담고 있으며, 의존성에 따라 각 Phase는 독립된 PR로 분할하여 실행합니다.

## Phase 0 — Audit lock-in (PR-Z)
- 문서 추적 및 인덱스 신설, 패키지별 `INTENT.md` 에 중앙 레포지토리 참조 링크 추가 완료.

## Phase 1 — `shared/cross-platform` 워크스페이스 구축 (PR-A, PR-B)
- **PR-A**: 워크스페이스 뼈대 생성, `package.json`, CI 파이프라인 구성 및 매트릭스 확장.
- **PR-B**: 핵심 7개 어댑터(`spawn`, `paths`, `env`, `eol`, `binaries`, `hooks`, `shim`) 구현 완료 및 `process.platform` mock 기반 단위 테스트 구성.

## Phase 2 — cogair 전환 (PR-C)
- `shared/cross-platform` 의 첫 소비처로 cogair 적용.
- `checkExecutable` 개선, `codex`/`gemini` spawn 호출 어댑터 전환, 출출 결과 EOL 정규화.

## Phase 3 — maencof & maencof-lens Hook Bootstrap 강화 (PR-D, PR-E)
- **PR-D (maencof)**: OS 분기형 `.cmd` 부트스트랩을 적용해 빈 PATH 환경 대응. `selfProbe` 진단 로직 추가를 통해 조용한 실패 차단.
- **PR-E (maencof-lens)**: Hook 부트스트랩 최적화. 경로 분리자 슬라이싱 관련 오류와 `/tmp` 하드코딩 제거.

## Phase 4 — filid, imbas, atlassian 안정화 (PR-F, PR-G, PR-H)
- **PR-F (filid)**: ast-grep 화이트리스트의 OS 독립 처리, `resolve-git-root` 등 명령 어댑터 전환.
- **PR-G (imbas)**: `process.env['HOME']` 의존 제거 및 `path.basename` 정규화 적용.
- **PR-H (atlassian)**: 문서 단 작업. Windows 기반 ACL의 사일런트 무효화 관련 사항 명기.

## Phase 5 — 린트 가드 + 회귀 방지 체계 (PR-I)
- `node:child_process` 패키지의 직접 호출, `/tmp/` 등 절대경로 리터럴 강제 금지/경고 린트 적용.
- 신규 개발 시 잠재적 호환성 결함을 조기 발견.

## Phase 6 — 회귀 모니터링 (Continuous)
- 의존 플러그인의 `esbuild` inline 재빌드 자동화.
- Windows 환경 GitHub Actions 통합 E2E 검증 유지.
