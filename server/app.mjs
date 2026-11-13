/**
 * Express application factory: JSON API for auth and workspace snapshots.
 *
 * `createApp(database)` returns an app with every `/api/*` route registered.
 * Callers (dev.mjs / index.mjs) mount any additional middleware after it.
 */
import express from 'express'
import cookieParser from 'cookie-parser'

import {
  SESSION_COOKIE,
  clearSessionCookie,
  createSessionToken,
  hashPassword,
  hashSessionToken,
  publicUser,
  requireAuth,
  sessionExpiry,
  setSessionCookie,
  verifyPassword,
} from './auth.mjs'

/** 30 MB of JSON; proposals/agreements are stored as base64 data URLs. */
export const JSON_BODY_LIMIT = '30mb'
const MAX_BODY_BYTES = 30 * 1024 * 1024

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MAX_NAME_LENGTH = 120
const MAX_EMAIL_LENGTH = 254
const MIN_PASSWORD_LENGTH = 8
const MAX_PASSWORD_LENGTH = 1024

/**
 * Dummy verifier used when the email does not exist, so login latency does not
 * reveal whether an account is registered.
 */
const DUMMY_CREDENTIALS = hashPassword('anatera-dummy-password-for-timing')

const INVALID_CREDENTIALS = Object.freeze({
  error: 'Invalid email or password',
  code: 'INVALID_CREDENTIALS',
})

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function normalizeEmail(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : ''
}

function isUniqueViolation(error) {
  const message = String(error?.message ?? '')
  return message.includes('UNIQUE constraint failed') || message.includes('PRIMARY KEY')
}

function validationError(res, field, message, code) {
  return res.status(400).json({ error: message, code, field })
}

function issueSession(database, res, userId) {
  const token = createSessionToken()
  const tokenHash = hashSessionToken(token)
  database.sessions.create({
    tokenHash,
    userId,
    createdAt: new Date().toISOString(),
    expiresAt: sessionExpiry(),
  })
  setSessionCookie(res, token)
  return token
}

/**
 * @param {ReturnType<typeof import('./db.mjs').createDatabase>} database
 * @returns {import('express').Express}
 */
