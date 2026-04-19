# Project Analysis and Fix Proposal

작성일: 2026-04-19

## 요약

현재 폴더의 `carbon-footprint` 프로젝트는 초등 환경교육용 정적 웹앱입니다. 학생이 교실의 쓰레기 수량과 전기 사용 시간을 날짜별로 기록하면, 브라우저에서 탄소 배출량, 에코 상태, 항목별 차트, 최근 7일 요약을 보여줍니다.

로컬 폴더는 Git 저장소가 아니었지만, GitHub 원격 후보를 대조한 결과 `WBmaker2/carbon-footprint`가 현재 프로젝트와 일치하는 원격으로 확인되었습니다.

## GitHub 비교 결과

- 확인 원격: https://github.com/WBmaker2/carbon-footprint
- 기본 브랜치: `main`
- 최신 커밋: `e2ec8dc7a70d94016237b62bd951dfba34ee0025`
- 최신 커밋 시각: 2026-03-29 12:06:56 KST
- 최신 커밋 메시지: `Add full-stack website harness playbook`

로컬 핵심 앱 파일은 원격 `main`과 이미 동일했습니다.

- `index.html`
- `styles.css`
- `app.js`
- `data.js`
- `storage.js`
- `chart.js`
- `MVP_SPEC.md`
- `HARNESS.md`
- `README.md`

다만 원격에는 있고 로컬에는 없던 다음 디렉터리가 있었습니다. 이 누락분은 로컬에 추가해 최신화했습니다.

- `.agents/`
- `agents/`
- `_workspace/`
- `assets/icons/.gitkeep`

최신화 직후 `diff -qr -x .git` 기준으로 로컬 폴더와 원격 클론의 파일 차이는 없었습니다. 이후 분석 결과를 남기기 위해 이 문서를 로컬에 추가했습니다.

## 프로젝트 구조 분석

- `index.html`: 화면 마크업과 CDN 로딩
- `styles.css`: 반응형 레이아웃과 시각 스타일
- `data.js`: 항목 메타데이터, 탄소 계수, 에코 상태 기준
- `storage.js`: `localStorage` 기반 저장, 마이그레이션, 상태 정규화
- `chart.js`: Chart.js 일간 막대 그래프와 주간 선 그래프 래퍼
- `app.js`: 날짜 선택, 입력 이벤트, 계산, 렌더링, 히스토리 흐름

MVP 문서는 "오늘 기록 중심"의 단순 앱을 설명하지만, 실제 구현은 날짜 선택, 최근 7일 히스토리, 주간 추이 그래프까지 포함한 확장판입니다.

## 확인한 정상 동작

- `node --check`로 `data.js`, `storage.js`, `chart.js`, `app.js` 문법 검사를 통과했습니다.
- 로컬 서버 `http://127.0.0.1:8765/`에서 `index.html`이 HTTP 200으로 응답했습니다.
- Playwright 스크린샷 기준 화면이 정상 렌더링되었습니다.
- 스모크 테스트에서 다음 흐름이 정상 동작했습니다.
  - 초기 전체 탄소 `0.29 kg` 표시
  - 플라스틱, 종이, 에어컨/온풍기 증가
  - 주간 기록 `1일` 반영
  - 새로고침 후 플라스틱 `1개`, 에어컨/온풍기 `30분` 유지
  - 브라우저 콘솔 오류 없음

## 발견 이슈

### P0. `localStorage` 쓰기 실패 시 앱 흐름이 깨질 수 있음

`storage.js`의 저장 경로는 `localStorage.setItem()`과 `removeItem()` 예외를 처리하지 않습니다. 브라우저 저장 공간이 꽉 찼거나, 사생활 보호 모드/차단 정책 때문에 쓰기가 실패하면 클릭 이벤트 중 예외가 발생할 수 있습니다.

관련 위치:

- `storage.js`: `persistDailyRecords()`
- `storage.js`: `clearAllData()`
- `app.js`: `persistSelectedState()`
- `app.js`: 전체 데이터 삭제 이벤트

수정안:

1. `persistDailyRecords()`에서 `try/catch`로 저장 실패를 잡습니다.
2. 저장 실패 시 메모리 상태는 유지하되, 호출부에 실패 여부를 돌려줍니다.
3. UI에는 "브라우저 저장소에 저장하지 못했어요. 페이지를 닫으면 기록이 사라질 수 있어요." 같은 짧은 안내를 노출합니다.
4. `clearAllData()`도 `try/catch`로 감싸고 실패 시 사용자에게 알립니다.

### P1. "오늘" 기준이 페이지 로드 시점에 고정됨

`app.js`는 로드 시점의 `today`와 `todayKey`를 상수처럼 사용합니다. 페이지를 자정 너머 오래 열어 두면 날짜 선택의 `max`, 최근 7일 목록, "오늘로 이동" 대상이 실제 오늘과 달라질 수 있습니다.

