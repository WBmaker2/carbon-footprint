# QA Findings

작성일: 2026-05-07

## 목적

로드맵 Phase 0~5 적용 후, 릴리스 전 최소 검증 결과와 남은 위험을 기록한다.

## 검증 범위

- 문서/저장소 기준선 정리
- 선택 날짜 초기화와 전체 데이터 삭제 확인 게이트
- JSON 백업 내보내기와 가져오기
- 최근 7일 CSV 다운로드
- 저장 실패/읽기 실패 안내
- 날짜 유틸과 계산 view model 분리
- Chart.js CDN 실패 fallback

## 검증 명령

```sh
node --check data.js
node --check date-utils.js
node --check storage.js
node --check calculations.js
node --check chart.js
node --check app.js
node --check scripts/browser-smoke.mjs
node scripts/browser-smoke.mjs
git diff --check
```

## 브라우저 스모크 체크 항목

`scripts/browser-smoke.mjs`는 임시 로컬 서버와 headless Chrome/Chromium CDP를 사용한다. 테스트 서버는 Chart.js CDN script를 no-op으로 바꿔 네트워크 없이도 앱 fallback 흐름을 검증한다.

- 앱 로드
- Chart.js fallback 문구와 canvas 숨김 상태 확인
- 입력 증가 후 localStorage 저장 유지
- 새로고침 후 저장 유지
- 날짜 선택 후 과거 날짜 문구 표시
- 선택 날짜 초기화 확인 게이트
- 전체 데이터 삭제 확인 게이트
- JSON 백업 내보내기 UI 존재
- JSON 가져오기 기본 모드가 병합인지 확인
- 잘못된 JSON 가져오기 실패 시 기존 기록 유지
- 강제 저장 실패 시 저장 실패 안내 표시

## 현재 발견 사항

- 차단 이슈 없음.
- Chart.js CDN이 막힌 환경에서는 그래프 대신 fallback 문구가 표시된다. 브라우저 스모크에서 이 상태를 확인했다.
- `localStorage` 파싱 실패 시 기존 손상 데이터는 복구하지 않고 빈 안전 상태로 시작하며, 사용자에게 읽기 실패 안내를 보여준다.

## 남은 리스크

- 실제 학교망/구형 브라우저 조합은 별도 현장 확인이 필요하다.
- JSON 백업 파일은 브라우저 파일 다운로드 정책에 영향을 받을 수 있다.
- Chart.js 오프라인 정식 지원은 별도 vendor 전환 Phase가 필요하다.
