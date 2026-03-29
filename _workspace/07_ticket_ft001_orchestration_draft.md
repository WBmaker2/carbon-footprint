# FT-001 Orchestration Draft

## 티켓 요약

첫 티켓은 현재 정적 교실 탄소 대시보드를 곧바로 전면 이식하지 않는다. 대신 다음 전환이 가능하도록 구조적 경계를 고정한다.

- 화면과 상호작용을 Next.js 페이지/컴포넌트 단위로 재정의
- 탄소 계산과 에코 상태 로직을 도메인 모듈로 분리
- 저장 계층을 인터페이스로 추상화
- 향후 서버 연결에 쓸 API 계약을 초안으로 확정

이 티켓이 끝나면 “지금은 localStorage로 계속 돌지만, 다음 티켓부터 API 저장소를 붙여도 프론트 전체를 다시 뜯지 않는 상태”가 되어야 한다.

## 리더의 즉시 로컬 작업

리더는 워커를 띄우기 전에 먼저 한다.

1. 현재 앱의 핵심 흐름을 3개로 요약한다.
   - 선택 날짜 이동
   - 항목 증감 및 저장
   - 주간 요약과 히스토리 확인
2. 현재 기능 중 절대 깨지면 안 되는 항목을 `_workspace/04_integration_notes.md` 초안에 적는다.
3. 워커 간 파일 책임을 명시한다.

## 권장 순서

1. `design-lead` 실행
2. `backend-api-builder` 실행
3. 디자인과 API 계약이 나온 뒤 `frontend-nextjs-builder` 실행
4. 프론트/백엔드 결과를 리더가 통합
5. `qa-release-reviewer` 실행
6. 리더가 티켓 종료 또는 후속 티켓 분해

## 리더용 계획 초안

```text
1. 현재 앱 흐름과 보존 범위 고정
2. UI 계약 작성
3. API 및 저장 인터페이스 계약 작성
4. Next.js 목표 구조와 프론트엔드 분해안 작성
5. 통합 위험 정리
6. QA 비교 체크리스트 작성
7. 다음 구현 티켓 분해
```

## 워커별 지시 초안

### 1. design-lead

**목표**

현재 정적 UI를 기준으로 Next.js 전환 시에도 유지해야 하는 화면 구조와 사용자 경험을 문서화한다.

**읽을 것**

- [index.html](/Volumes/DATA/Dev/Codex/carbon-footprint/index.html)
- [styles.css](/Volumes/DATA/Dev/Codex/carbon-footprint/styles.css)
- [app.js](/Volumes/DATA/Dev/Codex/carbon-footprint/app.js)
- [_workspace/00_request_snapshot.md](/Volumes/DATA/Dev/Codex/carbon-footprint/_workspace/00_request_snapshot.md)

**남길 것**

- `_workspace/01_design_brief.md`
- `_workspace/02_ui_contract.md`

**문서에 꼭 포함할 항목**

- 메인 대시보드의 섹션 분해
- 선택 날짜 패널, 입력 패널, 요약 카드, 일간 차트, 주간 요약, 히스토리 목록, 한마디 패널의 책임
- 빈 상태, 로딩 상태, 오류 상태
- 모바일/데스크톱 차이
- 학생과 교사가 이해하기 쉬운 문구 유지 규칙

### 2. backend-api-builder

**목표**

현재 `localStorage` 기반 로직을 나중에 API로 치환할 수 있도록 데이터 계약과 저장 인터페이스를 정의한다.

**읽을 것**

- [data.js](/Volumes/DATA/Dev/Codex/carbon-footprint/data.js)
- [storage.js](/Volumes/DATA/Dev/Codex/carbon-footprint/storage.js)
- [app.js](/Volumes/DATA/Dev/Codex/carbon-footprint/app.js)
- [_workspace/00_request_snapshot.md](/Volumes/DATA/Dev/Codex/carbon-footprint/_workspace/00_request_snapshot.md)

**남길 것**

- `_workspace/02_api_contract.md`
- `_workspace/03_backend_build_notes.md`

**문서에 꼭 포함할 항목**

- `GET /api/records?date=YYYY-MM-DD`
- `PUT /api/records/:date`
- `GET /api/weekly-summary?endDate=YYYY-MM-DD`
- 레코드 스키마
- 주간 요약 응답 스키마
- 입력 검증 규칙
- 저장소 인터페이스 예시
  - `getRecordByDate(dateKey)`
  - `saveRecord(dateKey, state)`
  - `getWeeklySummary(endDate)`
