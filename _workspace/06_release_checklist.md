# Release Checklist

작성일: 2026-05-07

## 공개 URL

- https://wbmaker2.github.io/carbon-footprint/

## 릴리스 전 필수 체크

- [ ] `node --check data.js`
- [ ] `node --check date-utils.js`
- [ ] `node --check storage.js`
- [ ] `node --check calculations.js`
- [ ] `node --check chart.js`
- [ ] `node --check app.js`
- [ ] `node --check scripts/browser-smoke.mjs`
- [ ] `node scripts/browser-smoke.mjs`
- [ ] `git diff --check`
- [ ] 변경 파일 diff 검토
- [ ] 공개 URL에서 배포 반영 확인

## 수동 확인 권장 항목

- [ ] 모바일 폭에서 백업/가져오기 버튼이 겹치지 않는다.
- [ ] 과거 날짜 선택 시 "오늘" 문구가 남지 않는다.
- [ ] 선택 날짜 초기화와 전체 데이터 삭제의 확인 문구가 삭제 범위를 분명히 말한다.
- [ ] 잘못된 JSON을 가져와도 기존 기록이 유지된다.
- [ ] Chart.js CDN 차단 시 그래프 fallback 문구가 표시된다.

## 커밋/푸시 후 보고 템플릿

```text
커밋/푸시 완료했습니다.

- 브랜치: <branch>
- 커밋: <sha> <message>
- PR: <url 또는 없음>
- 배포 URL: https://wbmaker2.github.io/carbon-footprint/
- 배포 확인: <GitHub Pages/Vercel/공개 페이지 확인 결과>
- 검증: <node --check / browser smoke / 공개 URL 확인 요약>
```

## 배포 메모

현재 공개 배포는 GitHub Pages 공개 URL 기준으로 확인한다. 이 작업 브랜치의 변경 사항은 `main`에 병합된 뒤 공개 URL에 반영된다.

