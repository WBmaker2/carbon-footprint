---
name: api-backend-delivery
description: 웹사이트의 API, 서버 검증, 데이터 흐름을 구현하고 프론트엔드와 합의된 계약을 유지한다. Route Handler, pages/api, 서버 유틸, 데이터 계층 작업에서 사용한다.
---

# API Backend Delivery

백엔드 워커가 API와 서버 계층을 구현할 때 따르는 절차다.

## 입력

- `_workspace/00_request_snapshot.md`
- `_workspace/02_ui_contract.md`
- `_workspace/02_api_contract.md`
- 기존 서버와 데이터 계층

## 출력

- 백엔드 코드
- `_workspace/02_api_contract.md` 업데이트
- `_workspace/03_backend_build_notes.md`

## 절차

1. 필요한 endpoint, action, 데이터 읽기/쓰기 경로를 식별한다.
2. 각 endpoint에 대해 다음을 고정한다.
   - 입력 형식
   - 검증 규칙
   - 성공 응답 shape
   - 오류 응답 shape
3. 데이터 저장소나 외부 서비스 의존성이 있으면 환경 변수와 실행 전제도 기록한다.
4. `_workspace/03_backend_build_notes.md`에 다음을 남긴다.
   - 변경 파일
   - 구현한 endpoint 또는 함수
   - 필요한 설정
   - 프론트엔드와의 연결 메모
   - QA가 확인할 실패 경로

## 주의

- 프론트엔드가 기대하는 shape와 다른 응답을 조용히 보내지 않는다.
- 마이그레이션이나 시드가 있으면 영향 범위를 명시한다.
