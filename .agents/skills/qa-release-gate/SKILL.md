---
name: qa-release-gate
description: UI 계약, API 계약, 구현 결과를 비교해 스모크 테스트와 릴리스 게이트를 수행한다. 웹사이트 기능이 구현된 뒤 회귀 위험, 계약 불일치, 배포 전 blocker를 확인할 때 사용한다.
---

# QA Release Gate

계약과 실제 동작을 비교해 배포 가능 여부를 판단하는 QA 절차다.

## 입력

- `_workspace/02_ui_contract.md`
- `_workspace/02_api_contract.md`
- `_workspace/03_frontend_build_notes.md`
- `_workspace/03_backend_build_notes.md`
- 실행 가능한 테스트 또는 스모크 명령

## 출력

- `_workspace/05_qa_findings.md`
- `_workspace/06_release_checklist.md`

## 절차

1. 계약 기준을 먼저 읽고 성공 조건을 정리한다.
2. 다음 경계면을 우선 비교한다.
   - API 응답 vs UI 기대 shape
   - 저장 전 vs 저장 후
   - 성공 경로 vs 실패 경로
   - 요구사항 vs 실제 동작
3. 가능한 경우 테스트나 스모크 명령을 실행한다.
4. `_workspace/05_qa_findings.md`에 다음 형식으로 남긴다.
   - 우선순위
   - 증상
   - 재현 절차
   - 근거
   - 권장 조치
5. `_workspace/06_release_checklist.md`에는 배포 전에 확인할 항목을 남긴다.
   - 핵심 흐름 통과
   - 알려진 blocker 없음
   - 환경 변수 또는 마이그레이션 준비
   - 남은 위험과 우회책

## 주의

- “문제 없음”만 적지 않는다. 무엇을 실행했고 무엇이 비검증인지 같이 적는다.
- 배포 링크가 있으면 최종 확인 URL도 기록한다.
