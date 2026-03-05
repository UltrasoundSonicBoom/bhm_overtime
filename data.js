// ============================================
// 병원 HR 종합 시스템 - 데이터 모듈
// 기준: 2026 조합원 수첩 (2025.10.23 단체협약 갱신)
// ============================================

const DATA = {
  // ── 직종 → 보수표 매핑 ──
  jobTypes: {
    '사무직': { payTable: '일반직', label: '사무직 (일반직 보수표)' },
    '보건직': { payTable: '일반직', label: '보건직 (일반직 보수표)' },
    '간호직': { payTable: '일반직', label: '간호직 (일반직 보수표)' },
    '의사직': { payTable: '일반직', label: '의사직 (일반직 보수표)' },
    '약무직': { payTable: '일반직', label: '약무직 (일반직 보수표)' },
    '의료기사직': { payTable: '일반직', label: '의료기사직 (일반직 보수표)' },
    '기능직': { payTable: '운영기능직', label: '기능직 (운영기능직 보수표)' },
    '시설직': { payTable: '운영기능직', label: '시설직 (운영기능직 보수표)' },
    '환경미화직': { payTable: '환경유지지원직', label: '환경미화직 (환경유지지원직 보수표)' },
    '지원직': { payTable: '환경유지지원직', label: '지원직 (환경유지지원직 보수표)' },
  },

  // ── 2025년 보수표 (연간, 원) ──
  payTables: {
    일반직: {
      grades: ['M3', 'M2', 'M1', 'S3', 'S2', 'S1', 'J3', 'J2', 'J1'],
      gradeLabels: {
        M3: '매니저3', M2: '매니저2', M1: '매니저1',
        S3: '시니어3', S2: '시니어2', S1: '시니어1',
        J3: '주니어3', J2: '주니어2', J1: '주니어1'
      },
      basePay: {
        M3: [54482400, 54944400, 55411200, 55874400, 56349600, 56824800, 57310800, 57796800],
        M2: [51369600, 51798000, 52226400, 52666800, 53106000, 53545200, 53996400, 54446400],
        M1: [47559600, 47956800, 48354000, 48750000, 49155600, 49562400, 49981200, 50401200],
        S3: [44073600, 44500800, 44928000, 45370800, 45814800, 46255200, 46706400, 47157600],
        S2: [40173600, 40568400, 40966800, 41361600, 41778000, 42183600, 42589200, 43008000],
        S1: [36316800, 36669600, 37030800, 37398000, 37767600, 38128800, 38505600, 38880000],
        J3: [32379600, 32697600, 33019200, 33340800, 33666000, 33988800, 34318800, 34652400],
        J2: [28262400, 28542000, 28816800, 29096400, 29390400, 29680800, 29967600, 30258000],
        J1: [25752000, 26008800, 26260800, 26516400, 26779200, 27049200, 27314400, 27583200]
      },
      abilityPay: {
        M3: 22734000, M2: 21274800, M1: 19502400,
        S3: 16208400, S2: 14558400, S1: 12908400,
        J3: 8965200, J2: 7569600, J1: 6710400
      },
      bonus: {
        M3: 2908800, M2: 2670000, M1: 2448000,
        S3: 2366400, S2: 2127600, S1: 1888800,
        J3: 1880400, J2: 1588800, J1: 1410000
      },
      familySupport: {
        M3: 15941330, M2: 14619150, M1: 13387470,
        S3: 12932980, S2: 11610790, S1: 10284680,
        J3: 10237460, J2: 8622110, J1: 7634410
      },
      autoPromotion: {
        J1: { years: 4, next: 'J2' },
        J2: { years: 7, next: 'J3' },
        J3: { years: 8, next: 'S1' }
      }
    },
    운영기능직: {
      grades: ['L3', 'L2', 'L1', 'C3', 'C2', 'C1', 'A3', 'A2', 'A1'],
      gradeLabels: {
        L3: '리더3', L2: '리더2', L1: '리더1',
        C3: '콘트리뷰터3', C2: '콘트리뷰터2', C1: '콘트리뷰터1',
        A3: '어소시에이트3', A2: '어소시에이트2', A1: '어소시에이트1'
      },
      basePay: {
        L3: [41824800, 42169200, 42511200, 42853200, 43206000, 43556400, 43914000, 44274000],
        L2: [38842800, 39156000, 39466800, 39788400, 40107600, 40424400, 40756800, 41084400],
        L1: [36064800, 36350400, 36640800, 36930000, 37227600, 37522800, 37826400, 38128800],
        C3: [33271200, 33600000, 33931200, 34266000, 34612800, 34948800, 35294400, 35640000],
        C2: [30451200, 30757200, 31063200, 31368000, 31690800, 32007600, 32319600, 32642400],
        C1: [27662400, 27936000, 28220400, 28502400, 28794000, 29074800, 29366400, 29656800],
        A3: [24810000, 25060800, 25310400, 25564800, 25825200, 26073600, 26335200, 26593200],
        A2: [21835200, 22056000, 22276800, 22495200, 22732800, 22962000, 23187600, 23421600],
        A1: [20258400, 20463600, 20665200, 20871600, 21085200, 21297600, 21508800, 21724800]
      },
      abilityPay: {
        L3: 9142800, L2: 8671200, L1: 8202000,
        C3: 7279200, C2: 6770400, C1: 6249600,
        A3: 5545200, A2: 4929600, A1: 4371600
      },
      bonus: {
        L3: 1899600, L2: 1744800, L1: 1600800,
        C3: 1546800, C2: 1392000, C1: 1237200,
        A3: 1231200, A2: 1041600, A1: 926400
      },
      familySupport: {
        L3: 10361870, L2: 9502450, L1: 8701860,
        C3: 8406440, C2: 7547010, C1: 6685040,
        A3: 6654350, A2: 5604370, A1: 4962370
      },
      autoPromotion: {
        A1: { years: 4, next: 'A2' },
        A2: { years: 7, next: 'A3' },
        A3: { years: 7, next: 'C1' }
      }
    },
    환경유지지원직: {
      grades: ['SL3', 'SL2', 'SL1', 'SC3', 'SC2', 'SC1', 'SA3', 'SA2', 'SA1'],
      gradeLabels: {
        SL3: '시니어리더3', SL2: '시니어리더2', SL1: '시니어리더1',
        SC3: '시니어콘트리뷰터3', SC2: '시니어콘트리뷰터2', SC1: '시니어콘트리뷰터1',
        SA3: '시니어어소시에이트3', SA2: '시니어어소시에이트2', SA1: '시니어어소시에이트1'
      },
      basePay: {
        SL3: [41709600, 42019200, 42328800, 42638400, 42956400, 43272000, 43596000, 43921200],
        SL2: [38683200, 38966400, 39244800, 39535200, 39824400, 40112400, 40407600, 40706400],
        SL1: [35863200, 36120000, 36381600, 36642000, 36909600, 37177200, 37452000, 37726800],
        SC3: [33208800, 33507600, 33808800, 34108800, 34419600, 34725600, 35036400, 35349600],
        SC2: [30326400, 30606000, 30880800, 31155600, 31447200, 31730400, 32014800, 32306400],
        SC1: [27470400, 27720000, 27976800, 28232400, 28494000, 28748400, 29010000, 29272800],
        SA3: [24872400, 25099200, 25326000, 25552800, 25788000, 26017200, 26250000, 26485200],
        SA2: [21777600, 21976800, 22176000, 22374000, 22590000, 22792800, 22998000, 23206800],
        SA1: [20097600, 20283600, 20469600, 20653200, 20842800, 21037200, 21228000, 21421200]
      },
      abilityPay: {
        SL3: 8229600, SL2: 7804800, SL1: 7382400,
        SC3: 6552000, SC2: 6093600, SC1: 5625600,
        SA3: 4990800, SA2: 4437600, SA1: 3934800
      },
      bonus: {
        SL3: 1710000, SL2: 1570800, SL1: 1441200,
        SC3: 1393200, SC2: 1252800, SC1: 1113600,
        SA3: 1108800, SA2: 938400, SA1: 834000
      },
      familySupport: {
        SL3: 2548900, SL2: 2411400, SL1: 2283800,
        SC3: 2236500, SC2: 2099000, SC1: 1961500,
        SA3: 1956000, SA2: 1788800, SA1: 1686500
      },
      autoPromotion: {
        SA1: { years: 4, next: 'SA2' },
        SA2: { years: 7, next: 'SA3' },
        SA3: { years: 7, next: 'SC1' }
      }
    }
  },

  // ── 수당 규정 ──
  allowances: {
    mealSubsidy: 150000,        // 급식보조비 월
    transportSubsidy: 150000,   // 교통보조비 월
    refreshBenefit: 30000,      // 리프레시지원비 월 (2026.01~)
    selfDevAllowance: 40000,    // 자기계발별정수당 월
    specialPay5: 35000,         // 별정수당5 월
    militaryService: 45000,     // 군복무수당 월 (2년 기준)
    onCallStandby: 10000,       // 온콜대기수당 일당
    onCallTransport: 50000,     // 온콜교통비 회당
    onCallCommuteHours: 2,      // 온콜 출퇴근 인정시간
    nightShiftBonus: 10000,     // 야간근무가산금 회당
    dutyAllowance: 50000,       // 일직/숙직비 일당
    overtimeUnit: 15,           // 시간외근무 계산 단위(분)
    weeklyHours: 209,           // 월 소정근로시간
    preceptorPay: 200000,       // 프리셉터 교육수당
    callCenterPay: 30000,       // 콜센터 근무수당 월

    // 시간외할증률
    overtimeRates: {
      extended: 1.5,     // 연장근무 150%
      night: 1.5,        // 야간근무 150%
      extendedNight: 2.0,// 통상근무자 연장→야간 200%
      holiday: 1.5,      // 휴일근무 150%
      holidayNight: 2.0, // 휴일야간 200%
      publicHoliday: 0.5 // 공휴일 근무 가산 50%
    }
  },

  // ── 장기근속수당 ──
  longServicePay: [
    { min: 0, max: 5, amount: 0 },
    { min: 5, max: 10, amount: 50000 },
    { min: 10, max: 15, amount: 60000 },
    { min: 15, max: 20, amount: 80000 },
    { min: 20, max: 21, amount: 100000 },
    { min: 21, max: 25, amount: 110000 },
    { min: 25, max: 99, amount: 130000 }
  ],

  // ── 가족수당 ──
  familyAllowance: {
    spouse: 40000,
    generalFamily: 20000,
    maxFamilyMembers: 5,
    child1: 30000,
    child2: 70000,
    child3Plus: 110000
  },

  // ── 근속가산율 (2016.2 이전 입사자) ──
  seniorityRates: [
    { min: 1, max: 5, rate: 0.02 },
    { min: 5, max: 10, rate: 0.05 },
    { min: 10, max: 15, rate: 0.06 },
    { min: 15, max: 20, rate: 0.07 },
    { min: 20, max: 99, rate: 0.08 }
  ],

  // ── 연차 규정 ──
  annualLeave: {
    underOneYear: 1,   // 1년 미만: 월 1일
    maxUnderOne: 11,   // 1년 미만 최대 11일
    baseLeave: 15,     // 1년 이상: 15일
    addPerTwoYears: 1, // 3년차 이상: 2년마다 1일 추가
    maxLeave: 25       // 최대 25일
  },

  // ── 휴가 유형 정의 (2026 단체협약 기준) ──
  leaveQuotas: {
    year: 2026,
    categories: [
      { id: 'legal', label: '📅 법정 휴가' },
      { id: 'health', label: '🏥 건강' },
      { id: 'education', label: '🎓 교육/연수' },
      { id: 'family', label: '👨‍👩‍👧 가족' },
      { id: 'ceremony', label: '🎉 청원/경조' },
      { id: 'maternity', label: '🤰 출산/육아' },
      { id: 'special', label: '🔷 특별' },
      { id: 'other', label: '⬜ 기타' },
    ],
    types: [
      // ── 📅 법정 휴가 ──
      { id: 'annual', label: '연차', category: 'legal', isPaid: true, quota: null, usesAnnual: true, deductType: 'none', note: '입사일 기준 동적 계산' },
      { id: 'half_am', label: '반차(오전)', category: 'legal', isPaid: true, quota: null, usesAnnual: true, deductType: 'none', halfDay: true, note: '연차에서 0.5일 차감' },
      { id: 'half_pm', label: '반차(오후)', category: 'legal', isPaid: true, quota: null, usesAnnual: true, deductType: 'none', halfDay: true, note: '연차에서 0.5일 차감' },

      // ── 🏥 건강 ──
      { id: 'sick', label: '병가', category: 'health', isPaid: false, quota: 14, usesAnnual: false, deductType: 'ordinary', note: '14일 이내 2차의료기관 진단서 인정, 15일↑ 해당과 확인', ref: '제71조, 보수규정 제7조②' },
      { id: 'checkup', label: '검진휴가', category: 'health', isPaid: true, quota: 1, usesAnnual: false, deductType: 'none', ref: '제65조' },
      { id: 'blood_donation', label: '헌혈휴가', category: 'health', isPaid: true, quota: 1, usesAnnual: false, deductType: 'none' },
      { id: 'menstrual', label: '생리휴가', category: 'health', isPaid: false, quota: 12, usesAnnual: false, deductType: 'basePay', gender: 'F', note: '월 1일, 기본급 일액 공제', ref: '제37조' },

      // ── 🎓 교육/연수 ──
      { id: 'edu_training', label: '교육연수', category: 'education', isPaid: true, quota: 3, usesAnnual: false, deductType: 'none', note: '연 3일' },
      { id: 'edu_mandatory', label: '병원필수교육', category: 'education', isPaid: true, quota: 3, usesAnnual: false, deductType: 'none', note: '연 3일 (하반기)' },
      { id: 'edu_license', label: '보수교육(방사선학회)', category: 'education', isPaid: true, quota: 1, usesAnnual: false, deductType: 'none' },
      { id: 'edu_external', label: '외부교육(방사선종사자)', category: 'education', isPaid: true, quota: 1, usesAnnual: false, deductType: 'none' },

      // ── 👨‍👩‍👧 가족 ──
      { id: 'family_care_paid', label: '가족돌봄(유급)', category: 'family', isPaid: true, quota: 2, usesAnnual: false, deductType: 'none', note: '다자녀/장애아 3일', ref: '2021단협' },
      { id: 'family_care_unpaid', label: '가족돌봄(무급)', category: 'family', isPaid: false, quota: 10, usesAnnual: false, deductType: 'ordinary', ref: '보수규정 제7조②' },

      // ── 🎉 청원/경조 ──
      {
        id: 'ceremony_marriage_self', label: '본인 결혼', category: 'ceremony', isPaid: true, quota: null, usesAnnual: false, deductType: 'none',
        ceremonyDays: 5, ceremonyPay: 300000, docs: '없음', extra: '축하화환 지급'
      },
      {
        id: 'ceremony_marriage_child', label: '자녀 결혼', category: 'ceremony', isPaid: true, quota: null, usesAnnual: false, deductType: 'none',
        ceremonyDays: 1, ceremonyPay: 100000, docs: '청첩장, 주민등록등본(가족관계증명서)', extra: '축하화환 지급'
      },
      {
        id: 'ceremony_birth', label: '본인 출산', category: 'ceremony', isPaid: true, quota: null, usesAnnual: false, deductType: 'none',
        ceremonyDays: 90, ceremonyPay: 100000, docs: '주민등록등본(가족관계증명서), 출생증명서', extra: '출산 후 45일 확보 (쌍둥이 이상: 120일/60일)', gender: 'F'
      },
      {
        id: 'ceremony_spouse_birth', label: '배우자 출산', category: 'ceremony', isPaid: true, quota: null, usesAnnual: false, deductType: 'none',
        ceremonyDays: 20, ceremonyPay: 100000, docs: '주민등록등본(가족관계증명서)', extra: '출산일로부터 120일 이내 사용 완료'
      },
      {
        id: 'ceremony_adoption', label: '입양', category: 'ceremony', isPaid: true, quota: null, usesAnnual: false, deductType: 'none',
        ceremonyDays: 20, ceremonyPay: 0, docs: '주민등록등본(가족관계증명서), 입양증명서'
      },
      {
        id: 'ceremony_death_spouse', label: '배우자 사망', category: 'ceremony', isPaid: true, quota: null, usesAnnual: false, deductType: 'none',
        ceremonyDays: 5, ceremonyPay: 1000000, docs: '주민등록등본(가족관계증명서), 사망진단서(기본증명서)'
      },
      {
        id: 'ceremony_death_parent', label: '부모(본인·배우자) 사망', category: 'ceremony', isPaid: true, quota: null, usesAnnual: false, deductType: 'none',
        ceremonyDays: 5, ceremonyPay: 300000, docs: '주민등록등본(가족관계증명서), 사망진단서(기본증명서)'
      },
      {
        id: 'ceremony_death_child', label: '자녀·배우자 사망', category: 'ceremony', isPaid: true, quota: null, usesAnnual: false, deductType: 'none',
        ceremonyDays: 3, ceremonyPay: 300000, docs: '주민등록등본(가족관계증명서), 사망진단서', extra: '자녀 배우자 사망 시 경조금 없음'
      },
      {
        id: 'ceremony_death_grandparent', label: '조부모·외조부모 사망', category: 'ceremony', isPaid: true, quota: null, usesAnnual: false, deductType: 'none',
        ceremonyDays: 3, ceremonyPay: 50000, docs: '주민등록등본(가족관계증명서), 사망진단서(기본증명서), 제적등본'
      },
      {
        id: 'ceremony_death_sibling', label: '형제·자매 사망', category: 'ceremony', isPaid: true, quota: null, usesAnnual: false, deductType: 'none',
        ceremonyDays: 3, ceremonyPay: 50000, docs: '주민등록등본(가족관계증명서), 사망진단서(기본증명서), 제적등본'
      },

      // ── 🤰 출산/육아 ──
      { id: 'maternity', label: '출산휴가(90일)', category: 'maternity', isPaid: true, quota: null, usesAnnual: false, deductType: 'none', gender: 'F', note: '90일(쌍둥이 120일), 출산 후 45일 확보', ref: '제38조' },
      { id: 'pregnancy_checkup', label: '임부 정기검진', category: 'maternity', isPaid: true, quota: null, usesAnnual: false, deductType: 'none', gender: 'F', note: '월 1일 유급', ref: '제38조④' },
      { id: 'spouse_pregnancy', label: '임신검진 동행', category: 'maternity', isPaid: true, quota: 10, usesAnnual: false, deductType: 'none', note: '배우자 임신기간 중 (2026시행)', ref: '2025.10단협' },

      // ── 🔷 특별 ──
      { id: 'special_disaster', label: '특별휴가(재해 등)', category: 'special', isPaid: true, quota: null, usesAnnual: false, deductType: 'none', note: '재해 3일, 교통차단 등', ref: '제40조' },
      { id: 'military_reserve', label: '예비군/민방위', category: 'special', isPaid: true, quota: null, usesAnnual: false, deductType: 'none', note: '해당일 유급, 야간훈련 시 익일 휴가', ref: '제42조' },
      { id: 'long_service', label: '장기재직 휴가', category: 'special', isPaid: true, quota: null, usesAnnual: false, deductType: 'none', note: '10년↑ 5일, 20년↑ 7일 (2026시행)', ref: '2025.10단협' },

      // ── ⬜ 기타 ──
      { id: 'unpaid', label: '기타 무급휴가', category: 'other', isPaid: false, quota: null, usesAnnual: false, deductType: 'ordinary' },
    ],

    // ── 유산/사산 휴가 참조표 ──
    miscarriageLeave: [
      { weeks: '11주 이내', days: 5 },
      { weeks: '12~15주', days: 10 },
      { weeks: '16~21주', days: 30 },
      { weeks: '22~27주', days: 60 },
      { weeks: '28주 이상', days: 90 },
    ],

    // ── 병가 참조 ──
    sickLeaveRef: {
      maxDays: 14,
      maxContinuous: '연 통상 2개월 초과 불가 (공무상 질병·부상은 6개월 연장 가능)',
      docRule: '14일 이내: 2차의료기관 진단서 인정 / 15일↑: 타병원 진단서는 해당과 확인',
    }
  },

  // ── 청원휴가 & 경조금 ──
  ceremonies: [
    { type: '본인 결혼', leave: 5, hospitalPay: 300000, pensionPay: '결혼축하금', coopPay: '축하선물', docs: '없음', extra: '축하화환 지급' },
    { type: '자녀 결혼', leave: 1, hospitalPay: 100000, pensionPay: '-', coopPay: '-', docs: '청첩장, 주민등록등본' },
    { type: '본인 출산', leave: '90일', hospitalPay: 100000, pensionPay: '경조비', coopPay: '첫째·둘째 10만/셋째+ 30만', docs: '주민등록등본, 출생증명서', extra: '출산 후 45일 확보, 다자녀 120일' },
    { type: '배우자 출산', leave: 20, hospitalPay: 100000, pensionPay: '-', coopPay: '-', docs: '주민등록등본', extra: '출산일로부터 120일 이내 사용, 3회 분할 가능' },
    { type: '입양', leave: 20, hospitalPay: 0, docs: '입양증명서' },
    { type: '본인 사망', leave: '-', hospitalPay: 1000000, pensionPay: '사망조위금 지급' },
    { type: '배우자 사망', leave: 5, hospitalPay: 1000000, pensionPay: '사망조위금 지급' },
    { type: '부모(본인·배우자) 사망', leave: 5, hospitalPay: 300000, pensionPay: '사망조위금 지급' },
    { type: '자녀 사망', leave: 3, hospitalPay: 300000, extra: '자녀 배우자 사망 시 경조금 없음' },
    { type: '조부모·외조부모 사망', leave: 3, hospitalPay: 50000 },
    { type: '형제·자매 사망', leave: 3, hospitalPay: 50000 }
  ],

  // ── 휴직 제도 ──
  leaveOfAbsence: [
    { type: '육아휴직', condition: '만 8세 이하 자녀', period: '최초 1년 (추가 가능)', tenure: true, pay: '1~6개월: 통상100% (상한 250만), 7~12개월: 통상80% (상한 160만)', docs: '주민등록등본' },
    { type: '6+6 육아휴직', condition: '부부 동시 육아휴직', period: '-', tenure: true, pay: '첫달 상한 250만원', docs: '주민등록등본' },
    { type: '임신휴직', condition: '임신', period: '임신기간', tenure: true, pay: '-', docs: '임신확인서' },
    { type: '요양휴직', condition: '신체·정신장애, 난임', period: '1년 이내', tenure: false, pay: '무급', docs: '진단서' },
    { type: '간병휴직', condition: '부모·배우자·자녀 질병/사고', period: '1년 이내', tenure: false, pay: '무급', docs: '주민등록등본, 진단서' },
    { type: '가족돌봄휴직', condition: '가족 질병·사고·노령', period: '연 90일', tenure: true, pay: '무급', docs: '주민등록등본, 진단서' },
    { type: '질병휴직', condition: '장기 직무 수행 불가', period: '1년 이내', tenure: false, pay: '기본급+능력급+상여금+조정급의 70%', docs: '진단서' },
    { type: '공상휴직', condition: '업무상 상병 (6개월 병가 후)', period: '1년 이내', tenure: true, pay: '기본급+능력급+상여금+조정급의 70%', docs: '-' },
    { type: '자기계발휴직', condition: '재직 5년 이상', period: '1년 (6개월 단위, 10년↑ 6개월 추가 가능)', tenure: false, pay: '무급', docs: '-' },
    { type: '국외유학휴직', condition: '8년 이상 재직', period: '3년 이내', tenure: true, pay: '무급', docs: '휴직계획서, 관련서류' },
    { type: '배우자동반휴직', condition: '배우자 해외근무/유학', period: '3년 이내', tenure: false, pay: '무급', docs: '휴직계획서, 관련서류' }
  ],

  // ── 퇴직수당 (2015.6.30 이전 입사자) ──
  severancePay: [
    { min: 20, rate: 0.60 },
    { min: 15, rate: 0.50 },
    { min: 10, rate: 0.45 },
    { min: 5, rate: 0.35 },
    { min: 1, rate: 0.10 }
  ],

  // ── 교대근무 시간표 ──
  shiftSchedule: [
    { name: '낮번(D)', start: '07:00', end: '15:30', workHours: 8, breakMin: 30 },
    { name: '초번(E)', start: '15:00', end: '23:00', workHours: 7.5, breakMin: 30 },
    { name: '밤번(N)', start: '22:30', end: '익일 07:30', workHours: 8.5, breakMin: 30 }
  ],

  // ── 진료비 감면 ──
  medicalDiscount: {
    self: { registration: 50, insurance: 50, nonInsurance: 50, nonCovered: 50, selectDoctor: 100 },
    spouse: { insurance: 50, nonInsurance: 50, nonCovered: 50 },
    family: { insurance: 50, nonInsurance: 50, nonCovered: 50 }
  },

  // ── 리프레시 지원비 사용범위 ──
  refreshCategories: [
    { category: '건강관리', items: '스포츠센터 체력단련 (골프레슨: 증빙 가능한 강습료)' },
    { category: '능력계발', items: '도서구입, 공인/사설학원, 온라인강의, 대학(원) 등록금, 공연/전시/영화 관람, 시험 응시료' }
  ],

  // ── 공제 항목 비율 (급여 시뮬레이터용) ──
  deductions: {
    nationalHealth: 0.03545,    // 건강보험료율 (근로자 부담분) 3.545%
    longTermCare: 0.1295,       // 장기요양보험료 (건강보험의 12.95%)
    nationalPension: 0.045,     // 국민연금 4.5%
    employmentInsurance: 0.009, // 고용보험 0.9%
    mealDeduction: 3000         // 식대공제 일당
  },

  // ── FAQ 데이터 (챗봇용) ──
  faq: [
    // 근로시간
    { category: '근로시간', q: '통상 근무시간은?', a: '주 40시간, 1일 8시간입니다. 통상 근무시간은 09:00~18:00(휴게 12:00~13:00)입니다.', ref: '제32조' },
    { category: '근로시간', q: '교대근무 시간표는?', a: '낮번(D) 07:00~15:30, 초번(E) 15:00~23:00, 밤번(N) 22:30~익일 07:30입니다. 각 근무 30분 휴게시간이 있습니다.', ref: '제32조' },
    { category: '근로시간', q: '주 최대 근무시간은?', a: '주 최대 52시간입니다 (소정 40시간 + 연장 12시간).', ref: '제34조' },
    { category: '근로시간', q: '시간외근무는 어떻게 계산하나요?', a: '15분 단위로 계산합니다 (2020년~). 통상임금 × 1/209 × 150%(연장) 또는 200%(야간 포함)로 산출합니다.', ref: '제47조' },

    // 온콜
    { category: '온콜', q: '온콜 대기만 하면 수당이 나오나요?', a: '네, 온콜 대기자에게 1일당 10,000원의 온콜대기수당이 지급됩니다.', ref: '별도합의 (2021.11)' },
    { category: '온콜', q: '온콜 출근하면 수당이 얼마인가요?', a: '출근 시 ①온콜대기수당 10,000원/일 + ②온콜교통비 50,000원/회 + ③시간외근무수당(실근무시간+출퇴근 2시간)이 지급됩니다.', ref: '제32조 (9)항, 별도합의' },
    { category: '온콜', q: '온콜 출퇴근 시간 인정은?', a: '온콜 근무 시 출퇴근 2시간이 근무시간으로 인정됩니다.', ref: '제32조 (9)항' },

    // 야간근무
    { category: '야간근무', q: '야간근무 기준은?', a: '월 7일 기준, 9일 초과 금지입니다. 10일 이상 야간근무 시 시간외수당으로 처리됩니다.', ref: '별도합의 (교대근로자 야간근무)' },
    { category: '야간근무', q: '야간근무가산금이란?', a: '3교대 근무자에게 야간근무수당과 별도로 야간근무 1회당 10,000원의 가산금이 지급됩니다.', ref: '별도합의 (2015.05)' },
    { category: '야간근무', q: '리커버리데이란?', a: '3교대 간호본부: 7일 이상 야간근무 시 1일, 누적 15일당 7일에 1일 부여됩니다. 미사용분은 시간외수당 대체 가능(2023.01~)합니다.', ref: '제32조, 별도합의' },
    { category: '야간근무', q: '40세 이상이면 야간근무 안 해도 되나요?', a: '40세 이상 간호부 교대근무자는 야간근무에 배치하지 않는 것이 원칙입니다. 단, 희망 시 가능합니다.', ref: '제32조 (8)항' },

    // 연차/휴가
    { category: '휴가', q: '연차가 몇 일이에요?', a: '1년 미만: 월 1일(최대 11일), 1년 이상: 15일, 3년차부터 2년마다 1일 가산(최대 25일)입니다.', ref: '제36조' },
    { category: '휴가', q: '배우자 출산휴가는?', a: '20일입니다. 출산일로부터 120일 이내 사용 완료, 3회 분할 가능합니다.', ref: '제38조' },
    { category: '휴가', q: '출산휴가는 몇 일?', a: '90일(출산 후 45일 확보)입니다. 다자녀: 120일, 미숙아: 100일입니다.', ref: '제38조' },
    { category: '휴가', q: '병가는 최대 며칠?', a: '연 통산 2개월까지입니다. 공무상 질병/부상은 6개월 연장 가능합니다.', ref: '복무규정 제30조' },
    { category: '휴가', q: '생리휴가는?', a: '월 1일(무급)입니다.', ref: '제37조' },
    { category: '휴가', q: '난임 치료 휴가는?', a: '연간 6일(최초 2일 유급)입니다.', ref: '제40조 제6호' },

    // 임금/수당
    { category: '수당', q: '급여일이 언제인가요?', a: '일반직·환경유지지원직: 당월 17일, 의사직: 25일, 단시간직: 익월 5일입니다.', ref: '제48조' },
    { category: '수당', q: '가계지원비 지급 월은?', a: '3,4,5,6,7,8,10,11,12월과 설·추석이 있는 달(총 11개월) 균등 지급됩니다.', ref: '별표' },
    { category: '수당', q: '명절지원비는 언제?', a: '설·추석이 속하는 달, 5월, 7월 총 4회 지급됩니다. 금액은 (기본급+조정급의 1/2) × 50%입니다.', ref: '별표' },
    { category: '수당', q: '가족수당은 얼마인가요?', a: '배우자 40,000원, 첫째 30,000원, 둘째 70,000원, 셋째+ 110,000원, 기타 가족 20,000원(5인 이내)입니다.', ref: '제49조' },
    { category: '수당', q: '장기근속수당은?', a: '5~10년 5만원, 10~15년 6만원, 15~20년 8만원, 20~21년 10만원, 21년+ 가산 1만원, 25년+ 가산 3만원입니다.', ref: '제50조' },
    { category: '수당', q: '교통보조비·급식보조비는?', a: '각각 월 150,000원입니다.', ref: '별표' },
    { category: '수당', q: '리프레시지원비란?', a: '월 30,000원(연 360,000원)으로, 2026.01.01부터 통상임금에 산입됩니다. 건강관리, 도서, 학원, 공연관람 등에 사용 가능합니다.', ref: '별도합의 (2024.11)' },

    // 휴직
    { category: '휴직', q: '육아휴직 급여는?', a: '1~6개월: 통상임금 100%(상한 250만원), 7~12개월: 통상임금 80%(상한 160만원)입니다. 3회 분할, 이후 연 단위 사용 가능합니다.', ref: '제37조 제2항 3호' },
    { category: '휴직', q: '자기계발 휴직 자격은?', a: '재직 5년 이상(2022년~)이면 1년 이내(6개월 단위) 사용 가능합니다. 10년 이상 재직자는 6개월 추가 가능합니다.', ref: '제37조' },
    { category: '휴직', q: '질병휴직 급여는?', a: '기준기본급 + 능력급 + 상여금 + 조정급의 70%가 지급됩니다.', ref: '제37조' },

    // 승진
    { category: '승진', q: '자동승격 연수는?', a: '일반직: J1→J2 4년, J2→J3 7년, J3→S1 8년입니다. 운영기능직: A1→A2 4년, A2→A3 7년, A3→C1 7년입니다.', ref: '보수표' },
    { category: '승진', q: '2026년부터 승진연수가 바뀌나요?', a: '2026.01.01 입사자부터 새 연수 적용: 일반직 J1·J2·J3 = 4년·7년·8년, 운영기능직/환경유지지원직 = 4년·7년·7년입니다. 2025.12.31 이전 입사자는 기존 유지됩니다.', ref: '별도합의 (2025.10)' },

    // 경조
    { category: '경조', q: '부모님 돌아가시면 지원금은?', a: '경조비 30만원 + 청원휴가 5일입니다. 사학연금 가입자는 사망조위금도 지급됩니다.', ref: '제63조' },
    { category: '경조', q: '결혼 축하금은?', a: '본인 결혼: 30만원 + 5일 휴가 + 축하화환, 자녀 결혼: 10만원 + 1일 휴가입니다.', ref: '제63조' },

    // 복지
    { category: '복지', q: '진료비 감면 혜택은?', a: '직원 본인: 보험·비보험 50%, 선택진료비 100% 감면. 배우자·부모·만25세 미만 자녀도 50% 감면됩니다. 본원·보라매·분당·치과병원 모두 가능합니다.', ref: '제67조' },
    { category: '복지', q: '어린이집 정원은?', a: '보라매병원 1동 3층, 총 44명(1세 10명, 2세 14명, 3~5세 20명)입니다. 운영시간 07:30~19:30입니다.', ref: '제62조' },
    { category: '복지', q: '복지포인트는 얼마?', a: '기본 700P + 근속 10P/년(최대 300P) + 가족포인트 + 자녀학자금 1,200P 등으로 구성됩니다. 1P = 1,000원입니다.', ref: '복리후생 안내서' }
  ]
};
