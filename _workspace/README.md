# Workspace Handoff Rules

`_workspace/`는 리더와 워커가 공유하는 감사 추적 공간이다. 긴 결과물이나 역할 간 핸드오프는 채팅보다 여기 파일로 남긴다.

## 파일명 규칙

- `{phase}_{artifact}.md`
- 같은 단계에서 역할별로 나뉘면 `{phase}_{role}_{artifact}.md`

## 권장 파일 세트

- `00_request_snapshot.md`
- `01_design_brief.md`
- `02_ui_contract.md`
- `02_api_contract.md`
- `03_frontend_build_notes.md`
- `03_backend_build_notes.md`
- `04_integration_notes.md`
- `05_qa_findings.md`
- `06_release_checklist.md`

## 각 파일에 공통으로 들어갈 것

- 작성 목적
- 전제 또는 가정
- 결정 사항
- 미결 사항
- 다음 역할에게 필요한 정보

## 운영 규칙

- 이전 파일을 지우지 말고 갱신 이유를 남긴다.
- 워커는 자신이 바꾼 코드만이 아니라 다음 역할이 알아야 할 위험도 기록한다.
- 리더는 단계 전환 시점마다 어떤 파일이 기준 문서인지 명확히 한다.
