/**
 * Password hashing, cookie sessions and auth middleware.
 *
 * Passwords are hashed with scrypt using a fresh 16-byte random salt per user.
 * Session tokens are 32 cryptographically random bytes (base64url) and only a
 * SHA-256 digest of the token is persisted, so a leaked database cannot be
 * replayed as a valid cookie.
 */
import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'

export const SESSION_COOKIE = 'anatera_session'
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000 // 30 days

const SCRYPT_KEYLEN = 64
const SCRYPT_SALT_BYTES = 16
const SCRYPT_OPTIONS = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }

/** @typedef {{ id: string, name: string, email: string }} PublicUser */

export function hashPassword(password) {
  if (typeof password !== 'string' || password.length === 0) {
    throw new TypeError('password must be a non-empty string')
  }
  const salt = randomBytes(SCRYPT_SALT_BYTES).toString('hex')
  const hash = scryptSync(password, salt, SCRYPT_KEYLEN, SCRYPT_OPTIONS).toString('hex')
  return { hash, salt }
}

export function verifyPassword(password, salt, expectedHash) {
  if (typeof password !== 'string' || typeof salt !== 'string' || typeof expectedHash !== 'string') {
    return false
  }
  let derived
  try {
    derived = scryptSync(password, salt, SCRYPT_KEYLEN, SCRYPT_OPTIONS)
  } catch {
    return false
  }
  let expected
  try {
    expected = Buffer.from(expectedHash, 'hex')
  } catch {
    return false
  }
  if (expected.length !== derived.length) return false
  return timingSafeEqual(derived, expected)
}

export function createSessionToken() {
  return randomBytes(32).toString('base64url')
}

export function hashSessionToken(token) {
  return createHash('sha256').update(String(token)).digest('hex')
}

export function sessionExpiry(now = Date.now()) {
  return new Date(now + SESSION_TTL_MS).toISOString()
}

export function isProductionCookie() {
  return process.env.COOKIE_SECURE === 'true'
}

/**
 * @param {import('express').Response} res
 * @param {string} token
 */
export function setSessionCookie(res, token) {
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_MS,
    secure: isProductionCookie(),
  })
}

/**
 * @param {import('express').Response} res
 */
export function clearSessionCookie(res) {
  res.cookie(SESSION_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
    expires: new Date(0),
    secure: isProductionCookie(),
  })
}

/**
 * Resolve the user for a raw cookie token, deleting the session if expired.
 * @param {ReturnType<typeof import('./db.mjs').createDatabase>} database
 * @param {string | undefined} token
 * @returns {PublicUser | null}
 */
export function getSessionUser(database, token) {
  if (!token) return null
  const tokenHash = hashSessionToken(token)
  const user = database.sessions.findUser(tokenHash)
  if (!user) return null
  return { id: user.id, name: user.name, email: user.email }
}

/**
 * Express middleware: requires a valid session cookie, exposes `req.user`.
 * @param {ReturnType<typeof import('./db.mjs').createDatabase>} database
 */
export function requireAuth(database) {
  return function authMiddleware(req, res, next) {
    const token = req.cookies?.[SESSION_COOKIE]
    const user = getSessionUser(database, token)
    if (!user) {
      return res.status(401).json({ error: 'Authentication required', code: 'UNAUTHORIZED' })
    }
    req.user = user
    req.sessionToken = token
    return next()
  }
}

/**
 * Express middleware: attaches `req.user` when a valid session exists.
 * @param {ReturnType<typeof import('./db.mjs').createDatabase>} database
 */
export function optionalAuth(database) {
  return function optionalAuthMiddleware(req, res, next) {
    const token = req.cookies?.[SESSION_COOKIE]
    req.user = getSessionUser(database, token) ?? null
    req.sessionToken = req.user ? token : undefined
    return next()
  }
}

/**
 * @param {{ id: string, name: string, email: string }} user
 * @returns {PublicUser}
 */
export function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email }
}
