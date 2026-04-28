// Phase 6 Task 4-2: onboarding inline script extracted to public/client.
// 원본: root onboarding.html (인라인 <script>) — 동작 변경 없음.
(function(){

    // ── Reveal animation observer ──
    // Safari: snap이 빠르게 끝나도 잡히도록 threshold 낮추고 rootMargin 추가
    var observer = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) entry.target.classList.add('visible');
      });
    }, { threshold: 0.05, rootMargin: '0px 0px -5% 0px' });
    document.querySelectorAll('.reveal').forEach(function(el) { observer.observe(el); });

    // ── 다음 섹션으로 스크롤 ──
    function scrollToNextSection() {
      var sections = Array.prototype.slice.call(document.querySelectorAll('.section'));
      var scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
      var current = sections.find(function(s) {
        return s.offsetTop >= scrollTop + 10;
      });
      if (current) {
        var target = current.offsetTop;
        // Safari: window.scrollTo with behavior:'smooth' may be ignored under snap
        // Use scrollTo on documentElement as fallback
        try {
          document.documentElement.scrollTo({ top: target, behavior: 'smooth' });
        } catch(e) {
          window.scrollTo(0, target);
        }
      }
    }

    var hintDown = document.querySelector('.scroll-hint-down');
    if (hintDown) hintDown.addEventListener('click', scrollToNextSection);

    // Phase 3-A: data-action 위임 (인라인 onclick 제거)
    document.body.addEventListener('click', function (e) {
      var el = e.target.closest && e.target.closest('[data-action]');
      if (!el) return;
      if (el.dataset.action === 'scrollToBottom') {
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
      }
    });
  
})();
