import { getSql } from '../../server/vercel-db.mjs'
import { requireUser, sendError, sendJson } from '../../server/vercel-auth.mjs'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return sendError(res, 405, 'Method not allowed', 'METHOD_NOT_ALLOWED')
  }
  try {
    const sql = await getSql()
    const user = await requireUser(sql, req, res)
    if (!user) return
    return sendJson(res, 200, { user: { id: user.id, name: user.name, email: user.email } })
  } catch (error) {
    console.error('[anatera] me error:', error)
    return sendError(res, 500, 'Internal server error', 'INTERNAL_ERROR')
  }
}