관련 위치:

- `app.js`: `const today = new Date()`
- `app.js`: `const todayKey = getDateKey(today)`
- `app.js`: `getLastNDates()`
- `app.js`: 날짜 입력 `max`

수정안:

1. `getToday()`와 `getTodayKey()` 함수를 만들고 렌더/날짜 이벤트에서 최신 값을 계산합니다.
2. `getLastNDates(count, endDate)`처럼 기준 날짜를 인자로 받도록 바꿉니다.
3. `visibilitychange`, `focus` 이벤트에서 날짜 경계가 바뀌었는지 확인해 다시 렌더링합니다.

### P1. MVP 문서와 실제 데이터 모델이 다름

MVP 문서는 전기 사용을 `electricityMinutes` 하나로 설명하지만, 구현은 `baseLightingMinutes`와 `hvacMinutes`로 분리했습니다. 이 자체는 교육적으로 더 낫지만, 문서와 코드가 어긋나 있어 후속 작업자가 마이그레이션과 계산 의미를 헷갈릴 수 있습니다.

관련 위치:

- `MVP_SPEC.md`: `electricityMinutes`
- `data.js`: `baseLightingMinutes`, `hvacMinutes`
- `storage.js`: legacy electricity migration

수정안:

1. `MVP_SPEC.md` 또는 별도 변경 이력 문서에 v3 데이터 모델을 명시합니다.
2. `electricityMinutes`는 legacy 필드임을 문서화합니다.
3. 기본 조명은 기준 배출량, 에어컨/온풍기는 학생 실천 배출량이라는 계산 원칙을 문서와 UI 용어에 맞춥니다.

### P2. `innerHTML` 기반 렌더링이 확장 시 위험해질 수 있음

현재 `innerHTML`에 들어가는 값은 대부분 코드에서 고정한 문자열이라 즉시 취약점으로 보기는 어렵습니다. 다만 나중에 사용자 입력, 외부 데이터, 번역 데이터가 섞이면 XSS 또는 마크업 깨짐 위험이 생깁니다.

관련 위치:

- `app.js`: `createControlCard()`
- `app.js`: `renderHistory()`

수정안:

1. DOM 생성 헬퍼를 만들어 `textContent` 중심으로 렌더링합니다.
2. 히스토리 항목은 `createHistoryItem(entry)` 함수로 분리합니다.
3. 외부 입력 가능성이 있는 값은 절대 `innerHTML` 문자열에 넣지 않는 규칙을 문서화합니다.

### P2. Chart.js CDN 의존성

Chart.js가 CDN에서 로드되지 않으면 fallback 문구는 보이지만 그래프는 제공되지 않습니다. 학교망이나 오프라인 수업 환경에서는 CDN 접근이 제한될 가능성이 있습니다.

관련 위치:

- `index.html`: Chart.js CDN script
- `app.js`: `initCharts()`

수정안:

1. 오프라인 지원이 목표라면 Chart.js를 로컬 vendor 파일로 포함합니다.
2. 네트워크 의존을 허용한다면 README에 "인터넷 연결 필요"를 명시합니다.
3. 장기적으로는 빌드 도구를 도입할 때 Chart.js를 패키지 의존성으로 관리합니다.

## 권장 작업 순서

1. `localStorage` 예외 처리와 저장 실패 UI 추가
2. 오늘 기준 동적 계산으로 자정 경계 문제 해결
3. 데이터 모델 문서 최신화
4. `innerHTML` 렌더링을 DOM 헬퍼로 점진 교체
5. Chart.js CDN 정책 결정

## 2026-04-19 진행 내역

- `storage.js`에 저장 실패 상태 추적을 추가하고, `localStorage.setItem()` / `removeItem()` 실패가 앱 클릭 흐름을 중단하지 않도록 처리했다.
- `index.html`과 `styles.css`에 저장 실패 안내 영역을 추가했다.
- `app.js`의 오늘 날짜와 최근 7일 기준을 렌더링/이벤트 시점에 다시 계산하도록 바꾸고, `focus`와 `visibilitychange`에서 날짜 경계를 갱신하도록 했다.
- 입력 카드와 히스토리 목록 렌더링을 `innerHTML` 문자열 조립 대신 DOM 생성과 `textContent` 기반으로 정리했다.
- `README.md`와 `MVP_SPEC.md`에 현재 데이터 모델, 레거시 전기 필드, Chart.js CDN 정책을 반영했다.

## 후속 티켓 제안

- `FIX-001`: 저장 실패 복원력 추가
- `FIX-002`: 날짜 기준 동적 갱신
- `DOC-001`: v3 데이터 모델과 legacy migration 문서화
- `REF-001`: 렌더링 헬퍼 도입
- `OPS-001`: Chart.js CDN/로컬 번들 정책 결정
