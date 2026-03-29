---
name: fullstack-orchestrate
description: 풀스택 웹사이트 작업을 와이어프레임, React/Next.js 프론트엔드, API 백엔드, QA, 배포 준비까지 파이프라인으로 조율한다. 웹사이트 기능 구현을 여러 역할로 나눠야 하거나, 디자인부터 릴리스 게이트까지 한 흐름으로 관리해야 할 때 이 스킬을 사용한다.
---

# Fullstack Orchestrate

리더가 전체 작업을 분해하고 `_workspace/` 중심으로 핸드오프를 남기게 만드는 오케스트레이션 스킬이다.

## 실행 순서

1. 저장소와 사용자 요청을 읽고 범위, 제약, 기술 스택, 배포 맥락을 확인한다.
2. `update_plan`에 최소 다음 단계를 적는다.
   - 설계
   - 계약
   - 프론트엔드
   - 백엔드
   - 통합
   - QA
   - 배포 준비
3. `_workspace/00_request_snapshot.md`에 다음을 적는다.
   - 목표
   - 이번 턴 범위
   - 비범위
   - 기술 제약
   - 각 역할의 파일 책임
4. 디자인 워커를 먼저 실행해 `_workspace/01_design_brief.md`와 `_workspace/02_ui_contract.md`를 확보한다.
5. API가 필요한 작업이면 `_workspace/02_api_contract.md`를 먼저 만들거나 백엔드 워커에게 초안을 맡긴다.
6. 프론트엔드와 백엔드의 파일 책임이 분리되면 병렬 실행한다.
7. 두 워커의 결과를 기다린 뒤 `_workspace/04_integration_notes.md`에 연결 상태와 남은 위험을 기록한다.
8. QA 워커에게 계약, 관련 경로, 성공 기준, 테스트 후보 명령을 주고 검증을 맡긴다.
9. `_workspace/06_release_checklist.md`가 채워지면 배포 가능 여부를 정리한다.

## 병렬화 규칙

- 디자인 산출물이 없으면 프론트엔드 구현을 크게 시작하지 않는다.
- API 계약이 전혀 없으면 프론트엔드와 백엔드를 동시에 시작하지 않는다.
- 파일 충돌이 예상되면 병렬화 대신 순차로 전환한다.

## 필수 산출물

- `_workspace/00_request_snapshot.md`
- `_workspace/01_design_brief.md`
- `_workspace/02_ui_contract.md`
- `_workspace/02_api_contract.md`
- `_workspace/03_frontend_build_notes.md`
- `_workspace/03_backend_build_notes.md`
- `_workspace/04_integration_notes.md`
- `_workspace/05_qa_findings.md`
- `_workspace/06_release_checklist.md`

## 리더의 최종 보고

최종 보고에는 다음을 포함한다.

- 이번 턴에 완료한 단계
- 남은 blocker
- QA 결과
- 배포 준비 상태