- 현행 `localStorage`와 차세대 API 저장소를 같은 인터페이스로 다루는 방법

### 3. frontend-nextjs-builder

**목표**

디자인과 API 계약을 바탕으로, 현재 정적 앱을 Next.js 구조로 옮길 때의 페이지/컴포넌트/모듈 분해안을 작성한다.

**읽을 것**

- `_workspace/01_design_brief.md`
- `_workspace/02_ui_contract.md`
- `_workspace/02_api_contract.md`
- [index.html](/Volumes/DATA/Dev/Codex/carbon-footprint/index.html)
- [app.js](/Volumes/DATA/Dev/Codex/carbon-footprint/app.js)

**남길 것**

- `_workspace/03_frontend_build_notes.md`

**문서에 꼭 포함할 항목**

- 목표 라우트 구조
- 페이지와 컴포넌트 분해
- 차트 래퍼 위치
- 계산 로직을 UI 밖으로 빼는 방식
- 저장소 인터페이스를 프론트에서 주입받는 방식
- 첫 구현 티켓에서 실제로 만들 최소 골격과 아직 만들지 않을 부분

### 4. qa-release-reviewer

**목표**

이 티켓이 “구현 완료”가 아니라 “구조와 계약 고정” 티켓이라는 점을 반영해, 후속 구현 전에 반드시 비교해야 할 QA 기준을 정리한다.

**읽을 것**

- `_workspace/02_ui_contract.md`
- `_workspace/02_api_contract.md`
- `_workspace/03_frontend_build_notes.md`
- `_workspace/03_backend_build_notes.md`
- [app.js](/Volumes/DATA/Dev/Codex/carbon-footprint/app.js)

**남길 것**

- `_workspace/05_qa_findings.md`
- `_workspace/06_release_checklist.md`

**문서에 꼭 포함할 항목**

- 현재 앱의 보존 대상 기능 목록
- 후속 구현에서 반드시 비교할 회귀 포인트
- 저장, 날짜 이동, 주간 요약, 에코 상태, 기록 초기화에 대한 체크 항목
- 계약 문서만으로는 아직 검증 불가능한 공백

## 리더의 통합 포인트

리더는 각 워커의 문서가 모이면 `_workspace/04_integration_notes.md`에 다음을 적는다.

- UI 계약과 API 계약 사이의 충돌
- 프론트 분해안과 백엔드 저장 인터페이스의 결합 지점
- 현재 정적 구조에서 바로 떼어낼 수 있는 로직
- 다음 실제 구현 티켓을 몇 개로 나눌지

## 권장 spawn 순서 예시

```text
1. design-lead
2. backend-api-builder
3. frontend-nextjs-builder
4. qa-release-reviewer
```

프론트엔드 워커는 디자인과 API 계약이 생기기 전에는 실행하지 않는 편이 낫다. 이 티켓의 핵심은 코드 양이 아니라 계약 품질이다.

## 예상 산출물 체크리스트

- [ ] `_workspace/01_design_brief.md`
- [ ] `_workspace/02_ui_contract.md`
- [ ] `_workspace/02_api_contract.md`
- [ ] `_workspace/03_frontend_build_notes.md`
- [ ] `_workspace/03_backend_build_notes.md`
- [ ] `_workspace/04_integration_notes.md`
- [ ] `_workspace/05_qa_findings.md`
- [ ] `_workspace/06_release_checklist.md`

## 종료 조건

이 티켓은 다음이 모두 충족되면 종료한다.

1. 현재 앱 기능을 잃지 않기 위한 UI 계약이 있다.
2. API와 저장소 인터페이스 계약이 있다.
3. Next.js 목표 구조와 파일 책임이 정리돼 있다.
4. QA가 비교할 릴리스 게이트가 있다.
5. 후속 구현 티켓으로 자연스럽게 이어질 수 있다.

## 다음 티켓 후보

이 티켓 다음에는 보통 둘 중 하나로 이어진다.

1. `FT-002`: 계산 로직과 저장 로직을 브라우저 스크립트에서 분리해 공용 모듈로 추출
2. `FT-003`: Next.js 앱 골격 생성 후 현재 대시보드 UI를 페이지/컴포넌트로 이전
