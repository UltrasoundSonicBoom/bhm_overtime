(function () {
  const deck = document.getElementById("ob-deck");
  if (!deck) return;

  const slides = Array.from(deck.querySelectorAll(".ob-slide"));
  const total = slides.length;
  let idx = 0;

  const progress = document.getElementById("ob-progress");
  const counter = document.getElementById("ob-counter");

  function go(n) {
    idx = Math.max(0, Math.min(total - 1, n));
    deck.style.transform = `translateX(${-idx * 100}%)`;
    if (progress) progress.style.width = `${((idx + 1) / total) * 100}%`;
    if (counter) counter.textContent = `${idx + 1} / ${total}`;
    slides[idx].dispatchEvent(new CustomEvent("slide:enter"));
    slides[idx].querySelectorAll(".ob-reveal").forEach((el, i) => {
      el.style.transitionDelay = `${i * 80}ms`;
      el.classList.add("visible");
    });
  }

  function next() {
    go(idx + 1);
  }
  function prev() {
    go(idx - 1);
  }

  document.getElementById("ob-next").addEventListener("click", next);
  document.getElementById("ob-prev").addEventListener("click", prev);

  document.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") next();
    if (e.key === "ArrowLeft") prev();
  });

  let touchX = null;
  deck.parentElement.addEventListener(
    "touchstart",
    (e) => {
      touchX = e.touches[0].clientX;
    },
    { passive: true },
  );
  deck.parentElement.addEventListener("touchend", (e) => {
    if (touchX === null) return;
    const dx = e.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > 50) (dx < 0 ? next : prev)();
    touchX = null;
  });

  // ── Auth pick: save preference, advance ───────────────────
  document.querySelectorAll('[data-action="auth-pick"]').forEach((b) => {
    b.addEventListener("click", () => {
      document
        .querySelectorAll('[data-action="auth-pick"]')
        .forEach((x) => x.classList.remove("picked"));
      b.classList.add("picked");
      localStorage.setItem(
        "snuhmate_auth_preference",
        b.dataset.choice || "local",
      );
      setTimeout(next, 280);
    });
  });

  // ── Job pick: swap upload slide content, persist jobType, advance ──
  document.querySelectorAll('[data-action="job-pick"]').forEach((b) => {
    b.addEventListener("click", () => {
      const job = b.dataset.job;
      document
        .querySelectorAll('[data-action="job-pick"]')
        .forEach((x) => x.classList.remove("picked"));
      b.classList.add("picked");
      const ul = document.getElementById("ob-upload");
      if (ul) {
        ul.querySelectorAll("[data-job]").forEach((el) => {
          el.style.display = el.dataset.job === job ? "" : "none";
        });
      }
      const key = "snuhmate_hr_profile_guest";
      const profile = JSON.parse(localStorage.getItem(key) || "{}");
      profile.jobType = job === "nurse" ? "간호직" : "";
      localStorage.setItem(key, JSON.stringify(profile));
      setTimeout(next, 280);
    });
  });

  // ── Upload skip / submit ───────────────────────────────────
  document.querySelectorAll('[data-action="advance"]').forEach((b) => {
    b.addEventListener("click", next);
  });

  // ── Profile slide: fade fields one by one (사번 first) ─────
  const profileSlide = document.getElementById("ob-profile");
  if (profileSlide) {
    const fields = Array.from(profileSlide.querySelectorAll(".ob-pf-field"));
    let cursor = 0;

    function showField(i) {
      fields.forEach((f, j) => {
        f.classList.toggle("on", j === i);
        f.classList.toggle("done", j < i);
      });
      const input = fields[i]?.querySelector("input, select");
      if (input) setTimeout(() => input.focus(), 320);
      const fwdBtn = profileSlide.querySelector('[data-action="pf-next"]');
      if (fwdBtn)
        fwdBtn.textContent = i === fields.length - 1 ? "완료 →" : "다음 →";
    }

    profileSlide.addEventListener("slide:enter", () => {
      cursor = 0;
      showField(0);
    });

    profileSlide
      .querySelector('[data-action="pf-next"]')
      ?.addEventListener("click", () => {
        if (cursor < fields.length - 1) {
          cursor++;
          showField(cursor);
        } else {
          const inputs = fields.map((f) => f.querySelector("input, select"));
          const existing = JSON.parse(
            localStorage.getItem("snuhmate_hr_profile_guest") || "{}",
          );
          const profile = Object.assign(existing, {
            employeeNumber: inputs[0]?.value || "",
            hireDate: inputs[1]?.value || "",
            jobType: inputs[2]?.value || existing.jobType || "",
            grade: inputs[3]?.value || "",
          });
          localStorage.setItem(
            "snuhmate_hr_profile_guest",
            JSON.stringify(profile),
          );
          next();
        }
      });

    profileSlide
      .querySelector('[data-action="pf-back"]')
      ?.addEventListener("click", () => {
        if (cursor > 0) {
          cursor--;
          showField(cursor);
        }
      });
  }

  // ── Welcome slide animation ────────────────────────────────
  const welcomeSlide = document.getElementById("ob-welcome");
  if (welcomeSlide) {
    welcomeSlide.addEventListener("slide:enter", () => {
      const burst = welcomeSlide.querySelector(".ob-burst");
      const grid = welcomeSlide.querySelector(".ob-app-grid");
      if (burst) {
        burst.style.transition = "none";
        burst.style.transform = "scale(1.2)";
      }
      if (grid) {
        grid.style.transition = "none";
        grid.style.opacity = "0";
      }
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (burst) {
            burst.style.transition = "transform .4s ease";
            burst.style.transform = "scale(1)";
          }
          setTimeout(() => {
            if (grid) {
              grid.style.transition = "opacity .5s ease";
              grid.style.opacity = "1";
            }
          }, 400);
        });
      });
    });
  }

  // ── App start ─────────────────────────────────────────────
  document.getElementById("ob-start")?.addEventListener("click", () => {
    window.location.href = "/app";
  });

  go(0);
})();
