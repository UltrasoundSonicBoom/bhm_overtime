// job-templates.js — 부서×직종×레벨 JD/JR 시드 (Phase 4)
// SNUH 조직도/직급체계 기반. 운영팀이 추가 가능한 단순 JSON 구조.
// 레벨 추정: 1~4년차=junior, 5~12년차=senior, 13년+ = lead
// Phase 5: cross-module 명시 named import (IIFE 안에서 사용)
import { PROFILE } from './profile.js';

(function (global) {
  'use strict';

  // ── 시드 데이터 ────────────────────────────────────────────
  var TEMPLATES = [
    // ━━━━━ 영상의학과 ━━━━━
    { department: '영상의학과', jobType: '방사선사', level: 'junior', responsibilities: [
      '일반 X-ray, CT, MRI 검사 진행 보조',
      'PACS 영상 전송 및 환자 정보 확인',
      '검사실 안전 점검 및 조영제 준비',
      '방사선 안전관리 기본 절차 준수'
    ]},
    { department: '영상의학과', jobType: '방사선사', level: 'senior', responsibilities: [
      'CT/MRI 검사 단독 운영 및 프로토콜 조정',
      '신규 입사자 OJT 및 검사 표준화 교육',
      '장비 QA/QC 수행 및 정도관리',
      '조영제 부작용 대응 및 응급 상황 협진'
    ]},
    { department: '영상의학과', jobType: '방사선사', level: 'lead', responsibilities: [
      '검사실 운영 책임 (인력/장비/일정)',
      '신규 검사 도입 및 SOP 작성 주관',
      'JCI/의료기관평가 인증 대응',
      '연구 협력 및 학회 발표·논문 작성'
    ]},
    { department: '영상의학과', jobType: '간호직', level: 'senior', responsibilities: [
      '조영제 정맥주사 및 환자 모니터링',
      '검사 전 환자 교육 및 동의서 확인',
      '응급 부작용 대응 (아나필락시스 등)'
    ]},

    // ━━━━━ 핵의학과 ━━━━━
    { department: '핵의학과', jobType: '방사선사', level: 'junior', responsibilities: [
      'PET-CT, SPECT, 감마카메라 검사 진행',
      '방사성의약품 수령·분주 보조',
      '환자 안내 및 검사 전후 교육',
      '방사선 안전관리 기본 절차 준수'
    ]},
    { department: '핵의학과', jobType: '방사선사', level: 'senior', responsibilities: [
      'PET-CT 단독 운영 및 영상 재구성',
      '방사성의약품 합성·QC 관리 (FDG 등)',
      '갑상선 치료, Y-90 치료 협진',
      '신규 입사자 교육 및 검사 매뉴얼 관리'
    ]},
    { department: '핵의학과', jobType: '방사선사', level: 'lead', responsibilities: [
      '핵의학과 검사실 운영 총괄',
      '방사선안전관리자 업무 (RSO 보조)',
      '신규 검사·치료 도입 및 SOP 제정',
      'JCI 인증·국제 학회 활동 (SNM, EANM 등)'
    ]},
    { department: '핵의학과', jobType: '간호직', level: 'senior', responsibilities: [
      '방사성의약품 투여 및 환자 모니터링',
      '갑상선 치료 환자 격리 병실 관리',
      '환자/보호자 방사선 안전 교육'
    ]},

    // ━━━━━ 간호본부 — 외래 ━━━━━
    { department: '외래간호', jobType: '간호직', level: 'junior', responsibilities: [
      '외래 환자 접수·문진 및 활력징후 측정',
      '의사 진료 보조 및 처치 수행',
      '검사·시술 안내 및 환자 교육',
      '간호기록 작성 (EMR)'
    ]},
    { department: '외래간호', jobType: '간호직', level: 'senior', responsibilities: [
      '특수 클리닉 단독 운영 (전담간호사 역할)',
      '신규 간호사 프리셉터십',
      '환자 케이스 매니지먼트 및 다학제 협진',
      '외래 운영 개선 및 표준화'
    ]},
    { department: '외래간호', jobType: '간호직', level: 'lead', responsibilities: [
      '외래 파트장/수간호사 — 인력·운영 총괄',
      'QPS 지표 모니터링 및 개선 활동',
      '신규 외래 클리닉 개설 기획',
      '간호 교육·연구 활동 주관'
    ]},

    // ━━━━━ 간호본부 — 병동 (내과/외과) ━━━━━
    { department: '내과병동', jobType: '간호직', level: 'junior', responsibilities: [
      '입원 환자 활력징후·투약·처치',
      '간호기록 및 인계 (3교대)',
      '환자/보호자 교육 및 퇴원계획',
      '응급 상황 1차 대응 (CPR 포함)'
    ]},
    { department: '내과병동', jobType: '간호직', level: 'senior', responsibilities: [
      '중환자/복합 케이스 단독 케어',
      '신규 간호사 프리셉터 및 OJT',
      '간호의 질 향상(QI) 활동',
      '교대 책임자 역할 (Charge Nurse)'
    ]},
    { department: '외과병동', jobType: '간호직', level: 'junior', responsibilities: [
      '수술 전후 환자 케어 및 통증 관리',
      '드레싱·튜브 관리 및 합병증 모니터링',
      '간호기록 및 인계 (3교대)',
      '환자 조기 이동·재활 지원'
    ]},
    { department: '외과병동', jobType: '간호직', level: 'senior', responsibilities: [
      '수술 후 고위험 환자 단독 케어',
      '신규 간호사 교육 및 술기 평가',
      '다학제 회진 참여 및 케이스 발표',
      '교대 책임자 역할 (Charge Nurse)'
    ]},

    // ━━━━━ 신경과 ━━━━━
    { department: '신경과', jobType: '간호직', level: 'junior', responsibilities: [
      '뇌졸중·간질 환자 신경학적 사정',
      'EEG/EMG 검사 보조',
      'tPA 투약 환자 모니터링',
      '환자/보호자 교육'
    ]},
    { department: '신경과', jobType: '간호직', level: 'senior', responsibilities: [
      '뇌졸중 집중치료실(SCU) 단독 케어',
      '신경계 응급 상황 대응 및 다학제 협진',
      '신경계 전담간호사 역할',
      '신규 간호사 교육 및 케이스 컨퍼런스'
    ]},
    { department: '신경과', jobType: '의사직', level: 'junior', responsibilities: [
      '병동·외래 진료 (전공의)',
      '신경계 검사 판독 및 처방',
      '응급 콜 대응 (뇌졸중 등)',
      '학회 참석 및 케이스 발표'
    ]},
    { department: '신경과', jobType: '의사직', level: 'senior', responsibilities: [
      '특수 클리닉 진료 (조교수~부교수)',
      '전공의·전임의 교육 지도',
      '연구 과제 수행 및 논문 작성',
      '다학제 협진 및 대외 학술 활동'
    ]},

    // ━━━━━ 정형외과 ━━━━━
    { department: '정형외과', jobType: '간호직', level: 'junior', responsibilities: [
      '수술 전후 환자 통증 관리',
      '석고붕대·견인 관리',
      '재활 운동 교육 및 보조',
      '간호기록 및 인계'
    ]},
    { department: '정형외과', jobType: '간호직', level: 'senior', responsibilities: [
      '관절치환술 등 고난도 수술 환자 케어',
      '수술실/병동 코디네이션',
      '신규 간호사 교육',
      '다학제 회진 참여'
    ]},
    { department: '정형외과', jobType: '의사직', level: 'junior', responsibilities: [
      '병동·외래 진료 (전공의)',
      '수술 보조 (1st/2nd assist)',
      '응급실 정형외과 콜 대응',
      '케이스 발표 및 학회 참석'
    ]},
    { department: '정형외과', jobType: '의사직', level: 'senior', responsibilities: [
      '주치의 역할 및 수술 집도 (전임의~조교수)',
      '전공의 수술 지도',
      '연구 및 신술기 도입',
      '다학제 협진 및 학회 활동'
    ]},

    // ━━━━━ 사무직 — 인사 ━━━━━
    { department: '인사과', jobType: '사무직', level: 'junior', responsibilities: [
      '직원 채용·발령·퇴직 행정 처리',
      '인사 관련 증명서 발급 및 기록 관리',
      '근태/휴가/연차 관리 시스템 운영',
      '인사위원회 회의 자료 준비'
    ]},
    { department: '인사과', jobType: '사무직', level: 'senior', responsibilities: [
      '인사 제도 기획 및 개정 (보수규정·복무규정)',
      '인력 운영 계획 수립 및 부서 협의',
      '노사 협의 지원 및 단체협약 실무',
      '신규 정책 도입 및 직원 교육'
    ]},

    // ━━━━━ 사무직 — 총무 ━━━━━
    { department: '총무과', jobType: '사무직', level: 'junior', responsibilities: [
      '문서 수발신·기록 관리',
      '회의·행사 운영 지원',
      '비품·소모품 구매 및 재고 관리',
      '대외 공문 처리 및 민원 응대'
    ]},
    { department: '총무과', jobType: '사무직', level: 'senior', responsibilities: [
      '병원 행사 기획·운영 총괄',
      '대외기관 협력·MOU 실무',
      '내부 규정·매뉴얼 관리',
      '예산 편성 및 집행 관리'
    ]},

    // ━━━━━ 사무직 — 시설 ━━━━━
    { department: '시설관리', jobType: '기술직', level: 'junior', responsibilities: [
      '병원 건축물·전기·기계 일상 점검',
      '시설 고장 접수 및 1차 대응',
      '협력업체 작업 입회 및 안전 관리',
      '시설 대장 관리'
    ]},
    { department: '시설관리', jobType: '기술직', level: 'senior', responsibilities: [
      '시설 유지보수 계획 수립 및 예산 관리',
      '신축·리모델링 공사 관리·감독',
      '소방·전기·승강기 안전관리자 업무',
      '에너지 효율 개선 사업 추진'
    ]},

    // ━━━━━ 사무직 — 교육 ━━━━━
    { department: '교육수련부', jobType: '사무직', level: 'junior', responsibilities: [
      '직원 교육 일정·강사 섭외 및 운영 지원',
      '교육 출석·평가·이수 관리',
      '전공의 수련 행정 지원',
      '교육 자료 정리 및 LMS 관리'
    ]},
    { department: '교육수련부', jobType: '사무직', level: 'senior', responsibilities: [
      '연간 교육 계획 수립 및 예산 운영',
      '전공의 모집·평가·자격시험 행정 총괄',
      '병원 교육 인증(JCI 등) 대응',
      '교육 효과 분석 및 제도 개선'
    ]},

    // ━━━━━ 의사직 — 내과 ━━━━━
    { department: '내과', jobType: '의사직', level: 'junior', responsibilities: [
      '병동/외래 환자 진료 (전공의)',
      '검사 처방 및 결과 해석',
      '응급 콜 대응 및 협진 의뢰',
      '케이스 발표 및 회진 참여'
    ]},
    { department: '내과', jobType: '의사직', level: 'senior', responsibilities: [
      '세부 전문 분과 진료 (조교수~부교수)',
      '전공의·전임의 교육 및 회진 지도',
      '연구 과제·논문 작성',
      '다학제 협진 및 학회 활동'
    ]},

    // ━━━━━ 의사직 — 외과 ━━━━━
    { department: '외과', jobType: '의사직', level: 'junior', responsibilities: [
      '수술 보조 (1st/2nd assist)',
      '병동/외래 환자 관리 (전공의)',
      '응급 콜 대응',
      '케이스 발표 및 학회 참석'
    ]},
    { department: '외과', jobType: '의사직', level: 'senior', responsibilities: [
      '수술 집도 (전임의~조교수)',
      '전공의 수술 지도',
      '신술기 도입 및 임상 연구',
      '다학제 협진 및 학회 활동'
    ]},

    // ━━━━━ 의사직 — 마취통증의학과 ━━━━━
    { department: '마취통증의학과', jobType: '의사직', level: 'junior', responsibilities: [
      '수술실 마취 관리 (전공의)',
      '회복실 환자 모니터링',
      '통증 클리닉 협진 보조',
      '케이스 발표'
    ]},
    { department: '마취통증의학과', jobType: '의사직', level: 'senior', responsibilities: [
      '고난도 수술 마취 단독 시행',
      '통증 클리닉 진료 (시술 포함)',
      '전공의 교육 및 연구',
      '응급 마취 콜 대응'
    ]}
  ];

  // ── 레벨 추정 (입사년수 기반) ─────────────────────────────
  function estimateLevel(serviceYears) {
    if (serviceYears == null || isNaN(serviceYears)) return 'junior';
    if (serviceYears < 5) return 'junior';
    if (serviceYears < 13) return 'senior';
    return 'lead';
  }

  // ── 매칭 (department + jobType + level) ────────────────────
  function findTemplate(department, jobType, level) {
    if (!department || !jobType) return null;
    var dept = String(department).trim();
    var job = String(jobType).trim();
    // 정확한 매치 우선
    var exact = TEMPLATES.find(function (t) {
      return t.department === dept && t.jobType === job && t.level === level;
    });
    if (exact) return exact;
    // 같은 부서+직종에서 다른 레벨 찾기 (가장 가까운 레벨)
    var sameDeptJob = TEMPLATES.filter(function (t) {
      return t.department === dept && t.jobType === job;
    });
    if (sameDeptJob.length) {
      var order = ['junior', 'senior', 'lead'];
      var targetIdx = order.indexOf(level);
      sameDeptJob.sort(function (a, b) {
        return Math.abs(order.indexOf(a.level) - targetIdx) - Math.abs(order.indexOf(b.level) - targetIdx);
      });
      return sameDeptJob[0];
    }
    return null;
  }

  // ── 책임 문구 → 줄바꿈 텍스트 ──────────────────────────────
  function formatResponsibilities(template) {
    if (!template || !template.responsibilities) return '';
    return template.responsibilities.map(function (r) { return '• ' + r; }).join('\n');
  }

  // ── 사용자 컨텍스트로 자동 채움 ────────────────────────────
  function autofillForEntry(entry) {
    if (!entry || !entry.dept) return '';
    var profile = (global.PROFILE && global.PROFILE.load) ? global.PROFILE.load() : {};
    var jobType = profile.jobType || '';
    var serviceYears = 0;
    if (profile.hireDate && global.PROFILE && global.PROFILE.calcServiceYears) {
      serviceYears = global.PROFILE.calcServiceYears(profile.hireDate) || 0;
    }
    var level = estimateLevel(serviceYears);
    // dept 필드는 "병원명 · 부서명" 형식일 수 있으므로 분리
    var deptName = entry.dept;
    if (deptName.indexOf('·') >= 0) {
      var parts = deptName.split('·').map(function (s) { return s.trim(); });
      deptName = parts[parts.length - 1];
    }
    var t = findTemplate(deptName, jobType, level);
    return formatResponsibilities(t);
  }

  global.JobTemplates = {
    TEMPLATES: TEMPLATES,
    estimateLevel: estimateLevel,
    findTemplate: findTemplate,
    formatResponsibilities: formatResponsibilities,
    autofillForEntry: autofillForEntry
  };
})(window);

// Phase 2-F: ESM marker — 파일을 ES module 로 표시 (side-effect IIFE 보존)
export {};
