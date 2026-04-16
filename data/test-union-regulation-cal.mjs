import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const script = resolve(root, 'scripts', 'build-union-regulation-cal.mjs');
const calPath = resolve(root, 'data', 'union_regulation_cal_2026.json');
const aliasPath = resolve(root, 'data', 'union_regulation_aliases_2026.json');
const calJsPath = resolve(root, 'data', 'union_regulation_cal_2026.js');
const aliasJsPath = resolve(root, 'data', 'union_regulation_aliases_2026.js');

const run = spawnSync('node', [script], {
  cwd: root,
  encoding: 'utf8',
});

assert.equal(run.status, 0, run.stderr || run.stdout);

const cal = JSON.parse(readFileSync(calPath, 'utf8'));
const aliases = JSON.parse(readFileSync(aliasPath, 'utf8'));

assert.equal(cal._meta.source, 'union_regulation_2026.json');
assert.equal(cal.fixed_allowances.meal_subsidy.amount, 150000);
assert.equal(cal.fixed_allowances.transport_subsidy.amount, 150000);
assert.equal(cal.fixed_allowances.military_service_pay.amount, 45000);
assert.equal(cal.fixed_allowances.refresh_support_allowance.monthly_amount, 30000);
assert.equal(cal.ordinary_wage.included_variable_keys.includes('meal_subsidy'), true);
assert.equal(cal.ordinary_wage.included_variable_keys.includes('holiday_bonus_event'), true);
assert.equal(cal.ordinary_wage.included_variable_keys.includes('refresh_support_allowance'), true);
assert.equal(cal.formulas.holiday_bonus_event.expression, '(base_salary + adjust_pay * 0.5) * 0.5');
assert.equal(cal.wage_tables.general_j_grade.J3.base_salary_by_year[0], 32379600);
assert.equal(cal.petition_leave_and_congrats.marriage_self.leave_days, 5);
assert.equal(cal.petition_leave_and_congrats.marriage_self.hospital_amount, 300000);
assert.equal(cal.petition_leave_and_congrats.childbirth_spouse.leave_days, 20);
assert.equal(cal.petition_leave_and_congrats.childbirth_spouse.hospital_amount, 100000);
assert.equal(aliases.variable_key_by_compact_label['급식보조비'], 'meal_subsidy');
assert.equal(aliases.variable_key_by_compact_label['급식보조비'.replace(/\s+/g, '')], 'meal_subsidy');
assert.equal(aliases.variable_key_by_compact_label['급식보조비정산'] ?? null, null);
assert.equal(aliases.display_name_by_variable_key.training_allowance, '자기계발별정수당');
assert.equal(existsSync(calJsPath), true);
assert.equal(existsSync(aliasJsPath), true);

console.log('Union regulation cal generator checks passed.');
