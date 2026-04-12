import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data', 'angio');
const PDF_DIR = path.join(DATA_DIR, 'source-pdfs');
const PREVIEW_DIR = path.join(DATA_DIR, 'previews');

const FILE_DEFS = [
  {
    id: 'vascular-duty-2026-04',
    title: '혈관조영실 당직근무표(2026.04)',
    period: '2026-04',
    documentType: 'radiology_duty',
    pdfFile: 'vascular-duty-2026-04.pdf',
    previewImages: ['vascular-duty-2026-04-01.png'],
    characteristics: [
      'RT · RN · CPN · 준비실을 한 장 그리드에 배치한 호출표',
      '평일 호출과 토요근무를 분리해 부서 간 커버 순서를 드러냄',
      '연락처와 조 편성이 같은 파일에 있어 실제 호출 체인까지 확인 가능',
    ],
    goals: [
      '방사선사와 간호사 호출 순번을 날짜별로 고정한다',
      '토요근무/보건직 조 편성으로 주말 커버를 분리한다',
      '전화 연락 체계를 같은 문서에 남겨 당직 변경 시 의국과 즉시 연결한다',
    ],
    expectedResults: [
      '누가 어떤 날짜에 호출 또는 토요근무인지 즉시 확인할 수 있다',
      '호출자 변경 시 의국 통지 규칙과 연락처가 같은 화면에서 닫힌다',
      'RN/RT/CPN/준비실이 같은 당직 운영 체계 안에서 어떻게 묶이는지 보인다',
    ],
    expectedEffects: [
      '야간/주말 호출 누락을 줄인다',
      '직군별 교대 부담과 연락 병목을 사전에 식별한다',
      '간호사-방사선사-CPN 사이 인계 구조를 운영 규칙으로 고정한다',
    ],
    sections: [
      {
        page: 1,
        title: '호출 · 토요근무 · 연락처 그리드',
        focus: ['RT 호출', 'RN 호출', 'CPN호출', '준비실', '연락처(방사선사)', '연락처(간호사)'],
      },
    ],
  },
  {
    id: 'angio-clinic-status',
    title: 'Angio 진료현황',
    period: '2026-02',
    documentType: 'clinic_operations',
    pdfFile: 'angio-clinic-status.pdf',
    previewImages: ['angio-clinic-status-01.png'],
    characteristics: [
      '오전 · 오후 · 저녁 진료를 날짜별 운영 레인으로 나눔',
      '1/2/3/5/6번방, 지혈, 암병원, backup/operator 변경이 한 문서에 섞여 있다',
      '휴가, 학회, 강의, 부재 메모가 방 배정과 같은 행에서 함께 관리된다',
    ],
    goals: [
      '날짜별 시술실 배정과 backup/operator 변경 이유를 동시에 기록한다',
      '방별 책임자와 CPN 연결 관계를 운영 타임라인에 남긴다',
      '부재 사유와 대체 배정을 같은 문맥에 묶어 인수인계를 줄인다',
    ],
    expectedResults: [
      '방 배정과 사람 배정, 부재 사유가 서로 끊기지 않고 읽힌다',
      '암병원/지혈/Neuro 같은 특수 영역 운영이 별도 트랙으로 보인다',
      '학회/교육/휴가가 왜 당일 운영에 영향을 주는지 추적 가능하다',
    ],
    expectedEffects: [
      'operator 공백과 room backup 병목을 빠르게 찾는다',
      '시술실 배정 변경의 이유가 문서 근거와 함께 남는다',
      '간호-CPN-MD 협업 지점이 방 단위로 시각화된다',
    ],
    sections: [
      {
        page: 1,
        title: '일자별 진료 스케줄 레인',
        focus: ['오전진료스케줄', '오후진료스케줄', '저녁진료스케줄', '1번방', '암병원'],
      },
    ],
  },
  {
    id: 'angio-duty-feb-2026',
    title: 'Angio 당직표',
    period: '2026-02',
    documentType: 'physician_cpn_oncall',
    pdfFile: 'angio-duty-feb-2026.pdf',
    previewImages: ['angio-duty-feb-2026-1.png'],
    characteristics: [
      '교수 · Fellow · 전공의/CPN · n교수를 한 캘린더 안에 겹쳐 둔 당직표',
      '이니셜/약칭과 연락처 표가 같이 있어 실제 호출 체인과 약어 체계가 연결된다',
      '평일/일요일·휴일 당직 횟수와 지난달 누적이 같은 페이지에 공존한다',
    ],
    goals: [
      '의사직과 CPN 당직 라인을 같은 달력에서 조합한다',
      '야간 n교수와 일반 교수 라인을 분리해 책임선을 명확히 한다',
      '약칭과 실명을 함께 써 빠른 판독과 실제 호출을 동시에 만족시킨다',
    ],
    expectedResults: [
      '교수/펠로우/R1/CPN/Night 교수의 당직 결합 구조를 이해할 수 있다',
      '약칭만 봐도 실명과 연락처를 역추적할 수 있다',
      '평일/휴일 횟수 누적과 일정 표를 한 번에 읽을 수 있다',
    ],
    expectedEffects: [
      '의료진 호출 라인의 중복과 공백을 줄인다',
      '약칭 사용으로 생길 수 있는 전달 오류를 실명/연락망으로 보완한다',
      '교수 라인과 CPN 라인의 coupling을 달 단위로 검토할 수 있다',
    ],
    sections: [
      {
        page: 1,
        title: '달력형 당직표 + 연락처 표',
        focus: ['교수', 'Fellow', '전공의/CPN', 'n교수', '1차 연락처', '평일당직 횟수'],
      },
    ],
  },
  {
    id: 'overtime-stats-2026',
    title: '2026년 시간외근무 통계 자료',
    period: '2026',
    documentType: 'overtime_statistics',
    pdfFile: 'overtime-stats-2026.pdf',
    previewImages: ['overtime-stats-2026-01.png', 'overtime-stats-2026-02.png'],
    characteristics: [
      '주차별, 3월 누적, 월별 전체 누적을 차트 이미지로 요약한다',
      'RT · RN · CPN · 준비실을 역할별 시리즈로 나눠 비교한다',
      '2024 · 2025 · 2026 연간 월별 총량 비교 차트가 붙어 있다',
    ],
    goals: [
      '역할별 시간외 집중 구간을 수치로 비교한다',
      '3월 누적 현황을 개인 단위 막대로 확인한다',
      '연도별 월간 총량 차이로 운영 부하 추세를 읽는다',
    ],
    expectedResults: [
      '직군별 초과근무 집중 인원을 빠르게 식별한다',
      '특정 월과 특정 주차의 편중을 근거 수치와 함께 볼 수 있다',
      '연도별 운영량 차이를 월 단위로 비교할 수 있다',
    ],
    expectedEffects: [
      '시간외 집중 인력에 대한 재배치 논의를 촉진한다',
      '호출표/진료현황/간호 스케줄이 실제로 초과근무에 어떤 흔적을 남기는지 연결한다',
      '운영팀이 정량 자료를 기반으로 인력 분산 여부를 검토할 수 있다',
    ],
    sections: [
      {
        page: 1,
        title: '주차별 + 3월 누적',
        focus: ['2026년 주차별 시간외 근무시간 누적 현황', '2026년 3월 시간외 근무시간 누적 현황'],
      },
      {
        page: 2,
        title: '연도별 월별 총량',
        focus: ['2026년 월별 전체 시간외 근무시간 누적 현황'],
      },
    ],
  },
  {
    id: 'nurse-schedule-2025-12',
    title: '간호사 스케줄',
    period: '2025-12',
    documentType: 'nurse_schedule',
    pdfFile: 'nurse-schedule-2025-12.pdf',
    previewImages: ['nurse-schedule-2025-12-01.png'],
    characteristics: [
      'A팀 · B팀, 당직, 휴가, 생휴, 오후off, 시간외를 달력 셀에 겹쳐 적는다',
      '대체근무, 신청 마감, 팀내 변경 규칙 같은 운영 메모가 반복 등장한다',
      '이름 약칭 중심으로 쓰여 실제 팀 내부 용어와 배치 규칙이 드러난다',
    ],
    goals: [
      '간호팀의 월간 당직/오프/휴가/시간외를 같은 달력에 얹는다',
      '대체근무와 신청 마감 규칙을 달력 운영과 함께 노출한다',
      'A팀/B팀 단위의 균형과 예외 처리를 한 페이지에서 관리한다',
    ],
    expectedResults: [
      '누가 언제 휴가/생휴/오후off/시간외인지 달력 레벨에서 보인다',
      '대신 근무 관계와 팀내 변경 규칙이 함께 남는다',
      '간호사 스케줄 문법이 RT 호출표와 어떻게 다른지 비교 가능하다',
    ],
    expectedEffects: [
      '간호팀 내부 대체근무/시간외 조정의 맥락을 보존한다',
      'A/B팀 운영과 개인 오프 패턴의 편중을 드러낸다',
      '간호 문서가 RT 호출표보다 더 세밀한 개인 상태 관리를 한다는 점을 확인시킨다',
    ],
    sections: [
      {
        page: 1,
        title: '월간 달력 + 팀 규칙 문구',
        focus: ['A팀', 'B팀', '당직', '오후off', '시간외', '당직변경은 가능한한 팀내 변경'],
      },
    ],
  },
];

