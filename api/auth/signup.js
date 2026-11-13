import { randomUUID } from 'node:crypto'
import { getSql } from '../../server/vercel-db.mjs'
import {
  EMAIL_PATTERN,
  MAX_EMAIL_LENGTH,
  MAX_NAME_LENGTH,
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
  createSession,
  hashPassword,
  isPlainObject,
  normalizeEmail,
  publicUser,
  readJsonBody,
  sendError,
  sendJson,
} from '../../server/vercel-auth.mjs'

function isUniqueViolation(error) {
  return error?.code === '23505' || String(error?.message ?? '').includes('duplicate key')
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return sendError(res, 405, 'Method not allowed', 'METHOD_NOT_ALLOWED')
  }
  try {
    const body = isPlainObject(req.body) ? req.body : await readJsonBody(req)
    const name = typeof body?.name === 'string' ? body.name.trim() : ''
    const email = normalizeEmail(body?.email)
    const password = typeof body?.password === 'string' ? body.password : ''

    if (!name) return sendError(res, 400, 'Name is required', 'INVALID_NAME', { field: 'name' })
    if (name.length > MAX_NAME_LENGTH) {
      return sendError(res, 400, `Name must be ${MAX_NAME_LENGTH} characters or fewer`, 'INVALID_NAME', { field: 'name' })
    }
    if (!email || email.length > MAX_EMAIL_LENGTH || !EMAIL_PATTERN.test(email)) {
      return sendError(res, 400, 'A valid email address is required', 'INVALID_EMAIL', { field: 'email' })
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      return sendError(res, 400, `Password must be at least ${MIN_PASSWORD_LENGTH} characters`, 'WEAK_PASSWORD', {
        field: 'password',
      })
    }
    if (password.length > MAX_PASSWORD_LENGTH) {
      return sendError(res, 400, `Password must be ${MAX_PASSWORD_LENGTH} characters or fewer`, 'WEAK_PASSWORD', {
        field: 'password',
      })
    }

    const sql = await getSql()
    const existing = await sql`SELECT id FROM users WHERE email = ${email} LIMIT 1`
    if (existing.length > 0) {
      return sendError(res, 409, 'An account with this email already exists', 'EMAIL_TAKEN')
    }

    const { hash, salt } = hashPassword(password)
    const userId = randomUUID()
    let inserted
    try {
      inserted = await sql`
        INSERT INTO users (id, name, email, password_hash, password_salt)
        VALUES (${userId}, ${name}, ${email}, ${hash}, ${salt})
        RETURNING id, name, email
      `
    } catch (error) {
      if (isUniqueViolation(error)) {
        return sendError(res, 409, 'An account with this email already exists', 'EMAIL_TAKEN')
      }
      throw error
    }

    const user = inserted[0]
    await createSession(sql, res, user.id)
    return sendJson(res, 201, { user: publicUser(user) })
  } catch (error) {
    console.error('[anatera] signup error:', error)
    if (error?.code === 'PAYLOAD_TOO_LARGE') {
      return sendError(res, 413, 'Request body too large', 'PAYLOAD_TOO_LARGE')
    }
    if (error instanceof SyntaxError) {
      return sendError(res, 400, 'Malformed JSON body', 'INVALID_JSON')
    }
    return sendError(res, 500, 'Internal server error', 'INTERNAL_ERROR')
  }
}
