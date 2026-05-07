# carbon-footprint

초등 환경교육용 정적 웹앱입니다. 교실에서 발생한 쓰레기와 전기 사용 기록을 날짜별로 입력하고, 탄소 배출량·에코 상태·최근 7일 추이를 브라우저에서 바로 확인합니다.

## 공개 URL

https://wbmaker2.github.io/carbon-footprint/

## 브랜치/배포 기준

- 현재 작업 브랜치: `fix/resilience-docs`
- 배포 기준: `main` 브랜치 기준으로 공개 URL에 반영되는 방식
- 기능 문서 정합성 및 실험은 작업 브랜치에서 먼저 업데이트한 뒤, 리뷰/병합 후 `main`으로 반영하는 방식으로 관리합니다.

## 실행 방법

별도 빌드 없이 정적 파일로 실행할 수 있습니다.

```sh
python3 -m http.server 8765
```

브라우저에서 `http://127.0.0.1:8765/`을 엽니다.

## 현재 데이터 모델

현재 구현은 MVP 초안의 `electricityMinutes` 단일 필드를 다음 두 항목으로 나누어 사용합니다.

- `baseLightingMinutes`: 기본 조명 사용 시간입니다. 기본값은 360분이며 전체 탄소에는 포함하지만 학생 실천 수량과 에코 상태 계산에서는 제외합니다.
- `hvacMinutes`: 에어컨/온풍기 사용 시간입니다. 학생이 조절할 수 있는 실천 항목으로 보고 에코 상태 계산에 포함합니다.

이전 저장 데이터의 `electricityMinutes`와 `extraElectricityMinutes`는 `storage.js`에서 현재 모델로 마이그레이션합니다.

## 저장 방식

기록은 브라우저 `localStorage`에 저장합니다. 새로고침 후에도 가능한 한 유지되지만, 브라우저가 저장소를 허용하지 않으면 저장이 실패할 수 있습니다.

저장/파싱 실패가 발생하면 앱은 화면 상태를 유지하되 저장 실패 상태를 표시해 안내합니다.

- 저장 동작은 `ok / records / error` 결과 계약으로 통일되어 있고, 실패 시 `error` 내용이 화면의 "저장 상태"에 노출됩니다.
- 저장 데이터 JSON이 손상되어 파싱에 실패하면 빈 상태로 시작하되, "기록이 없어서 조용히 시작"이 아니라 "복구 안내 메시지"를 보여줍니다.

## 백업/가져오기(Phase 2)

교사용 기록 보존을 위해 다음 기능을 제공합니다.

- 전체 기록 JSON 내보내기
  - 버튼: `JSON 백업 내보내기`
  - 파일명 예시: `carbon-footprint-backup-YYYY-MM-DD.json`
- JSON 가져오기
  - 버튼: `JSON 가져오기`
  - 가져오기 모드는 `병합(기본)`과 `교체`를 라디오로 선택
  - 잘못된 형식/비어 있는 파일은 로드하지 않고 상태 메시지로 실패를 알립니다.
- 최근 7일 요약 CSV 다운로드
  - 버튼: `최근 7일 요약 CSV`
  - 파일명 예시: `carbon-footprint-7day-summary-YYYY-MM-DD.csv`

백업/복원 동작과 CSV 추출 결과는 화면 하단 상태 메시지에서 즉시 안내됩니다.

## 앱 구조

정적 앱 호환성을 유지하기 위해 빌드 도구와 ES module 전환은 이번 Phase 4에서 보류했습니다. 대신 전역 스크립트 패턴을 유지하되 역할을 다음처럼 나누었습니다.

- `date-utils.js`: 로컬 날짜 키(`YYYY-MM-DD`) 생성과 날짜 키 파싱/검증을 담당합니다.
- `calculations.js`: 탄소 계산, 학생 실천 수량, 에코 상태, 선택 날짜/최근 7일 요약 view model 생성을 담당합니다.
- `app.js`: DOM 렌더링, 이벤트 바인딩, 저장/백업 오케스트레이션을 담당합니다.

`index.html`의 스크립트 로드 순서는 Chart.js CDN을 먼저 시도한 뒤, 로컬 스크립트를 `date-utils.js` → `data.js` → `calculations.js` → `storage.js` → `chart.js` → `app.js` 순서로 불러옵니다.

## 차트 의존성

이번 Phase 4의 결정은 `Chart.js` CDN 유지입니다. 현재 앱은 별도 빌드 없이 HTML 파일과 정적 스크립트만으로 배포되는 구조라, 로컬 vendor로 옮기면 파일 관리와 라이선스/업데이트 확인 범위가 늘어납니다.

학교망 등 네트워크 제한 환경에서는 CDN 접근이 안 될 수 있으므로, 앱은 `window.Chart`가 없으면 그래프 캔버스를 숨기고 안내 메시지를 표시하는 fallback을 유지합니다. 오프라인 수업까지 정식 지원해야 하는 단계에서는 Chart.js를 로컬 vendor 파일로 고정하는 작업을 별도 Phase로 진행합니다.

## 검증과 릴리스 게이트

릴리스 전 최소 검증은 다음 순서로 실행합니다.

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

`scripts/browser-smoke.mjs`는 임시 로컬 서버와 headless Chrome/Chromium CDP를 사용해 입력 저장, 날짜 선택, 삭제 확인 게이트, JSON 가져오기 실패 보존, 저장 실패 안내를 확인합니다. 커밋/푸시 후 작업 보고에는 항상 배포 URL `https://wbmaker2.github.io/carbon-footprint/`와 공개 페이지 확인 결과를 포함합니다.