const PEOPLE = [
  person('김재광', { aliases: ['재광'], roleTags: ['RT', '방사선사'], contact: '010-9193-5312', documents: ['vascular-duty-2026-04', 'overtime-stats-2026'] }),
  person('황장순', { aliases: ['장순'], roleTags: ['RT', '방사선사'], contact: '010-2785-3034', documents: ['vascular-duty-2026-04'] }),
  person('장병삼', { aliases: ['병삼'], roleTags: ['RT', '방사선사'], contact: '010-3043-9576', documents: ['vascular-duty-2026-04', 'overtime-stats-2026'] }),
  person('김성민', { aliases: ['성민'], roleTags: ['RT', '방사선사'], contact: '010-3696-3925', documents: ['vascular-duty-2026-04', 'overtime-stats-2026'] }),
  person('김창수', { aliases: ['창수'], roleTags: ['RT', '방사선사'], contact: '010-7114-1810', documents: ['vascular-duty-2026-04'] }),
  person('오기윤', { aliases: ['기윤'], roleTags: ['RT', '방사선사'], contact: '010-3321-9406', documents: ['vascular-duty-2026-04', 'overtime-stats-2026'] }),
  person('석호경', { aliases: ['호경'], roleTags: ['RT', '방사선사'], contact: '010-4125-3713', documents: ['vascular-duty-2026-04'] }),
  person('김광현', { aliases: ['광현'], roleTags: ['RT', '방사선사'], contact: '010-4826-7725', documents: ['vascular-duty-2026-04', 'overtime-stats-2026'] }),
  person('송철순', { aliases: ['철순'], roleTags: ['RT', '방사선사'], contact: '010-2944-2844', documents: ['vascular-duty-2026-04'] }),
  person('김진호', { aliases: ['진호'], roleTags: ['RT', '방사선사'], contact: '010-2335-9616', documents: ['vascular-duty-2026-04', 'overtime-stats-2026'] }),
  person('배용수', { aliases: ['용수'], roleTags: ['RT', '방사선사'], contact: '010-8668-3492', documents: ['vascular-duty-2026-04'] }),
  person('오현진', { aliases: ['현진'], roleTags: ['RN', '간호사'], contact: '010-2466-7215', documents: ['vascular-duty-2026-04', 'nurse-schedule-2025-12'] }),
  person('김영인', { aliases: ['영인'], roleTags: ['RN', '간호사'], contact: '010-9176-3875', documents: ['vascular-duty-2026-04', 'nurse-schedule-2025-12'] }),
  person('박상미', { aliases: ['상미'], roleTags: ['RN', '간호사'], contact: '010-8646-2315', documents: ['vascular-duty-2026-04', 'nurse-schedule-2025-12'] }),
  person('조소현', { aliases: ['소현'], roleTags: ['RN', '간호사'], contact: '010-3058-3790', documents: ['vascular-duty-2026-04', 'nurse-schedule-2025-12'] }),
  person('서유경', { aliases: ['유경'], roleTags: ['RN', '간호사'], contact: '010-6414-8476', documents: ['vascular-duty-2026-04', 'nurse-schedule-2025-12'] }),
  person('김난희', { aliases: ['난희'], roleTags: ['RN', '간호사'], contact: '010-3745-7392', documents: ['vascular-duty-2026-04', 'nurse-schedule-2025-12'] }),
  person('임윤경', { aliases: ['윤경'], roleTags: ['RN', '간호사'], contact: '010-9634-6650', documents: ['vascular-duty-2026-04', 'nurse-schedule-2025-12'] }),
  person('김미진', { aliases: ['미진'], roleTags: ['RN', '간호사'], contact: '010-4848-8347', documents: ['vascular-duty-2026-04', 'nurse-schedule-2025-12'] }),
  person('방현미', { aliases: ['현미'], roleTags: ['RN', '간호사'], contact: '010-3279-0120', documents: ['vascular-duty-2026-04', 'nurse-schedule-2025-12'] }),
  person('이범영', { aliases: ['범영', '범'], roleTags: ['RN', '간호사'], contact: '010-7288-3447', documents: ['vascular-duty-2026-04', 'nurse-schedule-2025-12'] }),
  person('강은정', { aliases: ['은정'], roleTags: ['RN', '간호사'], contact: '010-6425-3239', documents: ['nurse-schedule-2025-12'] }),
  person('장미래', { aliases: ['미래'], roleTags: ['RN', '간호사'], contact: '010-5232-6491', documents: ['vascular-duty-2026-04'] }),
  person('박현선', { aliases: ['현선'], roleTags: ['RN', '간호사'], contact: '010-9159-0855', documents: ['vascular-duty-2026-04'] }),
  person('김현주', { aliases: ['현주'], roleTags: ['CPN'], contact: '010-8730-8370', documents: ['vascular-duty-2026-04', 'angio-clinic-status', 'angio-duty-feb-2026'] }),
  person('김아선', { aliases: ['아선'], roleTags: ['CPN'], contact: '010-9568-2366', documents: ['vascular-duty-2026-04', 'angio-clinic-status', 'angio-duty-feb-2026'] }),
  person('김혜련', { aliases: ['혜련'], roleTags: ['CPN'], contact: '010-9374-9458', documents: ['vascular-duty-2026-04', 'angio-clinic-status', 'angio-duty-feb-2026'] }),
  person('고경은', { aliases: ['경은'], roleTags: ['CPN'], contact: '010-8766-9765', documents: ['vascular-duty-2026-04', 'angio-clinic-status', 'angio-duty-feb-2026'] }),
  person('정은지', { aliases: ['은지'], roleTags: ['CPN'], contact: '010-3171-7154', documents: ['vascular-duty-2026-04', 'angio-clinic-status', 'angio-duty-feb-2026'] }),
  person('조주영', { aliases: ['주영'], roleTags: ['CPN'], contact: '010-5674-0496', documents: ['vascular-duty-2026-04', 'angio-clinic-status', 'angio-duty-feb-2026'] }),
  person('이서정', { aliases: ['서정'], roleTags: ['CPN'], contact: '010-2046-5867', documents: ['vascular-duty-2026-04', 'angio-clinic-status'] }),
  person('김효선', { aliases: ['효선'], roleTags: ['CPN'], contact: '010-3616-9045', documents: ['vascular-duty-2026-04', 'angio-clinic-status'] }),
  person('이지연', { aliases: ['지연'], roleTags: ['CPN'], contact: null, documents: ['angio-clinic-status', 'vascular-duty-2026-04'] }),
  person('장미숙', { aliases: ['미숙'], roleTags: ['준비실'], contact: '010-7317-6596', documents: ['vascular-duty-2026-04', 'overtime-stats-2026'] }),
  person('이선민', { aliases: ['선민'], roleTags: ['준비실'], contact: '010-3627-7292', documents: ['vascular-duty-2026-04', 'overtime-stats-2026'] }),
  person('박시현', { aliases: ['시현'], roleTags: ['준비실'], contact: '010-2189-1025', documents: ['vascular-duty-2026-04', 'overtime-stats-2026'] }),
  person('제환준', { aliases: ['제'], roleTags: ['교수', 'MD'], contact: '010-37546515', documents: ['angio-duty-feb-2026', 'angio-clinic-status'] }),
  person('김효철', { aliases: ['김'], roleTags: ['교수', 'MD'], contact: '010-51365205', documents: ['angio-duty-feb-2026', 'angio-clinic-status'] }),
  person('허세범', { aliases: ['허'], roleTags: ['교수', 'MD'], contact: '010-34477660', documents: ['angio-duty-feb-2026', 'angio-clinic-status'] }),
  person('이명수', { aliases: ['이'], roleTags: ['교수', 'MD'], contact: '010-97630745', documents: ['angio-duty-feb-2026', 'angio-clinic-status'] }),
  person('최진우', { aliases: ['최'], roleTags: ['교수', 'MD'], contact: '010-8587-7459', documents: ['angio-duty-feb-2026', 'angio-clinic-status'] }),
  person('김도훈', { aliases: ['도'], roleTags: ['교수', 'MD'], contact: '010-4440-6525', documents: ['angio-duty-feb-2026', 'angio-clinic-status'] }),
  person('안원익', { aliases: ['F1안'], roleTags: ['Fellow'], contact: '010-5161-1750', documents: ['angio-duty-feb-2026'] }),
  person('방상흠', { aliases: ['F2', 'F2방'], roleTags: ['Fellow'], contact: '010-2075-3022', documents: ['angio-duty-feb-2026'] }),
  person('최민서', { aliases: ['R1'], roleTags: ['R1', '전공의'], contact: '010-3909-8044', documents: ['angio-duty-feb-2026'] }),
  person('김재현', { aliases: [], roleTags: ['교수', 'MD'], contact: null, documents: ['angio-clinic-status'] }),
  person('고윤정', { aliases: [], roleTags: ['RN', '간호사'], contact: null, documents: ['angio-clinic-status'] }),
  person('김수진', { aliases: [], roleTags: ['RN', '간호사'], contact: null, documents: ['angio-clinic-status'] }),
];

