---
name: nextjs-frontend-delivery
description: React/Next.js 프론트엔드를 구현할 때 디자인 브리프와 UI/API 계약을 코드로 옮기고, 상태 처리와 접근성까지 함께 마무리한다. App Router 또는 Pages Router 기반 UI 구현 작업에서 사용한다.
---

# Next.js Frontend Delivery

프론트엔드 워커가 UI 계약을 코드로 옮길 때 따르는 절차다.

## 입력

- `_workspace/01_design_brief.md`
- `_workspace/02_ui_contract.md`
- `_workspace/02_api_contract.md`
- 기존 프론트엔드 구조

## 출력

- 프론트엔드 코드
- `_workspace/03_frontend_build_notes.md`

## 절차

1. 현재 저장소가 `app/` 기반인지 `pages/` 기반인지 먼저 확인한다.
2. 각 화면을 컴포넌트와 데이터 연결 단위로 나눈다.
3. 구현 중 반드시 포함한다.
   - 기본 상태
   - 빈 상태
   - 로딩 상태
   - 오류 상태
   - 접근 가능한 레이블과 키보드 경로
4. API가 미완성이면 임시 mock 또는 guard를 분명히 표시한다.
5. `_workspace/03_frontend_build_notes.md`에 다음을 남긴다.
   - 변경 파일
   - 구현한 화면/컴포넌트
   - 남은 API 의존성
   - QA 포인트

## 주의

- 백엔드 계약을 바꾸고 싶으면 코드보다 계약 문서를 먼저 바꾼다.
- 디자인 문서에 없는 상호작용을 추가했다면 이유를 노트에 남긴다.
