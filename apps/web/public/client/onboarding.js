// onboarding.js — 9-slide horizontal carousel + temp profile + hospital email gate.
// 2026-05-03 redesign. Slides: 히어로 → 근무 → 휴가 → 시간외 → 급여 → 퇴직금 → 규정 → 개인정보 → Auth.
// 임시 프로필은 snuhmate_hr_profile_guest 에 저장되고, auth 성공 시 auth-service 가
// applyOnboardingProfile() 로 _uid_{uid} 키에 자동 승급한다.

(function () {
  const deck = document.getElementById("ob-deck");
  if (!deck) return;

  // ── 허용 도메인 (auth-validators.js 와 동기) ─────────────
  const HOSPITAL_DOMAINS = [
    "snuh.org",
    "brmh.org",
    "snubh.org",
    "snudh.org",
    "ntrh.or.kr",
  ];
  function isHospitalEmail(email) {
    if (typeof email !== "string") return false;
    const at = email.lastIndexOf("@");
    if (at < 0) return false;
    return HOSPITAL_DOMAINS.includes(email.slice(at + 1).toLowerCase());
  }

  // ── 서울대병원 조직도 (대표 부서 — 차후 canonical 소스에서 import 권장) ──
  const SNUH_DEPARTMENTS = [
    // 진료과
    "내과", "외과", "흉부외과", "정형외과", "신경외과", "신경과",
    "정신건강의학과", "소아청소년과", "산부인과", "비뇨의학과",
    "안과", "이비인후과", "피부과", "성형외과", "재활의학과",
    "가정의학과", "응급의학과", "마취통증의학과", "방사선종양학과",
    "영상의학과", "핵의학과", "진단검사의학과", "병리과", "직업환경의학과",
    // 간호 (병동·중환자실·외래·수술실)
    "내과외래", "외과외래", "소아외래", "산부인과외래", "응급의료센터",
    "수술실", "회복실", "분만실", "중앙공급실",
    "MICU", "SICU", "CCU", "NICU", "PICU", "CMICU",
    // 지원·사무
    "의무기록과", "의공학과", "영양과", "약제부",
    "원무팀", "인사팀", "재무팀", "정보화실", "시설관리팀",
    "적정진료관리팀", "감염관리실",
    // 연구·교육
    "임상시험센터", "의학연구원", "교육수련부",
  ];

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

  function next() { go(idx + 1); }
  function prev() { go(idx - 1); }

  document.getElementById("ob-next").addEventListener("click", next);
  document.getElementById("ob-prev").addEventListener("click", prev);

  document.addEventListener("keydown", (e) => {
    // Auth 패널 입력 중에는 좌우 키로 슬라이드 안 넘어가게
    const target = e.target;
    if (target && (target.tagName === "INPUT" || target.tagName === "SELECT" || target.tagName === "TEXTAREA")) return;
    if (e.key === "ArrowRight") next();
    if (e.key === "ArrowLeft") prev();
  });

  let touchX = null;
  deck.parentElement.addEventListener(
    "touchstart",
    (e) => { touchX = e.touches[0].clientX; },
    { passive: true },
  );
  deck.parentElement.addEventListener("touchend", (e) => {
    if (touchX === null) return;
    const dx = e.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > 50) (dx < 0 ? next : prev)();
    touchX = null;
  });

  // ── 부서 datalist 시드 (베이스 옵션) ─────────────────────────
  const deptList = document.getElementById("obDeptList");
  const deptInput = document.getElementById("obDeptInput");
  function setDeptOptions(values) {
    if (!deptList) return;
    deptList.replaceChildren();
    values.forEach((v) => {
      const o = document.createElement("option");
      o.value = v;
      deptList.appendChild(o);
    });
  }
  if (deptList) setDeptOptions(SNUH_DEPARTMENTS);
  // 입력값이 숫자면 "{N}병동" 자동완성 우선 노출
  deptInput?.addEventListener("input", () => {
    const v = deptInput.value.trim();
    if (/^\d+$/.test(v)) {
      const ward = `${v}병동`;
      const merged = [ward, ...SNUH_DEPARTMENTS.filter((d) => d !== ward)];
      setDeptOptions(merged);
    } else if (!v) {
      setDeptOptions(SNUH_DEPARTMENTS);
    }
  });

  // ── 이메일 도메인 datalist 시드 + 사용자 타이핑 시 후보 갱신 ──
  const emailDomainList = document.getElementById("obAuthDomainList");
  function setEmailOptions(localPart) {
    if (!emailDomainList) return;
    emailDomainList.replaceChildren();
    const local = (localPart || "").trim();
    HOSPITAL_DOMAINS.forEach((d) => {
      const o = document.createElement("option");
      o.value = local ? `${local}@${d}` : `@${d}`;
      o.label = d;
      emailDomainList.appendChild(o);
    });
  }
  if (emailDomainList) setEmailOptions("");

  // ── 개인정보 슬라이드: grouped form 검증 + 저장 ──────────────
  const profileSlide = document.getElementById("ob-profile");
  if (profileSlide) {
    const form = profileSlide.querySelector("#obProfileForm");
    const errorEl = profileSlide.querySelector("#obProfileError");
    const nextBtn = profileSlide.querySelector('[data-action="pf-next"]');
    const backBtn = profileSlide.querySelector('[data-action="pf-back"]');

    function readForm() {
      const data = new FormData(form);
      return {
        name: (data.get("name") || "").toString().trim(),
        employeeNumber: (data.get("employeeNumber") || "").toString().trim(),
        department: (data.get("department") || "").toString().trim(),
        jobType: (data.get("jobType") || "").toString().trim(),
        hireDate: (data.get("hireDate") || "").toString().trim(),
        birthDate: (data.get("birthDate") || "").toString().trim(),
        gender: (data.get("gender") || "").toString().trim(),
      };
    }

    function showError(msg) {
      if (!errorEl) return;
      errorEl.textContent = msg || "";
    }

    nextBtn?.addEventListener("click", () => {
      const profile = readForm();
      const missing = [];
      if (!profile.name) missing.push("이름");
      if (!profile.employeeNumber) missing.push("사번");
      if (!profile.department) missing.push("부서");
      if (!profile.jobType) missing.push("직종");
      if (missing.length) {
        showError(`필수 항목을 입력해 주세요: ${missing.join(", ")}`);
        const firstInvalid = ["name", "employeeNumber", "department", "jobType"]
          .find((k) => !profile[k]);
        const el = form.querySelector(`[name="${firstInvalid}"]`);
        if (el && typeof el.focus === "function") el.focus();
        return;
      }
      showError("");
      const key = "snuhmate_hr_profile_guest";
      const existing = JSON.parse(localStorage.getItem(key) || "{}");
      const merged = Object.assign(existing, profile);
      localStorage.setItem(key, JSON.stringify(merged));
      // auth 단계에서 sign-in 성공 후 applyOnboardingProfile 가 발화하도록 플래그
      localStorage.setItem("snuhmate_onboarding_pending", "1");
      next();
    });

    backBtn?.addEventListener("click", prev);
  }

  // ── Auth 슬라이드 ─────────────────────────────────────────
  const emailPanel = document.getElementById("obAuthEmailPanel");
  const emailInput = document.getElementById("obAuthEmail");
  const passInput = document.getElementById("obAuthPassword");
  const authMsg = document.getElementById("obAuthMsg");
  const authSubmit = document.getElementById("obAuthSubmit");
  const authCancel = document.getElementById("obAuthCancel");

  const modeSignupBtn = document.getElementById("obAuthModeSignup");
  const modeSigninBtn = document.getElementById("obAuthModeSignin");
  let _signInMode = false;

  modeSignupBtn?.addEventListener("click", () => {
    _signInMode = false;
    modeSignupBtn.classList.add("active");
    modeSignupBtn.setAttribute("aria-pressed", "true");
    modeSigninBtn?.classList.remove("active");
    modeSigninBtn?.setAttribute("aria-pressed", "false");
    if (passInput) {
      passInput.placeholder = "비밀번호 (8~12자, 특수문자 포함)";
      passInput.autocomplete = "new-password";
    }
    if (authSubmit) authSubmit.textContent = "인증 메일 받기";
  });
  modeSigninBtn?.addEventListener("click", () => {
    _signInMode = true;
    modeSigninBtn.classList.add("active");
    modeSigninBtn.setAttribute("aria-pressed", "true");
    modeSignupBtn?.classList.remove("active");
    modeSignupBtn?.setAttribute("aria-pressed", "false");
    if (passInput) {
      passInput.placeholder = "비밀번호";
      passInput.autocomplete = "current-password";
    }
    if (authSubmit) authSubmit.textContent = "로그인";
  });

  // 이메일 input 타이핑 → local part 기반으로 도메인 후보 재시드
  emailInput?.addEventListener("input", () => {
    const v = emailInput.value;
    const at = v.indexOf("@");
    const local = at >= 0 ? v.slice(0, at) : v;
    setEmailOptions(local);
  });

  function setAuthMsg(msg, kind) {
    if (!authMsg) return;
    authMsg.textContent = msg || "";
    authMsg.classList.toggle("error", kind === "error");
    authMsg.classList.toggle("ok", kind === "ok");
  }
  function openEmailPanel() {
    if (!emailPanel) return;
    emailPanel.classList.add("on");
    emailPanel.setAttribute("aria-hidden", "false");
    setTimeout(() => emailInput?.focus(), 60);
  }
  function closeEmailPanel() {
    if (!emailPanel) return;
    emailPanel.classList.remove("on");
    emailPanel.setAttribute("aria-hidden", "true");
    setAuthMsg("", null);
  }

  document.querySelectorAll('[data-action="auth-pick"]').forEach((b) => {
    b.addEventListener("click", async () => {
      document
        .querySelectorAll('[data-action="auth-pick"]')
        .forEach((x) => x.classList.remove("picked"));
      b.classList.add("picked");
      const choice = b.dataset.choice || "local";
      localStorage.setItem("snuhmate_auth_preference", choice);

      if (choice === "email") {
        openEmailPanel();
        return;
      }
      if (choice === "google") {
        try {
          setAuthMsg("Google 로그인 중...", null);
          const mod = await import("/src/firebase/auth-service.js");
          await mod.signInWithGoogle();
          // applyOnboardingProfile 은 auth-service onAuthChanged 에서 자동 호출됨
          enterApp();
        } catch (err) {
          console.warn("[onboarding] google sign-in failed", err);
          setAuthMsg(`Google 로그인 실패: ${err?.message || "다시 시도해 주세요"}`, "error");
          b.classList.remove("picked");
        }
        return;
      }
      // 게스트 — 임시 프로필이 이미 _guest 키에 있음
      localStorage.removeItem("snuhmate_onboarding_pending");
      setTimeout(enterApp, 280);
    });
  });

  authCancel?.addEventListener("click", () => {
    closeEmailPanel();
    document
      .querySelectorAll('[data-action="auth-pick"]')
      .forEach((x) => x.classList.remove("picked"));
  });

  authSubmit?.addEventListener("click", async () => {
    const email = (emailInput?.value || "").trim();
    const password = passInput?.value || "";

    if (!email || !password) {
      setAuthMsg("이메일과 비밀번호를 입력해 주세요.", "error");
      return;
    }

    if (_signInMode) {
      // ── 로그인 흐름 (도메인 제약 없음 — 기가입자 누구나 로그인 가능) ──
      authSubmit.disabled = true;
      setAuthMsg("로그인 중...", null);
      try {
        const mod = await import("/src/firebase/auth-service.js");
        const cred = await mod.signInWithEmail(email, password);
        if (cred?.user && !cred.user.emailVerified) {
          try {
            await mod.resendVerificationEmail();
            setAuthMsg("아직 이메일 인증 전이에요. 인증 메일을 다시 보냈으니 메일함을 확인해 주세요.", "ok");
          } catch (e) {
            console.warn("[onboarding] resend verification failed", e?.code || e?.message);
            setAuthMsg("아직 이메일 인증 전이에요. 메일함을 확인해 주세요.", "error");
          }
          return;
        }
        enterApp();
      } catch (err) {
        console.warn("[onboarding] email sign-in failed", err);
        const code = err?.code || "";
        let msg = "로그인 실패. 이메일/비밀번호를 확인해 주세요.";
        if (code === "auth/invalid-credential") msg = "이메일/비밀번호가 맞지 않아요.";
        if (code === "auth/too-many-requests") msg = "잠시 후 다시 시도해 주세요.";
        if (code === "auth/network-request-failed") msg = "네트워크 오류. 잠시 후 다시 시도해 주세요.";
        setAuthMsg(msg, "error");
      } finally {
        authSubmit.disabled = false;
      }
      return;
    }

    // ── 신규 가입 흐름 (병원 도메인 + Firebase password policy 강제) ──
    if (!isHospitalEmail(email)) {
      setAuthMsg("병원 도메인 이메일만 가입할 수 있어요 (snuh.org, brmh.org, snubh.org, snudh.org, ntrh.or.kr).", "error");
      return;
    }
    const mod = await import("/src/firebase/auth-service.js");
    const validators = await import("/src/firebase/auth-validators.js");
    const pwErr = validators.validatePassword(password);
    if (pwErr) {
      setAuthMsg(pwErr, "error");
      return;
    }
    authSubmit.disabled = true;
    setAuthMsg("인증 메일을 보내는 중...", null);
    try {
      const result = await mod.signUpWithHospitalEmail(email, password);
      if (result?.verificationSent) {
        setAuthMsg("인증 메일을 보냈습니다. 메일함을 확인하고 인증한 뒤 이 페이지를 새로고침하면 자동으로 진입됩니다.", "ok");
      } else {
        const errMsg = result?.verificationError?.message || "잠시 후 다시 시도해 주세요";
        setAuthMsg(`계정은 만들어졌으나 인증 메일 발송에 실패했어요: ${errMsg}. "이미 가입함" 탭에서 로그인 후 재시도할 수 있어요.`, "error");
        modeSigninBtn?.click();
      }
    } catch (err) {
      console.warn("[onboarding] hospital email signup failed", err);
      let msg = `가입 실패: ${err?.message || "다시 시도해 주세요"}`;
      if (err?.code === "auth/email-already-in-use") {
        msg = '이미 가입된 이메일이에요. "이미 가입함" 탭에서 로그인해 주세요.';
        modeSigninBtn?.click();
      }
      if (err?.code === "auth/password-does-not-meet-requirements") {
        msg = '비밀번호 정책 미충족: 8~12자 + 영문자 + 숫자 + 특수문자 1개 이상 (예: Snuh1234!).';
      }
      if (err?.code === "auth/weak-password") msg = "비밀번호가 너무 약해요. 8자 이상 + 특수문자 포함.";
      if (err?.code === "auth/invalid-email") msg = "이메일 형식이 올바르지 않아요.";
      if (err?.code === "auth/network-request-failed") msg = "네트워크 오류. 잠시 후 다시 시도해 주세요.";
      setAuthMsg(msg, "error");
    } finally {
      authSubmit.disabled = false;
    }
  });

  // ── /app 진입 ─────────────────────────────────────────────
  function enterApp() {
    const frame = document.querySelector(".ob-frame");
    if (frame) {
      frame.classList.add("ob-exit");
      setTimeout(() => { window.location.href = "/app"; }, 350);
    } else {
      window.location.href = "/app";
    }
  }

  // 인증된 사용자가 다시 방문했을 때 자동 /app 으로 보내기 (signed-in + verified 인 경우)
  // onAuthChanged 가 user.emailVerified === true 를 인식하면 applyOnboardingProfile 후 진입.
  (async () => {
    try {
      const mod = await import("/src/firebase/auth-service.js");
      if (mod.onAuthChanged) {
        await mod.onAuthChanged((user) => {
          if (!user) return;
          if (!user.emailVerified) return;
          // verified 사용자가 이 페이지에 떨어졌다 → 바로 /app 으로
          if (localStorage.getItem("snuhmate_onboarding_pending")) {
            // applyOnboardingProfile 은 auth-service 가 onAuthChanged 안에서 처리
            enterApp();
          }
        });
      }
    } catch (e) {
      // firebase 초기화 실패는 게스트 흐름과 무관 — 무해
    }
  })();

  go(0);
})();