const INITIAL_ALIAS_OVERRIDES = new Map([
  ['제', '제환준'],
  ['허', '허세범'],
  ['이', '이명수'],
  ['최', '최진우'],
  ['도', '김도훈'],
  ['F1안', '안원익'],
  ['F2', '방상흠'],
  ['F2방', '방상흠'],
  ['R1', '최민서'],
  ['범', '이범영'],
  ['범영', '이범영'],
  ['현미', '방현미'],
  ['은정', '강은정'],
  ['은지', '정은지'],
  ['미진', '김미진'],
  ['윤경', '임윤경'],
  ['영인', '김영인'],
  ['유경', '서유경'],
  ['난희', '김난희'],
  ['상미', '박상미'],
  ['소현', '조소현'],
  ['현진', '오현진'],
  ['현주', '김현주'],
  ['아선', '김아선'],
  ['혜련', '김혜련'],
  ['주영', '조주영'],
  ['서정', '이서정'],
  ['경은', '고경은'],
]);

const WEEKDAYS = new Set(['월', '화', '수', '목', '금', '토', '일']);
const ROOM_TOKENS = ['1번방', '2번방', '3번방', '5번방', '6번방', '지혈', '암병원', 'Neuro', '준비실'];
const POLICY_MARKERS = ['당직변경은', '신청 마감', '팀시간외 못할시', '의국', '변경만 가능합니다', '연락바랍니다'];
const LEAVE_MARKERS = ['휴가', '연차', '생휴', '오후off', '검진', '돌봄', '청가'];
const EDUCATION_MARKERS = ['교육', 'conference', '강의', '학회', 'IICIR', 'SIO', 'lab', 'Farewell', 'OT', '방사선교육'];
const ROLE_MARKERS = ['RT', 'RN', 'CPN', '준비실', '교수', 'Fellow', '전공의/CPN', 'n교수', 'A팀', 'B팀'];
const SHIFT_MARKERS = ['호출', '토요근무', '당직', '평일당직', '일요일/휴일', '7A30', '시간외', 'n최', 'n김', 'n도'];

