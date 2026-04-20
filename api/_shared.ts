import { handle } from '@hono/node-server/vercel'
import app from '../server/src/index.js'

export const config = { api: { bodyParser: false } }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default handle(app as any)
