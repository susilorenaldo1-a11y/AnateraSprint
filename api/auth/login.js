import { getSql } from '../../server/vercel-db.mjs'
import {
  DUMMY_CREDENTIALS,
  INVALID_CREDENTIALS,
  createSession,
  isPlainObject,
  normalizeEmail,
  publicUser,
  readJsonBody,
  sendError,
  sendJson,
  verifyPassword,
} from '../../server/vercel-auth.mjs'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return sendError(res, 405, 'Method not allowed', 'METHOD_NOT_ALLOWED')
  }
  try {
    const body = isPlainObject(req.body) ? req.body : await readJsonBody(req)
    const email = normalizeEmail(body?.email)
    const password = typeof body?.password === 'string' ? body.password : ''
    const sql = await getSql()
    const rows = email
      ? await sql`
          SELECT id, name, email, password_hash, password_salt
          FROM users WHERE email = ${email} LIMIT 1
        `
      : []

    if (rows.length === 0) {
      verifyPassword(password, DUMMY_CREDENTIALS.salt, DUMMY_CREDENTIALS.hash)
      return sendJson(res, 401, INVALID_CREDENTIALS)
    }

    const record = rows[0]
    if (!verifyPassword(password, record.password_salt, record.password_hash)) {
      return sendJson(res, 401, INVALID_CREDENTIALS)
    }

    await createSession(sql, res, record.id)
    return sendJson(res, 200, { user: publicUser(record) })
  } catch (error) {
    console.error('[anatera] login error:', error)
    if (error?.code === 'PAYLOAD_TOO_LARGE') {
      return sendError(res, 413, 'Request body too large', 'PAYLOAD_TOO_LARGE')
    }
    if (error instanceof SyntaxError) {
      return sendError(res, 400, 'Malformed JSON body', 'INVALID_JSON')
    }
    return sendError(res, 500, 'Internal server error', 'INTERNAL_ERROR')
  }
}