main();

function main() {
  ensureDir(DATA_DIR);

  const extractionCache = new Map();
  const sourceFiles = FILE_DEFS.map((fileDef) => {
    const pdfPath = path.join(PDF_DIR, fileDef.pdfFile);
    const pages = getPdfPageCount(pdfPath);
    const extracted = getPdfTextPages(pdfPath);
    extractionCache.set(fileDef.id, extracted);

    return {
      id: fileDef.id,
      title: fileDef.title,
      period: fileDef.period,
      documentType: fileDef.documentType,
      pages,
      pdfPath: `./source-pdfs/${fileDef.pdfFile}`,
      previewImages: fileDef.previewImages.map((fileName) => `./previews/${fileName}`),
      characteristics: fileDef.characteristics,
      goals: fileDef.goals,
      expectedResults: fileDef.expectedResults,
      expectedEffects: fileDef.expectedEffects,
      sections: fileDef.sections,
    };
  });

  const gridCells = [];
  for (const fileDef of FILE_DEFS) {
    const pages = extractionCache.get(fileDef.id);
    gridCells.push(...buildGridCells(fileDef, pages));
  }

  const relationships = buildRelationships(gridCells);
  const people = buildPeople(gridCells, relationships);
  const operations = buildOperations(extractionCache);
  const comparisons = buildComparisons(people, relationships, operations);

  writeJson('source_files.json', {
    generatedAt: new Date().toISOString(),
    files: sourceFiles,
  });

  writeJson('grid_cells.json', {
    generatedAt: new Date().toISOString(),
    categories: [
      'date',
      'weekday',
      'period_header',
      'role_lane',
      'person_name',
      'assignment',
      'room',
      'shift_marker',
      'leave_or_education',
      'replacement',
      'count_or_stat',
      'contact',
      'policy_note',
      'free_text',
    ],
    cells: gridCells,
  });

  writeJson('people.json', {
    generatedAt: new Date().toISOString(),
    people,
    roleGroups: groupPeopleByRole(people),
  });

  writeJson('operations.json', {
    generatedAt: new Date().toISOString(),
    snapshots: operations,
  });

  writeJson('comparisons.json', {
    generatedAt: new Date().toISOString(),
    reports: comparisons,
  });
}

