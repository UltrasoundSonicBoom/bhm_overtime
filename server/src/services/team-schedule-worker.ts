import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { SolverPayload, SolverRunResult } from './team-schedules'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const defaultScriptPath = path.resolve(currentDir, '../../workers/schedule_solver.py')

type WorkerOptions = {
  command?: string
  scriptPath?: string
  env?: NodeJS.ProcessEnv
}

export async function runScheduleSolver(
  payload: SolverPayload,
  options: WorkerOptions = {},
): Promise<SolverRunResult> {
  const command = options.command || process.env.SCHEDULE_SOLVER_COMMAND || 'python3'
  const scriptPath = options.scriptPath || process.env.SCHEDULE_SOLVER_SCRIPT || defaultScriptPath

  return await new Promise<SolverRunResult>((resolve, reject) => {
    const child = spawn(command, [scriptPath], {
      cwd: path.dirname(scriptPath),
      env: {
        ...process.env,
        ...options.env,
      },
      stdio: ['pipe', 'pipe', 'pipe'],
    })

    let stdout = ''
    let stderr = ''

    child.stdout.on('data', (chunk) => {
      stdout += String(chunk)
    })
    child.stderr.on('data', (chunk) => {
      stderr += String(chunk)
    })
    child.on('error', (error) => {
      reject(error)
    })
    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(
          `Schedule solver exited with code ${code}: ${stderr.trim() || stdout.trim()}`,
        ))
        return
      }

      try {
        resolve(JSON.parse(stdout) as SolverRunResult)
      } catch (error) {
        reject(new Error(
          `Schedule solver returned invalid JSON: ${String(error)} :: ${stdout}`,
        ))
      }
    })

    child.stdin.write(JSON.stringify(payload))
    child.stdin.end()
  })
}
