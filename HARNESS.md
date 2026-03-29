# Full-Stack Website Harness

이 저장소의 하네스는 와이어프레임부터 배포 직전 릴리스 게이트까지를 하나의 파이프라인으로 조율한다. 리더는 범위와 계약을 고정하고, 디자인과 구현 워커가 역할별 산출물을 `_workspace/`에 남기며, QA가 최종 경계면을 검증한다.

## 팀 구성

| 역할 | 권장 agent_type | 책임 |
|------|-----------------|------|
| `web-tech-lead` | `default` | 범위 확정, 작업 분해, 병렬화 판단, 통합, 배포 준비 |
| `design-lead` | `worker` | 와이어프레임, 화면 구조, UI 계약, 상태 정의 |
| `frontend-nextjs-builder` | `worker` | React/Next.js UI 구현, 클라이언트 상태, 접근성 |
| `backend-api-builder` | `worker` | API 계약, 검증, 서버 로직, 데이터 계층 |
| `qa-release-reviewer` | `worker` | 스모크 테스트, 계약 비교, 회귀 체크, 릴리스 게이트 |

## 기본 파이프라인

1. 요청과 저장소를 읽고 `_workspace/00_request_snapshot.md`에 범위와 제약을 적는다.
2. 디자인 워커가 `_workspace/01_design_brief.md`와 `_workspace/02_ui_contract.md`를 만든다.
3. 필요 시 리더 또는 백엔드 워커가 `_workspace/02_api_contract.md`를 만든다.
4. 프론트엔드와 백엔드를 병렬로 실행한다.
5. 각 워커는 `_workspace/03_frontend_build_notes.md`, `_workspace/03_backend_build_notes.md`에 구현 결과와 미해결점을 남긴다.
6. 리더가 통합 체크를 하고 `_workspace/04_integration_notes.md`를 갱신한다.
7. QA 워커가 `_workspace/05_qa_findings.md`와 `_workspace/06_release_checklist.md`를 작성한다.
8. 리더가 배포 준비 여부를 판단하고 필요한 배포 스킬 또는 플랫폼 도구로 넘긴다.

## `_workspace/` 표준 산출물

- `_workspace/00_request_snapshot.md`
- `_workspace/01_design_brief.md`
- `_workspace/02_ui_contract.md`
- `_workspace/02_api_contract.md`
- `_workspace/03_frontend_build_notes.md`
- `_workspace/03_backend_build_notes.md`
- `_workspace/04_integration_notes.md`
- `_workspace/05_qa_findings.md`
- `_workspace/06_release_checklist.md`

## 조율 원칙

- 디자인이 인터페이스를 고정하기 전에는 프론트엔드 구현을 크게 시작하지 않는다.
- 프론트엔드와 백엔드는 파일 책임이 분리될 때만 병렬 실행한다.
- QA는 구현 완료 후 한 번만 하지 않고, 계약과 통합 지점이 보일 때마다 끼워 넣는다.
- 워커 간 긴 대화보다 `_workspace/` 파일 핸드오프를 우선한다.
- 배포는 별도 역할로 고정하지 않는다. 리더가 배포 플랫폼에 맞는 기존 스킬이나 도구를 선택한다.