function person(name, fields) {
  return {
    name,
    aliases: fields.aliases || [],
    roleTags: fields.roleTags || [],
    contact: fields.contact || null,
    documents: fields.documents || [],
  };
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function writeJson(fileName, payload) {
  fs.writeFileSync(path.join(DATA_DIR, fileName), `${JSON.stringify(payload, null, 2)}\n`);
}

function getPdfPageCount(pdfPath) {
  const output = execFileSync('pdfinfo', [pdfPath], { encoding: 'utf8' });
  const match = output.match(/Pages:\s+(\d+)/);
  return match ? Number(match[1]) : 0;
}

function getPdfTextPages(pdfPath) {
  const output = execFileSync('pdftotext', [pdfPath, '-'], {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });

  return output
    .split('\f')
    .map((pageText) => pageText.replace(/\r/g, '').split('\n').map((line) => line.trimEnd()))
    .filter((pageLines) => pageLines.some((line) => line.trim()));
}

function buildGridCells(fileDef, pages) {
  const cells = [];
  let activeDate = null;

  pages.forEach((pageLines, pageIndex) => {
    pageLines.forEach((line, lineIndex) => {
      const normalizedLine = normalizeSpace(line);
      if (!normalizedLine) {
        return;
      }

      activeDate = updateActiveDate(fileDef.id, normalizedLine, activeDate);
      const tokens = tokenizeLine(normalizedLine);
      if (!tokens.length) {
        cells.push(makeCell(fileDef.id, pageIndex + 1, lineIndex, 0, 'free_text', normalizedLine, normalizedLine, [], activeDate, [], line));
        return;
      }

      tokens.forEach((token, tokenIndex) => {
        const linkedPeople = findPeopleInText(token, normalizedLine, fileDef.id);
        const linkedRooms = ROOM_TOKENS.filter((room) => normalizedLine.includes(room) || token.includes(room));
        const category = detectCategory(fileDef.id, token, normalizedLine, linkedPeople, linkedRooms);
        const normalizedValue = normalizeToken(fileDef.id, token, category);

        cells.push(makeCell(
          fileDef.id,
          pageIndex + 1,
          lineIndex,
          tokenIndex,
          category,
          token,
          normalizedValue,
          linkedPeople,
          activeDate,
          linkedRooms,
          line,
        ));
      });
    });
  });

  return cells;
}

function makeCell(sourceFileId, page, lineIndex, tokenIndex, category, rawText, normalizedValue, linkedPeople, activeDate, linkedRooms, rawLine) {
  return {
    sourceFileId,
    page,
    rowKey: `p${page}-l${lineIndex + 1}`,
    colKey: `t${tokenIndex + 1}`,
    category,
    rawText,
    normalizedValue,
    linkedPeople,
    linkedDates: activeDate ? [activeDate] : [],
    linkedRooms,
    rawLine: normalizeSpace(rawLine),
  };
}

function normalizeSpace(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function tokenizeLine(line) {
  const matches = line.match(/010-\d{3,4}-\d{4}|02-\d{3,4}-\d{4}|\d{1,2}\/\d{1,2}|\d{4}[./]\s*\d{1,2}|[가-힣A-Za-z0-9]+(?:[-./()~:][가-힣A-Za-z0-9]+)*/g);
  return matches || [];
}

function updateActiveDate(fileId, line, currentDate) {
  const clinicMatch = line.match(/(\d{1,2})\/(\d{1,2})\s*\((.)\)/);
  if (clinicMatch) {
    return `2026-${String(clinicMatch[1]).padStart(2, '0')}-${String(clinicMatch[2]).padStart(2, '0')}`;
  }

  if (fileId === 'nurse-schedule-2025-12') {
    const nurseMatch = line.match(/^(\d{1,2})-[AB]$/);
    if (nurseMatch) {
      return `2025-12-${String(nurseMatch[1]).padStart(2, '0')}`;
    }
  }

  if (fileId === 'angio-duty-feb-2026' || fileId === 'vascular-duty-2026-04') {
    const dayOnlyMatch = line.match(/^(\d{1,2})$/);
    if (dayOnlyMatch) {
      const month = fileId === 'angio-duty-feb-2026' ? '02' : '04';
      return `2026-${month}-${String(dayOnlyMatch[1]).padStart(2, '0')}`;
    }
  }

  return currentDate;
}

function detectCategory(fileId, token, line, linkedPeople, linkedRooms) {
  if (POLICY_MARKERS.some((marker) => line.includes(marker))) {
    return 'policy_note';
  }
  if (/^(010|02)-\d{3,4}-\d{4}$/.test(token) || line.includes('연락처')) {
    return 'contact';
  }
  if (/^\d{4}[./]\s*\d{1,2}$/.test(token) || line.includes('2026년') || line.includes('2025. 12')) {
    return 'period_header';
  }
  if (/^\d{1,2}\/\d{1,2}$/.test(token) || isLikelyDayToken(token, line, fileId)) {
    return 'date';
  }
  if (WEEKDAYS.has(token)) {
    return 'weekday';
  }
  if (ROLE_MARKERS.some((marker) => token.includes(marker) || line.startsWith(marker) || line.includes(marker))) {
    return 'role_lane';
  }
  if (linkedRooms.length) {
    return 'room';
  }
  if (SHIFT_MARKERS.some((marker) => token.includes(marker) || line.includes(marker))) {
    return 'shift_marker';
  }
  if (LEAVE_MARKERS.some((marker) => token.includes(marker) || line.includes(marker))) {
    return 'leave_or_education';
  }
  if (EDUCATION_MARKERS.some((marker) => token.includes(marker) || line.includes(marker))) {
    return 'leave_or_education';
  }
  if (/대신|backup|operator|변경|부재|배정/i.test(token) || /대신|backup|operator|변경|부재|배정/i.test(line)) {
    return 'replacement';
  }
  if (linkedPeople.length) {
    return 'person_name';
  }
  if (/횟수|누적|시간외|Total|①|②|③/.test(token) || /^\d+(?:\.\d+)?$/.test(token)) {
    return 'count_or_stat';
  }
  if (line.includes(':') || line.includes('/')) {
    return 'assignment';
  }
  return 'free_text';
}

function isLikelyDayToken(token, line, fileId) {
  if (!/^\d{1,2}$/.test(token)) {
    return false;
  }
  const value = Number(token);
  if (value < 1 || value > 31) {
    return false;
  }
  if (fileId === 'overtime-stats-2026') {
    return false;
  }
  if (line === token) {
    return true;
  }
  if (line.includes('날짜') || line.includes('요일')) {
    return true;
  }
  return false;
}

function normalizeToken(fileId, token, category) {
  if (category === 'person_name') {
    const aliasMatch = INITIAL_ALIAS_OVERRIDES.get(token);
    if (aliasMatch) {
      return aliasMatch;
    }
  }
  if (fileId === 'angio-duty-feb-2026' && /^[제허이최도]$/.test(token)) {
    return INITIAL_ALIAS_OVERRIDES.get(token) || token;
  }
  return token.replace(/[:：]$/, '');
}

function findPeopleInText(token, line, fileId) {
  const matches = new Set();

  for (const personInfo of PEOPLE) {
    if (token === personInfo.name || line.includes(personInfo.name)) {
      matches.add(personInfo.name);
      continue;
    }
    for (const alias of personInfo.aliases) {
      if (alias && (token === alias || line.includes(alias))) {
        matches.add(personInfo.name);
      }
    }
  }

  if (fileId === 'angio-duty-feb-2026' && INITIAL_ALIAS_OVERRIDES.has(token)) {
    matches.add(INITIAL_ALIAS_OVERRIDES.get(token));
  }

  return Array.from(matches);
}

function buildRelationships(gridCells) {
  const relationshipMap = new Map();
  const groupedByLine = new Map();

  for (const cell of gridCells) {
    if (!groupedByLine.has(cell.sourceFileId + cell.rowKey)) {
      groupedByLine.set(cell.sourceFileId + cell.rowKey, []);
    }
    groupedByLine.get(cell.sourceFileId + cell.rowKey).push(cell);
  }

  for (const cells of groupedByLine.values()) {
    const line = cells[0].rawLine;
    const peopleInLine = Array.from(new Set(cells.flatMap((cell) => cell.linkedPeople)));
    const roomsInLine = Array.from(new Set(cells.flatMap((cell) => cell.linkedRooms)));

    const replacementMatch = line.match(/([가-힣]{2,4})대신([가-힣]{2,4})/);
    if (replacementMatch) {
      const from = INITIAL_ALIAS_OVERRIDES.get(replacementMatch[1]) || replacementMatch[1];
      const to = INITIAL_ALIAS_OVERRIDES.get(replacementMatch[2]) || replacementMatch[2];
      addRelationship(relationshipMap, from, to, 'replacement', line, cells[0].sourceFileId);
    }

    if (peopleInLine.length >= 2 && roomsInLine.length) {
      for (let i = 0; i < peopleInLine.length; i += 1) {
        for (let j = i + 1; j < peopleInLine.length; j += 1) {
          addRelationship(
            relationshipMap,
            peopleInLine[i],
            peopleInLine[j],
            'shared_assignment',
            `${roomsInLine.join(', ')} · ${line}`,
            cells[0].sourceFileId,
          );
        }
      }
    }
  }

  return relationshipMap;
}

function addRelationship(map, left, right, type, evidence, sourceFileId) {
  if (!left || !right || left === right) {
    return;
  }
  const key = [left, right, type].sort().join('::');
  if (!map.has(key)) {
    map.set(key, {
      people: [left, right],
      type,
      sourceFiles: new Set(),
      evidence: new Set(),
    });
  }
  const entry = map.get(key);
  entry.sourceFiles.add(sourceFileId);
  entry.evidence.add(evidence);
}

function buildPeople(gridCells, relationships) {
  const cellsByPerson = new Map();
  for (const cell of gridCells) {
    for (const name of cell.linkedPeople) {
      if (!cellsByPerson.has(name)) {
        cellsByPerson.set(name, []);
      }
      cellsByPerson.get(name).push(cell);
    }
  }

  return PEOPLE.map((personInfo) => {
    const cells = cellsByPerson.get(personInfo.name) || [];
    const relationshipEntries = Array.from(relationships.values())
      .filter((entry) => entry.people.includes(personInfo.name))
      .map((entry) => ({
        with: entry.people.find((name) => name !== personInfo.name),
        type: entry.type,
        sourceFiles: Array.from(entry.sourceFiles),
        evidence: Array.from(entry.evidence).slice(0, 3),
      }));

    const documentCounts = countBy(cells, (cell) => cell.sourceFileId);
    const categoryCounts = countBy(cells, (cell) => cell.category);
    const patterns = buildPersonPatterns(personInfo.name, cells, categoryCounts, documentCounts);

    return {
      name: personInfo.name,
      aliases: personInfo.aliases,
      roleTags: personInfo.roleTags,
      contact: personInfo.contact,
      documents: personInfo.documents,
      patterns,
      relationships: relationshipEntries,
      mentionCount: cells.length,
      categories: categoryCounts,
    };
  }).sort((left, right) => right.mentionCount - left.mentionCount || left.name.localeCompare(right.name, 'ko'));
}

function buildPersonPatterns(name, cells, categoryCounts, documentCounts) {
  const patterns = [];
  const files = Object.entries(documentCounts).sort((a, b) => b[1] - a[1]);
  if (files[0]) {
    patterns.push(`${files[0][0]} 문서에서 가장 자주 등장`);
  }
  if (categoryCounts.leave_or_education) {
    patterns.push(`휴가/교육 관련 셀 ${categoryCounts.leave_or_education}회 연결`);
  }
  if (categoryCounts.contact) {
    patterns.push('연락망에 직접 기재됨');
  }
  if (name === '김재광') {
    patterns.push('RT 호출표와 시간외 통계 양쪽에서 핵심 기준 인력으로 보임');
  }
  if (name === '오현진') {
    patterns.push('RN 호출표, 간호 스케줄, 연락처 표에 모두 등장하는 간호 운영 허브');
  }
  if (name === '김현주') {
    patterns.push('CPN 호출표와 진료현황 방 배정에 동시에 연결됨');
  }
  if (name === '제환준') {
    patterns.push('Angio 당직표와 진료현황에서 모두 주축 교수 라인으로 등장');
  }
  if (name === '장미숙') {
    patterns.push('준비실 운영과 시간외 통계가 함께 드러나는 스태프');
  }
  return patterns;
}

function groupPeopleByRole(people) {
  const grouped = new Map();
  for (const person of people) {
    const primary = person.roleTags[0] || '기타';
    if (!grouped.has(primary)) {
      grouped.set(primary, []);
    }
    grouped.get(primary).push(person.name);
  }
  return Array.from(grouped.entries()).map(([role, members]) => ({ role, members }));
}

function buildOperations(extractionCache) {
  const clinicPages = extractionCache.get('angio-clinic-status');
  const nursePages = extractionCache.get('nurse-schedule-2025-12');

  return [
    buildVascularDutySnapshot(),
    buildClinicSnapshot(clinicPages),
    buildAngioDutySnapshot(),
    buildNurseSnapshot(nursePages),
    buildOvertimeSnapshot(),
  ];
}

function buildVascularDutySnapshot() {
  const firstHalfDays = Array.from({ length: 16 }, (_, index) => index + 1);
  const secondHalfDays = Array.from({ length: 14 }, (_, index) => index + 17);
  const rtFirst = ['김창수', '송철순', '김광현', '김재광', '김진호', '장병삼', '김광현', '김진호', '김재광', '오기윤', '김성민', '오기윤', '송철순', '황장순', '김진호', '오기윤'];
  const rnFirst = ['박상미', '임윤경', '김영인', '김미진', '서유경', '조소현', '이범영', '오현진', '방현미', '김난희', '박상미', '조소현', '서유경', '오현진', '방현미', '김미진'];
  const cpnFirst = ['김현주', '조주영', '이서정', '정은지', '조주영', '김아선', '김효선', '고경은', '정은지', '김혜련', '김현주', '김효선', '정은지', '정은지', '조주영', '이서정'];
  const rtSecond = ['황장순', '장병삼', '김창수', '김재광', '장병삼', '김창수', '송철순', '황장순', '송철순', '황장순', '오기윤', '김광현', '김성민', '김재광'];
  const rnSecond = ['김영인', '김난희', '방현미', '임윤경', '박상미', '김미진', '김영인', '김난희', '이범영', '임윤경', '이범영', '오현진', '서유경', '조소현'];
  const cpnSecond = ['정은지', '김아선', '김혜련', '이서정', '김혜련', '김현주', '김효선', '조주영', '이서정', '고경은', '이지연', '김현주', '고경은', '정은지'];

  const dailyAssignments = [];
  firstHalfDays.forEach((day, index) => {
    dailyAssignments.push({
      date: `2026-04-${String(day).padStart(2, '0')}`,
      roleAssignments: {
        RT: rtFirst[index],
        RN: rnFirst[index],
        CPN: cpnFirst[index],
      },
      notes: [],
    });
  });
  secondHalfDays.forEach((day, index) => {
    dailyAssignments.push({
      date: `2026-04-${String(day).padStart(2, '0')}`,
      roleAssignments: {
        RT: rtSecond[index],
        RN: rnSecond[index],
        CPN: cpnSecond[index],
      },
      notes: [],
    });
  });

  return {
    id: 'ops-vascular-duty-2026-04',
    sourceFileId: 'vascular-duty-2026-04',
    period: '2026-04',
    headline: '혈관조영실 호출 운영 스냅샷',
    dailyAssignments,
    roomSchedule: [],
    leaveEvents: [],
    educationEvents: [],
    overtimeStats: [],
    notes: [
      '토요근무와 보건직 조 편성은 별도 레인으로 운영됨',
      '연락처가 같은 문서에 있어 호출 체인 확인이 빠름',
    ],
  };
}

function buildClinicSnapshot(pages) {
  const lines = pages.flat();
  const roomSchedule = [];
  const leaveEvents = [];
  const educationEvents = [];
  let current = null;

  for (const rawLine of lines) {
    const line = normalizeSpace(rawLine);
    if (!line) continue;

    const headerMatch = line.match(/(\d{1,2})\/(\d{1,2})\s*\((.)\)(오전진료스케줄|오후진료스케줄|저녁진료스케줄)/);
    if (headerMatch) {
      current = {
        date: `2026-${String(headerMatch[1]).padStart(2, '0')}-${String(headerMatch[2]).padStart(2, '0')}`,
        session: headerMatch[4].replace('진료스케줄', ''),
        rooms: [],
        notes: [],
      };
      roomSchedule.push(current);
      continue;
    }

    if (!current) continue;

    const roomMatch = line.match(/^(1번방|2번방|3번방|5번방|6번방|지혈|암병원(?:\(4H\))?)[:：]?\s*(.*)$/);
    if (roomMatch) {
      current.rooms.push({
        room: roomMatch[1],
        assignment: roomMatch[2],
        people: findPeopleInText(roomMatch[2], line, 'angio-clinic-status'),
      });
      continue;
    }

    if (LEAVE_MARKERS.some((marker) => line.includes(marker))) {
      leaveEvents.push({
        date: current.date,
        detail: line,
        people: findPeopleInText(line, line, 'angio-clinic-status'),
      });
    }

    if (EDUCATION_MARKERS.some((marker) => line.includes(marker))) {
      educationEvents.push({
        date: current.date,
        detail: line,
        people: findPeopleInText(line, line, 'angio-clinic-status'),
      });
    }

    if (!roomMatch && (/backup|operator|변경|부재|참석|강의|lab/i.test(line) || line.includes('없음'))) {
      current.notes.push(line);
    }
  }

  return {
    id: 'ops-angio-clinic-status',
    sourceFileId: 'angio-clinic-status',
    period: '2026-02',
    headline: 'Angio 진료실 운영 스냅샷',
    dailyAssignments: [],
    roomSchedule,
    leaveEvents,
    educationEvents,
    overtimeStats: [],
    notes: [
      '암병원, 지혈, Neuro가 일반 room 배정과 같은 운영 문맥에서 관리됨',
      'operator 변경, 부재, backup 근무자 배정이 같은 일자에 합쳐져 있음',
    ],
  };
}

function buildAngioDutySnapshot() {
  const rawTokensByDay = {
    '2026-02-01': ['이'],
    '2026-02-02': ['최', 'F2'],
    '2026-02-03': ['도'],
    '2026-02-04': ['이'],
    '2026-02-05': ['김'],
    '2026-02-06': ['도'],
    '2026-02-07': ['김', 'F2', 'R1', '혜련'],
    '2026-02-08': ['김', 'F2'],
    '2026-02-09': ['이', '혜련', 'n최'],
    '2026-02-10': ['도', 'R1'],
    '2026-02-11': ['이', '아선'],
    '2026-02-12': ['허', '아선'],
    '2026-02-13': ['최', 'R1'],
    '2026-02-14': ['도', '은지', 'n김'],
    '2026-02-15': ['도'],
    '2026-02-16': ['최', '주영'],
    '2026-02-17': ['도(~MD)/허(MD~)', '경은'],
    '2026-02-18': ['이', 'R1'],
    '2026-02-19': ['허', '혜련'],
    '2026-02-20': ['김', 'R1'],
    '2026-02-21': ['이', '혜련', '은지', 'n김'],
    '2026-02-22': ['이', '현주'],
    '2026-02-23': ['최', '주영'],
    '2026-02-24': ['김', 'R1'],
    '2026-02-25': ['이', '현주'],
    '2026-02-26': ['허', 'R1'],
    '2026-02-27': ['김', '주영'],
    '2026-02-28': ['허', '아선', 'n도'],
  };

  const dailyAssignments = Object.entries(rawTokensByDay).map(([date, rawTokens]) => ({
    date,
    roleAssignments: {},
    rawTokens,
    linkedPeople: Array.from(new Set(rawTokens.flatMap((token) => findPeopleInText(token, token, 'angio-duty-feb-2026')))),
    notes: [],
  }));

  return {
    id: 'ops-angio-duty-feb-2026',
    sourceFileId: 'angio-duty-feb-2026',
    period: '2026-02',
    headline: '교수 · Fellow · CPN Angio 당직 스냅샷',
    dailyAssignments,
    roomSchedule: [],
    leaveEvents: [],
    educationEvents: [],
    overtimeStats: [],
    notes: [
      '약칭과 실명을 함께 읽어야 해석되는 달력형 당직표',
      '평일/휴일 횟수와 1차 연락처가 같은 페이지에 붙어 있음',
    ],
  };
}

function buildNurseSnapshot(pages) {
  const lines = pages.flat();
  const dailyAssignments = [];
  const leaveEvents = [];
  const educationEvents = [];
  let currentDate = null;
  let teamRoster = { A: [], B: [] };

  for (const rawLine of lines) {
    const line = normalizeSpace(rawLine);
    if (!line) continue;

    const dayMatch = line.match(/^(\d{1,2})-[AB]$/);
    if (dayMatch) {
      currentDate = `2025-12-${String(dayMatch[1]).padStart(2, '0')}`;
      dailyAssignments.push({ date: currentDate, teamLabel: line, notes: [] });
      continue;
    }

    if (line === 'A팀' || line === 'B팀') {
      continue;
    }

    if (/^김미진 오현진 김영인 임윤경 조소현$/.test(line)) {
      teamRoster.B = line.split(' ');
    }
    if (/^이범영 강은정 서유경 김난희 박상미$/.test(line)) {
      teamRoster.A = line.split(' ');
    }

    if (currentDate) {
      if (LEAVE_MARKERS.some((marker) => line.includes(marker))) {
        leaveEvents.push({
          date: currentDate,
          detail: line,
          people: findPeopleInText(line, line, 'nurse-schedule-2025-12'),
        });
      }
      if (EDUCATION_MARKERS.some((marker) => line.includes(marker))) {
        educationEvents.push({
          date: currentDate,
          detail: line,
          people: findPeopleInText(line, line, 'nurse-schedule-2025-12'),
        });
      }
      if (/대신|당직변경은|시간외/.test(line)) {
        dailyAssignments[dailyAssignments.length - 1]?.notes.push(line);
      }
    }
  }

  return {
    id: 'ops-nurse-schedule-2025-12',
    sourceFileId: 'nurse-schedule-2025-12',
    period: '2025-12',
    headline: '간호팀 월간 달력 스냅샷',
    dailyAssignments,
    roomSchedule: [],
    leaveEvents,
    educationEvents,
    overtimeStats: [],
    notes: [
      `A팀: ${teamRoster.A.join(', ')}`,
      `B팀: ${teamRoster.B.join(', ')}`,
      '오후off · 생휴 · 연차 · 시간외 · 대신 근무 메모가 같은 달력 셀 문법으로 기록됨',
    ],
  };
}

function buildOvertimeSnapshot() {
  const overtimeStats = [
    { scope: 'weekly_rt', period: '2026-12~15주차', person: '김광현', value: 19.25, unit: 'hours', sourcePage: 1 },
    { scope: 'weekly_rt', period: '2026-12~15주차', person: '김재광', value: 16.0, unit: 'hours', sourcePage: 1 },
    { scope: 'weekly_rn', period: '2026-12~15주차', person: '임윤경', value: 12.75, unit: 'hours', sourcePage: 1 },
    { scope: 'weekly_rn', period: '2026-12~15주차', person: '방현미', value: 11.75, unit: 'hours', sourcePage: 1 },
    { scope: 'weekly_cpn', period: '2026-12~15주차', person: '조주영', value: 14.25, unit: 'hours', sourcePage: 1 },
    { scope: 'weekly_prep', period: '2026-12~15주차', person: '장미숙', value: 9.5, unit: 'hours', sourcePage: 1 },
    { scope: 'march_rt', period: '2026-03', person: '김재광', value: 18.25, unit: 'hours', sourcePage: 1 },
    { scope: 'march_rt', period: '2026-03', person: '김진호', value: 17.75, unit: 'hours', sourcePage: 1 },
    { scope: 'march_rn', period: '2026-03', person: '박상미', value: 11.75, unit: 'hours', sourcePage: 1 },
    { scope: 'march_rn', period: '2026-03', person: '방현미', value: 11.0, unit: 'hours', sourcePage: 1 },
    { scope: 'march_cpn', period: '2026-03', person: '정은지', value: 10.0, unit: 'hours', sourcePage: 2 },
    { scope: 'march_cpn', period: '2026-03', person: '조주영', value: 14.0, unit: 'hours', sourcePage: 2 },
    { scope: 'march_prep', period: '2026-03', person: '이선민', value: 10.5, unit: 'hours', sourcePage: 2 },
    { scope: 'annual_total', period: '2026-01', person: '전체', value: 970, unit: 'hours', sourcePage: 2, note: '월별 전체 누적 chart label' },
    { scope: 'annual_total', period: '2026-12', person: '전체', value: 1018, unit: 'hours', sourcePage: 2, note: '월별 전체 누적 chart label' },
  ];

  return {
    id: 'ops-overtime-stats-2026',
    sourceFileId: 'overtime-stats-2026',
    period: '2026',
    headline: '시간외 누적 통계 스냅샷',
    dailyAssignments: [],
    roomSchedule: [],
    leaveEvents: [],
    educationEvents: [],
    overtimeStats,
    notes: [
      '주차별 chart는 역할별 12~15주차 누적 시간을 비교한다',
      '3월 chart는 역할별 개인 시간외를 한 번 더 집계해 편중 인력을 드러낸다',
      '월별 전체 chart는 2024 · 2025 · 2026 총량을 같은 축으로 비교한다',
    ],
  };
}

function buildComparisons(people, relationships, operations) {
  return [
    {
      id: 'rn-vs-rt',
      rolePair: ['RN', 'RT'],
      commonPoints: [
        '두 직군 모두 호출/당직 순번과 시간외 누적이 함께 관리된다',
        '실명 연락처가 운영 문서 안에 직접 노출되어 실제 호출 체인으로 연결된다',
        '월간 단위로 개인 편중과 대체 인력을 읽을 수 있다',
      ],
      differences: [
        'RT 문서는 호출 + 토요근무 + 조 편성 중심으로 더 단단한 레인 구조를 가진다',
        'RN 문서는 생휴, 연차, 오후off, 시간외, 대신 근무까지 개인 상태 문법이 훨씬 세밀하다',
        'RN 스케줄은 A/B팀 구조가 있고, RT 호출표는 보건직 조와 토요근무가 더 중요하다',
      ],
      handoffLinks: [
        '혈관조영실 호출표에서 RN과 RT는 같은 날짜 축을 공유한다',
        '시간외 통계에서 RN/RT를 같은 월간 비교 축에 올려 병목을 함께 읽는다',
      ],
      riskSignals: [
        'RT는 소수 인력의 주차별 시간외 피크가 크게 보인다',
        'RN은 휴가/생휴/시간외/대체근무가 섞여 운영 변수가 많다',
      ],
      operationalMeaning: 'RT는 장비/호출 커버, RN은 개인 상태 조정과 팀내 교환이 핵심이다. 두 문서를 합쳐야 실제 야간/주말 운영 부담이 보인다.',
    },
    {
      id: 'rn-vs-cpn',
      rolePair: ['RN', 'CPN'],
      commonPoints: [
        '환자 흐름에 직접 닿는 인력이라 휴가/교육/당직 영향이 곧 운영 공백으로 이어진다',
        '연락처와 개인 이름이 문서 내부에 남아 있어 직접 호출이 가능하다',
      ],
      differences: [
        'RN 스케줄은 월간 개인 상태와 팀 규칙이 중심이고, CPN은 방 배정/암병원/지혈 같이 공간-업무 연결이 더 강하다',
        'CPN은 진료현황과 Angio 당직표 양쪽에 걸쳐 나타나 의사 라인과 직접 결합된다',
      ],
      handoffLinks: [
        'Angio 진료현황에서 1~6번방 배정이 MD/CPN 조합으로 표기된다',
        '혈관조영실 호출표에서 RN과 CPN이 같은 날짜 레인 안에서 병렬 호출된다',
      ],
      riskSignals: [
        'CPN 부재는 room assignment와 지혈/암병원 라인에 즉시 흔적을 남긴다',
        'RN 부재는 팀내 대체근무 메모가 늘어나는 방식으로 드러난다',
      ],
      operationalMeaning: 'RN은 달력형 인력 조정, CPN은 방/시술 연결 조정의 성격이 강하다. 둘을 함께 봐야 환자 흐름 공백을 읽을 수 있다.',
    },
    {
      id: 'document-coupling',
      rolePair: ['Document', 'Document'],
      commonPoints: [
        '호출표, 진료현황, 간호 스케줄, 시간외 통계가 모두 같은 인물군을 다른 문법으로 기록한다',
        '모든 문서가 날짜 축을 공유해 cross-reference가 가능하다',
      ],
      differences: [
        '당직표는 책임자/호출자 중심, 진료현황은 방/세션 중심, 간호 스케줄은 개인 상태 중심, 시간외는 결과 지표 중심이다',
      ],
      handoffLinks: [
        '진료현황의 학회/휴가/부재는 스케줄 표와 시간외 통계의 사후 흔적이 된다',
        '호출표 연락망은 실제 현장 조정의 마지막 고리다',
      ],
      riskSignals: [
        '같은 사람의 약칭/실명 표기가 문서마다 달라 해석 비용이 높다',
        '차트형 통계는 원인 문서 없이는 단독 해석이 어렵다',
      ],
      operationalMeaning: 'Angio 스냅샷 사이트의 핵심 가치는 서로 다른 문서 문법을 같은 사람/날짜/방 축으로 묶어 읽게 만드는 데 있다.',
    },
  ];
}

function countBy(items, keySelector) {
  const output = {};
  for (const item of items) {
    const key = keySelector(item);
    if (!key) continue;
    output[key] = (output[key] || 0) + 1;
  }
  return output;
}
