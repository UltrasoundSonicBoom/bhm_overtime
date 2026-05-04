// onboarding.js — 9-slide horizontal carousel + temp profile + hospital email gate.
// 2026-05-03 redesign. Slides: 히어로 → 근무 → 휴가 → 시간외 → 급여 → 퇴직금 → 규정 → 개인정보 → Auth.
// 임시 프로필은 snuhmate_hr_profile_guest 에 저장되고, auth 성공 시 auth-service 가
// applyOnboardingProfile() 로 _uid_{uid} 키에 자동 승급한다.
//
// NOTE: index.astro의 <script> 블록이 auth-service.js를 Astro-bundle하여
// window.OB_AUTH / window.OB_VALIDATORS 로 노출. DOMContentLoaded 이후 'ob-auth-ready'
// 이벤트로 신호. 이 파일은 public/ static이므로 /src/ 경로를 import할 수 없음.

(function () {
  // auth 모듈이 준비되면 콜백 실행. 이미 준비된 경우 즉시 실행.
  function _whenAuthReady(cb) {
    if (window.OB_AUTH) { cb(window.OB_AUTH); return; }
    window.addEventListener('ob-auth-ready', function () { cb(window.OB_AUTH); }, { once: true });
  }
  const deck = document.getElementById("ob-deck");
  if (!deck) return;

  // ── 병원 → 이메일 도메인 매핑 ──
  const HOSPITAL_EMAIL_MAP = {
    "서울대학교병원": "snuh.org",
    "어린이병원":     "snuh.org",
    "강남센터":       "snuh.org",
    "보라매병원":     "brmh.org",
    "국립교통재활병원": "ntrh.or.kr",
  };

  function buildHospitalEmail(employeeNumber, hospital) {
    const domain = HOSPITAL_EMAIL_MAP[hospital];
    if (!domain || !employeeNumber) return "";
    return `${employeeNumber}@${domain}`;
  }

  // ── 추천 도메인 (이메일 입력 자동완성용 — 도메인 강제는 일시 해제) ──
  const HOSPITAL_DOMAINS = [
    "snuh.org",
    "brmh.org",
    "snubh.org",
    "snudh.org",
    "ntrh.or.kr",
  ];

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
      const employeeNumber = (data.get("employeeNumber") || "").toString().trim();
      const hospital = (data.get("hospital") || "").toString().trim();
      return {
        name: (data.get("name") || "").toString().trim(),
        employeeNumber,
        department: (data.get("department") || "").toString().trim(),
        jobType: (data.get("jobType") || "").toString().trim(),
        hospital,
        hospitalEmail: buildHospitalEmail(employeeNumber, hospital),
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
      if (!profile.hospital) missing.push("병원");
      if (!profile.name) missing.push("이름");
      if (!profile.employeeNumber) missing.push("사번");
      if (!profile.department) missing.push("부서");
      if (!profile.jobType) missing.push("직종");
      if (missing.length) {
        showError(`필수 항목을 입력해 주세요: ${missing.join(", ")}`);
        const firstInvalid = ["hospital", "name", "employeeNumber", "department", "jobType"]
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
  const emailPanel   = document.getElementById("obAuthEmailPanel");
  const mainBtns     = document.getElementById("obAuthMainBtns");
  const emailInput   = document.getElementById("obAuthEmail");
  const passInput    = document.getElementById("obAuthPassword");
  const authMsg      = document.getElementById("obAuthMsg");
  const authSubmit   = document.getElementById("obAuthSubmit");
  const authCancel   = document.getElementById("obAuthCancel");

  function setAuthMsg(msg, kind) {
    if (!authMsg) return;
    authMsg.textContent = msg || "";
    authMsg.className = "ob-auth-msg" + (kind === "error" ? " error" : kind === "ok" ? " ok" : "");
  }

  function openEmailPanel() {
    mainBtns?.classList.add("hidden");
    emailPanel?.classList.add("on");
    emailPanel?.setAttribute("aria-hidden", "false");
    setAuthMsg("", null);
    setTimeout(() => emailInput?.focus(), 60);
  }

  function closeEmailPanel() {
    emailPanel?.classList.remove("on");
    emailPanel?.setAttribute("aria-hidden", "true");
    mainBtns?.classList.remove("hidden");
    setAuthMsg("", null);
  }

  // 이메일 input → 도메인 자동완성
  emailInput?.addEventListener("input", () => {
    const v = emailInput.value;
    const at = v.indexOf("@");
    const local = at >= 0 ? v.slice(0, at) : v;
    setEmailOptions(local);
  });

  // 이메일 버튼 트리거 → 폼 펼침
  document.getElementById("obAuthEmailTrigger")?.addEventListener("click", openEmailPanel);

  // 돌아가기
  authCancel?.addEventListener("click", closeEmailPanel);

  // 스마트 로그인/가입: signIn 시도 → 없는 계정이면 자동 signUp + 인증 메일
  authSubmit?.addEventListener("click", async () => {
    const email = (emailInput?.value || "").trim();
    const password = passInput?.value || "";
    if (!email || !password) {
      setAuthMsg("이메일과 비밀번호를 입력해 주세요.", "error");
      return;
    }
    const mod = window.OB_AUTH;
    const validators = window.OB_VALIDATORS;
    if (!mod) { setAuthMsg("인증 모듈을 불러오는 중이에요. 잠시 후 다시 시도해 주세요.", "error"); return; }

    authSubmit.disabled = true;
    setAuthMsg("로그인 중...", null);
    try {
      // 1단계: 로그인 시도
      const user = await mod.signInWithEmail(email, password);
      if (user && !user.emailVerified) {
        try { await mod.resendVerificationEmail(); } catch {}
        setAuthMsg("이메일 인증이 필요해요. 인증 메일을 다시 보냈어요 — 메일함과 스팸함을 확인해 주세요.", "ok");
        authSubmit.disabled = false;
        return;
      }
      enterApp();
    } catch (signInErr) {
      const code = signInErr?.code || "";
      // 2단계: 로그인 실패 → 없는 계정일 가능성 → 신규 가입 시도
      if (code === "auth/invalid-credential" || code === "auth/user-not-found") {
        if (validators) {
          const pwErr = validators.validatePassword(password);
          if (pwErr) { setAuthMsg(pwErr, "error"); authSubmit.disabled = false; return; }
        }
        setAuthMsg("가입 중...", null);
        try {
          const result = await mod.signUpWithHospitalEmail(email, password);
          if (result?.verificationSent) {
            setAuthMsg("가입 완료! 📧 인증 메일을 보냈어요. 메일함(스팸함/Gmail 프로모션 탭 포함)을 확인하고 링크를 클릭하면 로그인됩니다.", "ok");
          } else {
            setAuthMsg("가입은 됐지만 인증 메일 발송에 실패했어요 — 잠시 후 다시 시도해 주세요.", "error");
          }
        } catch (signUpErr) {
          const upCode = signUpErr?.code || "";
          if (upCode === "auth/email-already-in-use") {
            setAuthMsg("이메일/비밀번호가 맞지 않아요. 비밀번호를 확인해 주세요.", "error");
          } else if (upCode === "auth/password-does-not-meet-requirements") {
            setAuthMsg("비밀번호 정책 미충족: 8~12자 + 영문자 + 숫자 + 특수문자 1개 이상 (예: Snuh1234!).", "error");
          } else {
            setAuthMsg(`오류: ${signUpErr?.message || "다시 시도해 주세요"}`, "error");
          }
        }
      } else if (code === "auth/too-many-requests") {
        setAuthMsg("잠시 후 다시 시도해 주세요.", "error");
      } else if (code === "auth/network-request-failed") {
        setAuthMsg("네트워크 오류 — 연결을 확인해 주세요.", "error");
      } else {
        setAuthMsg("로그인/가입에 실패했어요. 다시 시도해 주세요.", "error");
      }
    } finally {
      authSubmit.disabled = false;
    }
  });

  // Enter 키 제출
  [emailInput, passInput].forEach((el) => {
    el?.addEventListener("keydown", (e) => { if (e.key === "Enter") authSubmit?.click(); });
  });

  // Google / 게스트
  document.querySelectorAll('[data-action="auth-pick"]').forEach((b) => {
    b.addEventListener("click", async () => {
      const choice = b.dataset.choice || "local";
      localStorage.setItem("snuhmate_auth_preference", choice);

      if (choice === "email") { openEmailPanel(); return; }

      if (choice === "google") {
        setAuthMsg("Google 로그인 중...", null);
        try {
          const mod = window.OB_AUTH;
          if (!mod) throw new Error("auth not ready");
          await mod.signInWithGoogle();
          enterApp();
        } catch (err) {
          console.warn("[onboarding] google sign-in failed", err);
          setAuthMsg("Google 로그인 실패 — 다시 시도해 주세요.", "error");
        }
        return;
      }
      // 게스트
      localStorage.removeItem("snuhmate_onboarding_pending");
      setTimeout(enterApp, 280);
    });
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
  // OB_AUTH는 Astro 모듈 스크립트가 DOMContentLoaded 이후에 노출하므로 _whenAuthReady로 대기.
  _whenAuthReady(async function (mod) {
    if (!mod?.onAuthChanged) return;
    try {
      await mod.onAuthChanged(function (user) {
        if (!user) return;
        if (!user.emailVerified) return;
        // verified 사용자가 이 페이지에 떨어졌다 → 바로 /app 으로
        if (localStorage.getItem("snuhmate_onboarding_pending")) {
          // applyOnboardingProfile 은 auth-service 가 onAuthChanged 안에서 처리
          enterApp();
        }
      });
    } catch (e) {
      // firebase 초기화 실패는 게스트 흐름과 무관 — 무해
    }
  });

  go(0);
})();
