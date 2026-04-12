/**
 * Phase 12 TDD: nurse_regulation.json -> DB Migration
 * 실행: node tests/phase12-nurse-regulation-db.js [--api http://localhost:3001]
 *
 * Part A: nurse_regulation.json 파싱 검증 (오프라인)
 * Part B: seed 스크립트 존재 및 구조 검증 (오프라인)
 * Part C: API 엔드포인트 검증 (서버 필요)
 * Part D: 회귀 테스트 — regulation-constants.js 정합성
 *
 * RED 단계: Part A PASS, Part B/C FAIL
 * GREEN 단계: 전체 PASS
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
let passed = 0;
let failed = 0;
let skipped = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  PASS: ${message}`);
    passed++;
  } else {
    console.error(`  FAIL: ${message}`);
    failed++;
  }
}

function skip(message) {
  console.log(`  SKIP: ${message}`);
  skipped++;
}

// CLI args
const args = process.argv.slice(2);
const apiIdx = args.indexOf('--api');
const API_BASE = apiIdx >= 0 && args[apiIdx + 1] ? args[apiIdx + 1] : null;

// ══════════════════════════════════════════════
// Part A: nurse_regulation.json 파싱 검증
// ══════════════════════════════════════════════

console.log('\n=== Phase 12 Part A: nurse_regulation.json 구조 검증 ===\n');

const jsonPath = path.join(ROOT, 'content', 'policies', '2026', 'nurse_regulation.json');
const jsonExists = fs.existsSync(jsonPath);
assert(jsonExists, 'nurse_regulation.json 파일 존재');

let regulation = null;
if (jsonExists) {
  try {
    regulation = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    assert(true, 'nurse_regulation.json JSON 파싱 성공');
  } catch (e) {
    assert(false, `nurse_regulation.json 파싱 실패: ${e.message}`);
  }
}

if (regulation) {
  // T12-A1: _meta 존재 및 필수 필드
  assert(regulation._meta && regulation._meta.version, '_meta.version 존재');
  assert(regulation._meta && regulation._meta.title, '_meta.title 존재');
  assert(regulation._meta && regulation._meta.source_sha256, '_meta.source_sha256 존재');

  // T12-A2: 주요 섹션 존재
  const expectedSections = [
    'working_hours_and_shift_rules',
    'wage_structure_and_allowances',
    'leaves_and_holidays',
    'welfare_and_training',
    'wage_tables_2025',
  ];
  for (const section of expectedSections) {
    assert(regulation[section] !== undefined, `섹션 '${section}' 존재`);
  }

  // T12-A3: shift_templates 존재
  const shiftTemplates = regulation.working_hours_and_shift_rules?.standard_hours?.shift_templates;
  assert(shiftTemplates && Object.keys(shiftTemplates).length >= 5, `shift_templates 5개 이상 (${shiftTemplates ? Object.keys(shiftTemplates).length : 0})`);

  // T12-A4: wage_tables_2025에 grade 데이터 존재
  const wageTables = regulation.wage_tables_2025;
  if (wageTables) {
    const gradeKeys = Object.keys(wageTables).filter(k => k.includes('grade'));
    assert(gradeKeys.length >= 6, `wage_tables_2025에 grade 카테고리 6개 이상 (${gradeKeys.length})`);
  }

  // T12-A5: scenario_fixtures 존재
  assert(
    Array.isArray(regulation.scenario_fixtures) && regulation.scenario_fixtures.length > 0,
    `scenario_fixtures ${regulation.scenario_fixtures?.length || 0}개`
  );

  // T12-A6: document_outline 존재
  assert(
    Array.isArray(regulation.document_outline) && regulation.document_outline.length > 0,
    `document_outline ${regulation.document_outline?.length || 0}개`
  );
}

// ══════════════════════════════════════════════
// Part B: seed 스크립트 존재 및 구조 검증
// ══════════════════════════════════════════════

console.log('\n=== Phase 12 Part B: seed 스크립트 검증 ===\n');

const seedScriptPath = path.join(ROOT, 'server', 'scripts', 'seed-nurse-regulation.ts');
const seedExists = fs.existsSync(seedScriptPath);
assert(seedExists, 'seed-nurse-regulation.ts 스크립트 존재');

if (seedExists) {
  const seedContent = fs.readFileSync(seedScriptPath, 'utf8');

  // T12-B1: nurse_regulation.json 파일 참조
  assert(
    seedContent.includes('nurse_regulation.json'),
    'seed 스크립트가 nurse_regulation.json 참조'
  );

  // T12-B2: dry-run 모드 지원
  assert(
    seedContent.includes('--write') || seedContent.includes('dry-run') || seedContent.includes('dryRun'),
    'dry-run 모드 지원'
  );

  // T12-B3: regulation_versions 테이블 참조
  assert(
    seedContent.includes('regulation_versions'),
    'regulation_versions 테이블 참조'
  );

  // T12-B4: calculation_rules 테이블 참조
  assert(
    seedContent.includes('calculation_rules'),
    'calculation_rules 테이블 참조'
  );

  // T12-B5: source_files 업데이트
  assert(
    seedContent.includes('source_files'),
    'source_files 업데이트 로직 존재'
  );

  // T12-B6: idempotent 삭제 로직
  assert(
    seedContent.includes('delete') || seedContent.includes('DELETE'),
    'idempotent 삭제 로직 존재'
  );

  // T12-B7: sha256 체크 로직
  assert(
    seedContent.includes('sha256') || seedContent.includes('source_sha256'),
    'sha256 변경 감지 로직 존재'
  );

  // T12-B8: 주요 rule_type 매핑
  const expectedRuleTypes = [
    'shift_rules',
    'wage_structure',
    'leaves',
    'welfare',
    'wage_table_raw',
  ];
  for (const ruleType of expectedRuleTypes) {
    assert(
      seedContent.includes(ruleType),
      `rule_type '${ruleType}' 매핑 존재`
    );
  }

  // T12-B9: --force 옵션 지원
  assert(
    seedContent.includes('--force') || seedContent.includes('force'),
    '--force 옵션 지원'
  );
} else {
  // 스크립트 미존재 시 전부 FAIL 처리
  for (let i = 0; i < 9; i++) {
    assert(false, `seed 스크립트 미존재 - B${i + 1} 스킵`);
  }
}

// ══════════════════════════════════════════════
// Part C: API 엔드포인트 검증 (서버 필요)
// ══════════════════════════════════════════════

console.log('\n=== Phase 12 Part C: Admin API 엔드포인트 검증 ===\n');

async function runPartC() {
  if (!API_BASE) {
    skip('API_BASE 미지정 (--api http://localhost:3001 으로 실행)');
    skip('Part C 전체 스킵');
    return;
  }

  // T12-C1: /api/admin/regulation-rules 엔드포인트 존재 확인
  // 인증 없이 403 또는 401이면 엔드포인트 존재 확인
  try {
    const res = await fetch(`${API_BASE}/api/admin/regulation-rules?versionId=1`);
    assert(
      [200, 401, 403].includes(res.status),
      `/api/admin/regulation-rules 엔드포인트 존재 (status: ${res.status})`
    );

    if (res.status === 200) {
      const data = await res.json();
      // T12-C2: results 배열 존재
      assert(
        Array.isArray(data.results),
        'regulation-rules 응답에 results 배열 존재'
      );

      // T12-C3: rule 항목 구조
      if (data.results.length > 0) {
        const sample = data.results[0];
        assert('rule_type' in sample, 'rule 항목에 rule_type 존재');
        assert('rule_key' in sample, 'rule 항목에 rule_key 존재');
        assert('rule_data' in sample, 'rule 항목에 rule_data 존재');
      } else {
        skip('regulation-rules 결과 0건 — 항목 구조 검증 스킵');
      }

      // T12-C4: ruleType 필터링
      const filteredRes = await fetch(
        `${API_BASE}/api/admin/regulation-rules?versionId=1&ruleType=shift_rules`
      );
      if (filteredRes.status === 200) {
        const filteredData = await filteredRes.json();
        const allMatch = filteredData.results.every(
          (r) => r.rule_type === 'shift_rules'
        );
        assert(allMatch, 'ruleType=shift_rules 필터 정상 동작');
      } else {
        skip('필터 응답 비정상 — ruleType 필터 검증 스킵');
      }
    } else {
      skip('인증 필요 — Part C 상세 검증 스킵');
    }
  } catch (e) {
    assert(false, `API 접속 실패: ${e.message}`);
  }
}

// ══════════════════════════════════════════════
// Part D: regulation-constants.js 정합성 (parity)
// ══════════════════════════════════════════════

console.log('\n=== Phase 12 Part D: regulation-constants.js 정합성 검증 ===\n');

function runPartD() {
  const rcPath = path.join(ROOT, 'regulation-constants.js');
  if (!fs.existsSync(rcPath)) {
    skip('regulation-constants.js 미존재');
    return;
  }

  // regulation-constants.js를 직접 require
  const RC = require(rcPath);

  if (!regulation) {
    skip('nurse_regulation.json 파싱 실패 — 정합성 비교 불가');
    return;
  }

  // T12-D1: 온콜 대기수당
  const onCallStandby = regulation.working_hours_and_shift_rules?.overtime_and_on_call?.on_call?.standby_per_day;
  assert(
    onCallStandby === RC.ON_CALL_STANDBY_DAILY,
    `온콜 대기수당 일치: JSON=${onCallStandby}, RC=${RC.ON_CALL_STANDBY_DAILY}`
  );

  // T12-D2: 온콜 교통비
  const onCallTransport = regulation.working_hours_and_shift_rules?.overtime_and_on_call?.on_call?.dispatch_transport;
  assert(
    onCallTransport === RC.ON_CALL_TRANSPORT,
    `온콜 교통비 일치: JSON=${onCallTransport}, RC=${RC.ON_CALL_TRANSPORT}`
  );

  // T12-D3: 야간근무 가산금
  const nightBonus = regulation.working_hours_and_shift_rules?.shift_worker_rules?.night_shift_bonus;
  assert(
    nightBonus === RC.NIGHT_SHIFT_BONUS_PER_SHIFT,
    `야간근무 가산금 일치: JSON=${nightBonus}, RC=${RC.NIGHT_SHIFT_BONUS_PER_SHIFT}`
  );

  // T12-D4: 프리셉터 수당
  const preceptor = regulation.welfare_and_training?.new_hire_training?.preceptor_allowance;
  assert(
    preceptor === RC.PRECEPTOR_ALLOWANCE,
    `프리셉터 수당 일치: JSON=${preceptor}, RC=${RC.PRECEPTOR_ALLOWANCE}`
  );

  // T12-D5: 급식보조비
  const meal = regulation.wage_structure_and_allowances?.fixed_allowances?.meal_subsidy;
  assert(
    meal === RC.MEAL_SUBSIDY,
    `급식보조비 일치: JSON=${meal}, RC=${RC.MEAL_SUBSIDY}`
  );

  // T12-D6: 교통보조비
  const transport = regulation.wage_structure_and_allowances?.fixed_allowances?.transportation_subsidy;
  assert(
    transport === RC.TRANSPORT_SUBSIDY,
    `교통보조비 일치: JSON=${transport}, RC=${RC.TRANSPORT_SUBSIDY}`
  );

  // T12-D7: 리프레시지원비 연간
  const refreshYearly = regulation.wage_structure_and_allowances?.fixed_allowances?.refresh_support_yearly;
  assert(
    refreshYearly === RC.REFRESH_BENEFIT_MONTHLY * 12,
    `리프레시지원비 연간 일치: JSON=${refreshYearly}, RC*12=${RC.REFRESH_BENEFIT_MONTHLY * 12}`
  );

  // T12-D8: 프라임팀 대체근무 가산
  const primeTeam = regulation.working_hours_and_shift_rules?.shift_worker_rules?.substitute_work?.prime_team_allowance;
  assert(
    primeTeam === RC.PRIME_TEAM_SUBSTITUTE_DAILY,
    `프라임팀 일치: JSON=${primeTeam}, RC=${RC.PRIME_TEAM_SUBSTITUTE_DAILY}`
  );

  // T12-D9: 가족수당 배우자
  const familySpouse = regulation.wage_structure_and_allowances?.family_allowance?.spouse;
  assert(
    familySpouse === RC.FAMILY_ALLOWANCE.spouse,
    `가족수당 배우자 일치: JSON=${familySpouse}, RC=${RC.FAMILY_ALLOWANCE.spouse}`
  );

  // T12-D10: 연차 최대일수
  const annualMax = regulation.leaves_and_holidays?.annual_leave?.max;
  assert(
    annualMax === RC.ANNUAL_LEAVE.maxLeave,
    `연차 최대일수 일치: JSON=${annualMax}, RC=${RC.ANNUAL_LEAVE.maxLeave}`
  );
}

runPartD();

// ── 실행 ──
async function main() {
  await runPartC();

  console.log(`\n${'='.repeat(50)}`);
  console.log(`Phase 12 결과: ${passed} PASS / ${failed} FAIL / ${skipped} SKIP`);
  console.log('='.repeat(50));

  if (failed > 0) process.exit(1);
}

main().catch(e => {
  console.error('테스트 실행 오류:', e);
  process.exit(1);
});
