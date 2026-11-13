import { getSql } from '../server/vercel-db.mjs'
import { sendError, sendJson } from '../server/vercel-auth.mjs'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return sendError(res, 405, 'Method not allowed', 'METHOD_NOT_ALLOWED')
  }
  try {
    await getSql()
    return sendJson(res, 200, { ok: true, database: 'neon-postgres' })
  } catch (error) {
    console.error('[anatera] health error:', error)
    return sendError(res, 503, 'Workspace database unavailable', 'DATABASE_UNAVAILABLE')
  }
}

