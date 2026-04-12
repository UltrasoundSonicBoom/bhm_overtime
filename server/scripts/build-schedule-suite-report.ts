import 'dotenv/config'
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const year = 2026
const month = 5
const period = `${year}-${String(month).padStart(2, '0')}`
const teamSlugs = ['101', 'angio']

async function loadApp() {
  process.env.NODE_ENV = process.env.NODE_ENV || 'production'
  const module = await import('../src/index')
  return module.default
}

async function apiJson(app: Awaited<ReturnType<typeof loadApp>>, pathname: string) {
  const response = await app.request(`http://local${pathname}`)
  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.error || `Failed request: ${pathname}`)
  }
  return data
}

async function main() {
  const app = await loadApp()
  const regulation = await apiJson(app, `/api/data/nurse-regulation?year=${year}`)
  const teamReports = await Promise.all(teamSlugs.map(async (teamSlug) => {
    const [dataset, schedule, testReport] = await Promise.all([
      apiJson(app, `/api/teams/${teamSlug}/dataset?year=${year}&month=${month}`),
      apiJson(app, `/api/teams/${teamSlug}/schedules/${period}`),
      apiJson(app, `/api/teams/${teamSlug}/test-report?year=${year}&month=${month}`),
    ])

    return {
      slug: teamSlug,
      dataset: dataset.result,
      schedule: schedule.result,
      testReport: testReport.result,
    }
  }))

  const report = {
    generatedAt: new Date().toISOString(),
    year,
    month,
    period,
    regulationScenarioReport: regulation.scenarioReport,
    teams: Object.fromEntries(teamReports.map((team) => [team.slug, team])),
    summary: {
      totalTestsets: teamReports.reduce((sum, team) => sum + (team.testReport.total || 0), 0),
      passedTestsets: teamReports.reduce((sum, team) => sum + (team.testReport.passed || 0), 0),
      failedTestsets: teamReports.reduce((sum, team) => sum + (team.testReport.failed || 0), 0),
    },
  }

  const outputDir = path.resolve(import.meta.dirname, '..', '..', 'data')
  mkdirSync(outputDir, { recursive: true })
  const outputPath = path.join(outputDir, `schedule_suite_report_${period}.json`)
  writeFileSync(outputPath, JSON.stringify(report, null, 2))

  console.log(`Wrote schedule suite report to ${outputPath}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