export function createApp(database) {
  if (!database?.db || !database?.users || !database?.sessions || !database?.workspaces) {
    throw new TypeError('createApp(database) requires the object returned by createDatabase()')
  }

  const app = express()
  app.disable('x-powered-by')

  app.use(cookieParser())
  app.use(express.json({ limit: JSON_BODY_LIMIT, strict: true }))
  app.use('/api', (req, res, next) => {
    res.set('Cache-Control', 'no-store')
    res.set('X-Content-Type-Options', 'nosniff')
    next()
  })

  const auth = requireAuth(database)

  // ---------------------------------------------------------------- health --
  app.get('/api/health', (req, res) => {
    res.json({ ok: true })
  })

  // ---------------------------------------------------------------- signup --
  app.post('/api/auth/signup', (req, res, next) => {
    try {
      const body = isPlainObject(req.body) ? req.body : {}
      const name = typeof body.name === 'string' ? body.name.trim() : ''
      const email = normalizeEmail(body.email)
      const password = typeof body.password === 'string' ? body.password : ''

      if (!name) {
        return validationError(res, 'name', 'Name is required', 'INVALID_NAME')
      }
      if (name.length > MAX_NAME_LENGTH) {
        return validationError(
          res,
          'name',
          `Name must be ${MAX_NAME_LENGTH} characters or fewer`,
          'INVALID_NAME',
        )
      }
      if (!email || email.length > MAX_EMAIL_LENGTH || !EMAIL_PATTERN.test(email)) {
        return validationError(res, 'email', 'A valid email address is required', 'INVALID_EMAIL')
      }
      if (password.length < MIN_PASSWORD_LENGTH) {
        return validationError(
          res,
          'password',
          `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
          'WEAK_PASSWORD',
        )
      }
      if (password.length > MAX_PASSWORD_LENGTH) {
        return validationError(
          res,
          'password',
          `Password must be ${MAX_PASSWORD_LENGTH} characters or fewer`,
          'WEAK_PASSWORD',
        )
      }
      if (database.users.findByEmail(email)) {
        return res.status(409).json({ error: 'An account with this email already exists', code: 'EMAIL_TAKEN' })
      }

      const { hash, salt } = hashPassword(password)
      let user
      try {
        user = database.users.create({
          name,
          email,
          passwordHash: hash,
          passwordSalt: salt,
        })
      } catch (error) {
        if (isUniqueViolation(error)) {
          return res.status(409).json({ error: 'An account with this email already exists', code: 'EMAIL_TAKEN' })
        }
        throw error
      }

      issueSession(database, res, user.id)
      return res.status(201).json({ user: publicUser(user) })
    } catch (error) {
      return next(error)
    }
  })

  // ----------------------------------------------------------------- login --
  app.post('/api/auth/login', (req, res, next) => {
    try {
      const body = isPlainObject(req.body) ? req.body : {}
      const email = normalizeEmail(body.email)
      const password = typeof body.password === 'string' ? body.password : ''

      const record = email ? database.users.findByEmail(email) : null
      if (!record) {
        // Constant-ish work factor even for unknown accounts.
        verifyPassword(password, DUMMY_CREDENTIALS.salt, DUMMY_CREDENTIALS.hash)
        return res.status(401).json(INVALID_CREDENTIALS)
      }
      if (!verifyPassword(password, record.password_salt, record.password_hash)) {
        return res.status(401).json(INVALID_CREDENTIALS)
      }

      issueSession(database, res, record.id)
      return res.json({ user: publicUser(record) })
    } catch (error) {
      return next(error)
    }
  })

  // -------------------------------------------------------------------- me --
  app.get('/api/auth/me', auth, (req, res) => {
    res.json({ user: publicUser(req.user) })
  })

  // ---------------------------------------------------------------- logout --
  app.post('/api/auth/logout', (req, res) => {
    const token = req.cookies?.[SESSION_COOKIE]
    if (token) {
      try {
        database.sessions.delete(hashSessionToken(token))
      } catch {
        // Logout must stay idempotent even if the session row is already gone.
      }
    }
    clearSessionCookie(res)
    res.status(204).end()
  })

  // ------------------------------------------------------------- workspace --
  app.get('/api/workspace', auth, (req, res, next) => {
    try {
      const row = database.workspaces.get(req.user.id)
      if (!row) {
        return res.json({ data: null, version: 0, updatedAt: null })
      }
      let data = null
      try {
        data = JSON.parse(row.data)
      } catch {
        // A corrupt snapshot should not break the client; treat it as empty.
        data = null
      }
      return res.json({ data, version: row.version, updatedAt: row.updatedAt })
    } catch (error) {
      return next(error)
    }
  })

  app.put('/api/workspace', auth, (req, res, next) => {
    try {
      const body = isPlainObject(req.body) ? req.body : {}
      if (!isPlainObject(body.data)) {
        return res.status(400).json({
          error: 'Request body must be a JSON object shaped like { data: object }',
          code: 'INVALID_DATA',
          field: 'data',
        })
      }

      let json
      try {
        json = JSON.stringify(body.data)
      } catch {
        return res.status(400).json({ error: 'Workspace data is not serializable', code: 'INVALID_DATA', field: 'data' })
      }
      if (typeof json !== 'string') {
        return res.status(400).json({ error: 'Workspace data is not serializable', code: 'INVALID_DATA', field: 'data' })
      }
      if (Buffer.byteLength(json, 'utf8') > MAX_BODY_BYTES) {
        return res.status(413).json({ error: 'Workspace snapshot is too large', code: 'PAYLOAD_TOO_LARGE' })
      }

      const saved = database.workspaces.save(req.user.id, json)
      return res.json({ saved: true, version: saved.version, updatedAt: saved.updatedAt })
    } catch (error) {
      return next(error)
    }
  })

  // --------------------------------------------------------- api fallthrough --
  app.use('/api', (req, res) => {
    res.status(404).json({ error: 'Not found', code: 'NOT_FOUND' })
  })

  // ------------------------------------------------------------ error handler --
  // eslint-disable-next-line no-unused-vars
  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error)

    if (error?.type === 'entity.too.large') {
      return res.status(413).json({ error: 'Request body too large', code: 'PAYLOAD_TOO_LARGE' })
    }
    if (error?.type === 'entity.parse.failed') {
      return res.status(400).json({ error: 'Malformed JSON body', code: 'INVALID_JSON' })
    }

    const status = Number.isInteger(error?.status) && error.status >= 400 && error.status < 600
      ? error.status
      : 500
    if (status >= 500) {
      console.error('[anatera] API error:', error)
      return res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' })
    }
    return res.status(status).json({
      error: error?.message || 'Request failed',
      code: error?.code || 'REQUEST_ERROR',
    })
  })

  return app
}
