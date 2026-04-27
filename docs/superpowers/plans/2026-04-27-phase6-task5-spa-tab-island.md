# Phase 6 Task 5 — 6 SPA tab → vanilla JS island

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development.

**Goal:** apps/web/src/pages/app.astro 의 6 tab placeholder → Astro vanilla JS island 컴포넌트로 분할 + tab-loader.js 폐기.

**Architecture:**
- 각 tab fragment (public/tabs/tab-*.html) → Astro `.astro` component
- Astro 자동 hydration (script in component) — 진입 시 init 함수 호출
- tab-loader.js (lazy fragment fetch) 폐기 — Astro 가 빌드 시 inline

**전제 조건**: Phase 6 Task 4 완료 (apps/web/src/pages/app.astro 골격 + apps/web/src/client/ 이전).

---

## Sub-task 5-1: HomeIsland.astro

**Files:**
- Create: `apps/web/src/components/tabs/HomeIsland.astro`
- Modify: `apps/web/src/pages/app.astro` (HomeIsland 임베드)

`HomeIsland.astro`:
```astro
---
// 기존 public/tabs/tab-home.html 컨텐츠 inline
---
<div class="tab-content" id="tab-home">
  <!-- tab-home.html 본문 -->
</div>
<script>
  import('../../client/app.js').then(() => {
    const t = document.getElementById('tab-home');
    if (t && t.classList.contains('active') && typeof window.initHomeTab === 'function') {
      window.initHomeTab();
    }
  });
</script>
```

- [ ] HomeIsland.astro 작성
- [ ] app.astro 에 임베드
- [ ] 빌드 + Playwright (`/app` 진입, 홈 탭 정상 표시) 검증
- [ ] 커밋

---

## Sub-task 5-2: ProfileIsland.astro

기존 `tab-profile.html` 컨텐츠 inline + initProfileTab 진입.

- [ ] ProfileIsland.astro
- [ ] 검증: 사용자 시나리오 (PROFILE 시드 → info 탭 클릭 → form 자동 채워짐)
- [ ] 커밋

---

## Sub-task 5-3: PayrollIsland.astro

`tab-payroll.html` (있으면) 또는 비어있으므로 placeholder + payroll 모듈 동적 import.

- [ ] 작성
- [ ] 검증: 명세서 업로드 → toast 정상
- [ ] 커밋

---

## Sub-task 5-4: OvertimeIsland.astro / LeaveIsland.astro

각 tab fragment 컨텐츠 inline + init 함수.

- [ ] 2 island 작성
- [ ] 검증
- [ ] 커밋

---

## Sub-task 5-5: ReferenceIsland.astro / SettingsIsland.astro

규정 = 기존 tab-reference.html (Phase 5-followup 결과) 그대로 inline + initRegulationFragment.

- [ ] 2 island
- [ ] 검증
- [ ] 커밋

---

## Sub-task 5-6: tab-loader.js 폐기 + app.js entry orchestrator 정리

- [ ] tab-loader.js 삭제 (Astro 가 fragment inline 으로 대체)
- [ ] app.js 의 lazy-load 코드 제거
- [ ] switchTab() = 단순 active class toggle 만 (load 코드 X)
- [ ] 회귀 가드 + Playwright 6 탭 모두 동작 검증
- [ ] 커밋
