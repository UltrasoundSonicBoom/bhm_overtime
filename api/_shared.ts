import { handle } from '@hono/node-server/vercel'
import app from '../server/src/index'

export const config = { api: { bodyParser: false } }
export default handle(app)
