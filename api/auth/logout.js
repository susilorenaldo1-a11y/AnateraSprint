import { getSql } from '../../server/vercel-db.mjs'
import {
  SESSION_COOKIE,
  clearAuthCookie,
  hashSessionToken,
  parseCookies,
  sendError,
  sendJson,
} from '../../server/vercel-auth.mjs'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return sendError(res, 405, 'Method not allowed', 'METHOD_NOT_ALLOWED')
  }
  try {
    const token = parseCookies(req.headers.cookie)[SESSION_COOKIE]
    if (token) {
      const sql = await getSql()
      await sql`DELETE FROM sessions WHERE token_hash = ${hashSessionToken(token)}`
    }
    clearAuthCookie(res)
    res.statusCode = 204
    res.end()
  } catch (error) {
    console.error('[anatera] logout error:', error)
    clearAuthCookie(res)
    res.statusCode = 204
    res.end()
  }
}
