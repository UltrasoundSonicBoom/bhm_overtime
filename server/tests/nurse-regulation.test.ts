import test from 'node:test'
import assert from 'node:assert/strict'
import {
  evaluateNurseRegulationScenarios,
  loadNurseRegulation,
} from '../src/services/nurse-regulation'

test('loadNurseRegulation returns the 2026 handbook master and all scenario fixtures pass', () => {
  const regulation = loadNurseRegulation(2026)
  const report = evaluateNurseRegulationScenarios(regulation)

  assert.equal(regulation._meta?.version, '2026.2.0')
  assert.ok((regulation.scenario_fixtures?.length ?? 0) >= 10)
  assert.equal(report.failed, 0)
  assert.equal(report.total, regulation.scenario_fixtures?.length ?? 0)
})

test('nurse regulation includes current shift-worker protections and compensation anchors', () => {
  const regulation = loadNurseRegulation(2026)

  assert.equal(regulation.working_hours_and_shift_rules?.shift_worker_rules?.min_rest_between_shifts, 16)
  assert.equal(regulation.working_hours_and_shift_rules?.shift_worker_rules?.night_shift_bonus, 10000)
  assert.equal(regulation.working_hours_and_shift_rules?.overtime_and_on_call?.on_call?.dispatch_transport, 50000)
  assert.equal(regulation.leaves_and_holidays?.petition_and_special_leaves?.childbirth_spouse, 20)
  assert.equal(regulation.welfare_and_training?.new_hire_training?.preceptor_allowance, 200000)
})
