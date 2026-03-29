# Ticket FT-001 Request Snapshot

## 티켓명

정적 교실 탄소 대시보드를 Next.js + API 확장 가능 구조로 옮기기 위한 첫 경계 분리 티켓

## 현재 상태

- 앱은 [index.html](/Volumes/DATA/Dev/Codex/carbon-footprint/index.html), [app.js](/Volumes/DATA/Dev/Codex/carbon-footprint/app.js), [data.js](/Volumes/DATA/Dev/Codex/carbon-footprint/data.js), [storage.js](/Volumes/DATA/Dev/Codex/carbon-footprint/storage.js), [chart.js](/Volumes/DATA/Dev/Codex/carbon-footprint/chart.js), [styles.css](/Volumes/DATA/Dev/Codex/carbon-footprint/styles.css) 기반의 정적 웹앱이다.
- 기록 저장은 브라우저 `localStorage`에 직접 의존한다.
- 화면, 계산 규칙, 저장 로직이 브라우저 스크립트 레벨에서 강하게 연결돼 있다.
- 일별 기록, 최근 7일 요약, 날짜별 수정, 에코 상태 계산은 이미 동작한다.

## 이 티켓의 목표

1. 현재 기능을 유지한 채 UI, 도메인 계산, 저장 계층의 경계를 분리한다.
2. 나중에 `localStorage` 대신 API와 데이터베이스로 교체할 수 있는 계약을 먼저 고정한다.
3. Next.js 전환 시 필요한 라우트, 컴포넌트, API surface를 문서와 최소 골격 수준에서 정의한다.
4. 첫 티켓에서는 “완전한 서버 이전”이 아니라 “전환 가능한 구조와 계약 확보”를 끝낸다.

## 이 티켓의 비범위

- 실제 사용자 로그인
- 반/학급 단위 멀티 사용자 저장
- 데이터베이스 연결
- 교사 대시보드 별도 구축
- 디자인 전면 리브랜딩
- 프로덕션 배포 전환

## 핵심 성공 기준

- 현재 앱의 사용자 흐름을 보존한 UI 계약 문서가 있다.
- `기록 조회`, `기록 저장`, `주간 요약 조회`에 대한 API 계약 초안이 있다.
- `localStorage`를 직접 부르지 않고도 동작할 수 있는 저장 인터페이스 초안이 있다.
- Next.js로 옮길 때의 목표 파일 구조와 책임 분리가 정리돼 있다.
- QA가 “현재 기능 보존 여부”를 비교할 체크리스트를 만들 수 있다.

## 권장 목표 구조

```text
app/
├── page.tsx
└── api/
    ├── records/
    │   └── route.ts
    └── weekly-summary/
        └── route.ts

components/
├── dashboard/
├── history/
└── charts/

lib/
├── carbon/
│   ├── config.ts
│   ├── calculations.ts
│   └── formatters.ts
└── storage/
    ├── record-repository.ts
    ├── local-storage-repository.ts
    └── api-record-repository.ts
```

## 역할별 파일 책임

- `design-lead`
  - `_workspace/01_design_brief.md`
  - `_workspace/02_ui_contract.md`
- `backend-api-builder`
  - `_workspace/02_api_contract.md`
  - 저장 인터페이스 초안
- `frontend-nextjs-builder`
  - 목표 컴포넌트/라우트 구조
  - `_workspace/03_frontend_build_notes.md`
- `qa-release-reviewer`
  - `_workspace/05_qa_findings.md`
  - `_workspace/06_release_checklist.md`
- `web-tech-lead`
  - `_workspace/04_integration_notes.md`
  - 티켓 완료 판단

## 우선순위

1. 계약과 경계 분리
2. 기능 보존
3. Next.js 전환 골격
4. 후속 백엔드 확장 준비
