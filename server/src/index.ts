import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serve } from '@hono/node-server'
import dataRoutes from './routes/data'
import faqRoutes from './routes/faq'
import chatRoutes from './routes/chat'
import calendarRoutes from './routes/calendar'
import adminCalendarRoutes from './routes/adminCalendar'
import adminOpsRoutes from './routes/adminOps'
import teamRoutes from './routes/teams'
import meRoutes from './routes/me'
import cardNewsRoutes from './routes/cardNews'
import regulationRoutes from './routes/regulations'
import resumeRoutes from './routes/resume'

const app = new Hono().basePath('/api')

// CORS 설정 — 프로덕션은 화이트리스트만, 개발은 전체 허용
const ALLOWED_ORIGINS = [
  'https://snuhmate.com',
  'https://www.snuhmate.com',
  'https://angio.snuhmate.com',
]
app.use('*', cors({
  origin: process.env.NODE_ENV === 'production'
    ? (origin) => ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
    : '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}))

// Health check
app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Public client config
app.get('/config', (c) => {
  return c.json({
    neonAuthBaseUrl: process.env.NEON_AUTH_BASE_URL ?? null,
    googleClientId: process.env.GOOGLE_CLIENT_ID ?? null,
    googleCalendarScope: 'https://www.googleapis.com/auth/calendar.app.created',
  })
})

// Routes
app.route('/data', dataRoutes)
app.route('/faq', faqRoutes)
app.route('/chat', chatRoutes)
app.route('/card-news', cardNewsRoutes)
app.route('/calendar', calendarRoutes)
app.route('/admin/calendar', adminCalendarRoutes)
app.route('/admin', adminOpsRoutes)
app.route('/regulations', regulationRoutes)
app.route('/teams', teamRoutes)
app.route('/me', meRoutes)
app.route('/resume', resumeRoutes)

// Vercel serverless export
export default app

// Local development server
if (process.env.NODE_ENV !== 'production') {
  const port = Number(process.env.PORT) || 3001
  console.log(`Server running on http://localhost:${port}`)
  serve({ fetch: app.fetch, port })
}
