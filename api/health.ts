import type { IncomingMessage, ServerResponse } from 'http'
export const config = { api: { bodyParser: false } }
export default function handler(_req: IncomingMessage, res: ServerResponse) {
  res.writeHead(200, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ ok: true, db: process.env.DATABASE_URL ? 'set' : 'MISSING', openai: process.env.OPENAI_API_KEY ? 'set' : 'MISSING', node: process.version }))
}
