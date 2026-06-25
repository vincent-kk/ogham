# r-statistics — 로드맵

## 설계 완료 (이 spec)
11개 결정 + 8개 설계 문서. 골격·정책·룰셋 확정.
- 정체성(도메인 중립 통계 전문가) · 3-Layer · MCP 4도구 · 에이전트 3 · 노출 스킬 6 · Dispatcher 상태머신 · 실행모드(interactive/auto) · assert 룰셋 · 샌드박싱 · 패키지(renv) · 명칭.

## 이 spec에서 확정한 미결
- **디렉토리 구조** → [architecture.md](./architecture.md) (deilen 차용 확정)
- **상태머신 상태 수** → [dispatcher.md](./dispatcher.md) (codex 15 → 10 병합)
- **Dispatcher 위치** → analyze 오케스트레이터 스킬 + state-machine.md + assert 게이트

## 남은 구현 디테일 (구현 단계)
| 항목 | 비고 |
|------|------|
| `methods/` 전체 카탈로그 확정 | 결정트리의 모든 기법에 meta.yaml + template.R.tmpl 작성 |
| `src/` 코드 구현 | FCA·1함수1파일·문자열 상수 규약 준수 (architecture.md) |
| `shared/contract.R` 골격 구현 | header/footer 헬퍼 (add_artifact, write_json_artifact, save_plot_artifact) |
| 빌드 파이프라인 | `scripts/buildMcpServer.mjs` → `bridge/mcp-server.cjs` (deilen 패턴) |
| `r-setup` 설치 명령 검증 | winget/choco/brew 실제 명령·동의 UX |
| 패키지 화이트리스트 | renv lockfile 초기 패키지 집합 확정 |
| 테스트 | vitest 단위 + 통계 정확성 calibration (filid calibration 패턴 참고) |

## 이후 (원 파이프라인 — 별도 작업)
- **A축**: 논문 검색·수집 plugin (PubMed/Cochrane/Scholar). [[ncbi-eutilities-pubmed-api]] 가이드 보유.
- **C축**: 논문 작성 plugin (DOCX·인용·저널). r-statistics의 `reporting` Quarto 출력이 재료.
- **전체 오케스트레이션**: A·B·C 결합, 데이터 주입 방식.

## 참고 출처
- 설계 논의·교차검증: maencof vault L4 `r-statistics-plugin-architecture` (codex·antigravity 3회 교차검증 세션 id 포함).
- 형식 참고: `plugins/deilen` · `plugins/filid/skills/cross-review` · `plugins/imbas/skills`.
- FCA: `plugins/filid` (Fractal Context Architecture 시행체).
