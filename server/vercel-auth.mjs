/**
 * HTTP helpers shared by the Vercel serverless API functions.
 */
import {
  SESSION_COOKIE,
  SESSION_TTL_MS,
  createSessionToken,
  hashSessionToken,
  hashPassword,
  isProductionCookie,
  sessionExpiry,
  verifyPassword,
} from './auth.mjs'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MAX_NAME_LENGTH = 120
const MAX_EMAIL_LENGTH = 254
const MIN_PASSWORD_LENGTH = 8
const MAX_PASSWORD_LENGTH = 1024

export const JSON_BODY_LIMIT = 30 * 1024 * 1024
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024

export const DUMMY_CREDENTIALS = hashPassword('anatera-dummy-password-for-timing')

export const INVALID_CREDENTIALS = Object.freeze({
  error: 'Invalid email or password',
  code: 'INVALID_CREDENTIALS',
})

export function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function normalizeEmail(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : ''
}

export function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email }
}

export function sendJson(res, status, payload) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.end(JSON.stringify(payload))
}

export function sendError(res, status, error, code, extra = {}) {
  return sendJson(res, status, { error, code, ...extra })
}

export function parseCookies(header) {
  if (!header) return {}
  return String(header)
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((cookies, part) => {
      const index = part.indexOf('=')
      if (index === -1) return cookies
      const key = decodeURIComponent(part.slice(0, index).trim())
      const value = decodeURIComponent(part.slice(index + 1).trim())
      cookies[key] = value
      return cookies
    }, {})
}

export async function readRawBody(req) {
  if (Buffer.isBuffer(req.body)) return req.body
  if (typeof req.body === 'string') return Buffer.from(req.body)
  const chunks = []
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  return Buffer.concat(chunks)
}

export async function readJsonBody(req) {
  if (isPlainObject(req.body)) return req.body
  if (Buffer.isBuffer(req.body) || typeof req.body === 'string') {
    const text = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : req.body
    return JSON.parse(text)
  }
  const raw = await readRawBody(req)
  if (raw.length === 0) return {}
  if (raw.length > JSON_BODY_LIMIT) {
    const error = new Error('Request body too large')
    error.code = 'PAYLOAD_TOO_LARGE'
    throw error
  }
  return JSON.parse(raw.toString('utf8'))
}

export async function createSession(sql, res, userId) {
  const token = createSessionToken()
  const tokenHash = hashSessionToken(token)
  const expiresAt = sessionExpiry()
  await sql`
    INSERT INTO sessions (token_hash, user_id, expires_at)
    VALUES (${tokenHash}, ${userId}, ${expiresAt})
  `
  const secure = isProductionCookie() ? '; Secure' : ''
  res.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE}=${encodeURIComponent(token)}; Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}; Path=/; HttpOnly; SameSite=Lax${secure}`,
  )
  return token
}

export async function getAuthenticatedUser(sql, req) {
  const cookies = parseCookies(req.headers.cookie)
  const token = cookies[SESSION_COOKIE]
  if (!token) return null
  const tokenHash = hashSessionToken(token)
  const rows = await sql`
    SELECT u.id, u.name, u.email, s.expires_at
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.token_hash = ${tokenHash}
    LIMIT 1
  `
  if (rows.length === 0) return null
  const expiresAt = new Date(rows[0].expires_at).getTime()
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
    await sql`DELETE FROM sessions WHERE token_hash = ${tokenHash}`
    return null
  }
  return { id: rows[0].id, name: rows[0].name, email: rows[0].email, token }
}

export async function requireUser(sql, req, res) {
  const user = await getAuthenticatedUser(sql, req)
  if (!user) {
    sendError(res, 401, 'Authentication required', 'UNAUTHORIZED')
    return null
  }
  return user
}

export function clearAuthCookie(res) {
  const secure = isProductionCookie() ? '; Secure' : ''
  res.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE}=; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=/; HttpOnly; SameSite=Lax${secure}`,
  )
}

export {
  SESSION_COOKIE,
  EMAIL_PATTERN,
  MAX_NAME_LENGTH,
  MAX_EMAIL_LENGTH,
  MIN_PASSWORD_LENGTH,
  MAX_PASSWORD_LENGTH,
  SESSION_TTL_MS,
  isProductionCookie,
  hashPassword,
  verifyPassword,
  hashSessionToken,
}
