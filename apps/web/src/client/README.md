# apps/web/src/client/

Phase 6 Task 4 결과: 24개 Layer 3+/UI 모듈. 모두 @snuhmate/* packages 에서 import.

## Task 5/6 cleanup
- apps/web/public/client/ 의 temporary scaffold 파일들 (regulation.js, retirement.js, ...) 정리 — Task 5 island 분할 시 src/client/ 으로 통합
- shared-utils.js 중복 (public/client/shared-utils.js 과 packages/shared-utils 양쪽) — Task 5 후 public/ 버전 삭제 검토 (단 dashboard/schedule_suite 가 사용 중이면 보존)

## 다음 단계 (Task 5)
- 각 tab fragment (public/tabs/tab-*.html) → apps/web/src/components/tabs/*Island.astro
- tab-loader.js 폐기 (Astro 가 fragment inline)
