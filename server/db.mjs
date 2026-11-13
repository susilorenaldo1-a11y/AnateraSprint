/**
 * SQLite persistence for Anatera Sprint OS.
 *
 * Uses the Node 24 built-in `node:sqlite` driver (no native dependency).
 * The database file defaults to `data/anatera.db` and can be overridden with
 * the `DATABASE_PATH` environment variable (absolute or relative to the repo
 * root). Parent directories are created automatically.
 */
import { DatabaseSync } from 'node:sqlite'
import { randomUUID } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { hashPassword } from './auth.mjs'

const SERVER_DIR = path.dirname(fileURLToPath(import.meta.url))
export const PROJECT_ROOT = path.resolve(SERVER_DIR, '..')

export const DEFAULT_DATABASE_PATH = path.join(PROJECT_ROOT, 'data', 'anatera.db')

/** Seeded on startup when missing. No workspace is seeded on purpose. */
export const DEMO_USER = Object.freeze({
  name: 'Alex Morgan',
  email: 'demo@anatera.co',
  password: 'Anatera2026!',
})

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL COLLATE NOCASE UNIQUE,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  created_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS workspaces (
  user_id    TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  data       TEXT NOT NULL,
  version    INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);
`

/**
 * @returns {string} absolute path to the SQLite database file
 */
export function resolveDatabasePath() {
  const configured = process.env.DATABASE_PATH?.trim()
  if (!configured) return DEFAULT_DATABASE_PATH
  if (configured === ':memory:') return configured
  return path.isAbsolute(configured) ? configured : path.resolve(PROJECT_ROOT, configured)
}

function ensureParentDirectory(databasePath) {
  if (databasePath === ':memory:') return
  fs.mkdirSync(path.dirname(databasePath), { recursive: true })
}

function isUniqueViolation(error) {
  const message = String(error?.message ?? '')
  return message.includes('UNIQUE constraint failed') || message.includes('PRIMARY KEY')
}

/**
 * Open the database, create the schema and seed the demo account.
 *
 * @param {{ databasePath?: string, seedDemoUser?: boolean }} [options]
 */
export function createDatabase(options = {}) {
  const databasePath = options.databasePath ?? resolveDatabasePath()
  const seedDemo = options.seedDemoUser !== false

  ensureParentDirectory(databasePath)

  const db = new DatabaseSync(databasePath)
  db.exec('PRAGMA foreign_keys = ON;')
  db.exec('PRAGMA busy_timeout = 5000;')
  db.exec('PRAGMA synchronous = NORMAL;')
  if (databasePath !== ':memory:') {
    // WAL improves concurrent read/write behaviour; harmless on the local FS.
    db.exec('PRAGMA journal_mode = WAL;')
  }
  db.exec(SCHEMA)

  const statements = {
    insertUser: db.prepare(
      `INSERT INTO users (id, name, email, password_hash, password_salt, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ),
    userByEmail: db.prepare(
      `SELECT id, name, email, password_hash, password_salt, created_at
       FROM users WHERE email = ?`,
    ),
    userById: db.prepare(`SELECT id, name, email, created_at FROM users WHERE id = ?`),
    insertSession: db.prepare(
      `INSERT INTO sessions (token_hash, user_id, created_at, expires_at)
       VALUES (?, ?, ?, ?)`,
    ),
    sessionUser: db.prepare(
      `SELECT s.token_hash, s.expires_at, u.id, u.name, u.email
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = ?`,
    ),
    deleteSession: db.prepare(`DELETE FROM sessions WHERE token_hash = ?`),
    deleteExpiredSessions: db.prepare(`DELETE FROM sessions WHERE expires_at <= ?`),
    workspaceByUser: db.prepare(
      `SELECT data, version, updated_at FROM workspaces WHERE user_id = ?`,
    ),
    upsertWorkspace: db.prepare(
      `INSERT INTO workspaces (user_id, data, version, updated_at)
       VALUES (?, ?, 1, ?)
       ON CONFLICT(user_id) DO UPDATE SET
         data = excluded.data,
         version = workspaces.version + 1,
         updated_at = excluded.updated_at`,
    ),
  }

  // Housekeeping: drop stale sessions so the table does not grow forever.
  statements.deleteExpiredSessions.run(new Date().toISOString())

  const users = {
    create({ name, email, passwordHash, passwordSalt }) {
      const id = randomUUID()
      const createdAt = new Date().toISOString()
      statements.insertUser.run(id, name, email, passwordHash, passwordSalt, createdAt)
      return { id, name, email, createdAt }
    },
    /** @returns {null | { id, name, email, password_hash, password_salt, created_at }} */
    findByEmail(email) {
      return statements.userByEmail.get(email) ?? null
    },
    /** @returns {null | { id, name, email, created_at }} */
    findById(id) {
      return statements.userById.get(id) ?? null
    },
  }

  const sessions = {
    create({ tokenHash, userId, createdAt, expiresAt }) {
      statements.insertSession.run(
        tokenHash,
        userId,
        createdAt ?? new Date().toISOString(),
        expiresAt,
      )
    },
    /** @returns {null | { id, name, email, expires_at }} */
    findUser(tokenHash, now = Date.now()) {
      const row = statements.sessionUser.get(tokenHash)
      if (!row) return null
      const expiresAt = Date.parse(row.expires_at)
      if (!Number.isFinite(expiresAt) || expiresAt <= now) {
        statements.deleteSession.run(tokenHash)
        return null
      }
      return row
    },
    delete(tokenHash) {
      statements.deleteSession.run(tokenHash)
    },
    deleteExpired(now = new Date().toISOString()) {
      statements.deleteExpiredSessions.run(now)
    },
  }

  const workspaces = {
    /** @returns {null | { data: string, version: number, updatedAt: string }} */
    get(userId) {
      const row = statements.workspaceByUser.get(userId)
      if (!row) return null
      return { data: row.data, version: Number(row.version), updatedAt: row.updated_at }
    },
    /** @returns {{ version: number, updatedAt: string }} */
    save(userId, json) {
      const updatedAt = new Date().toISOString()
      statements.upsertWorkspace.run(userId, json, updatedAt)
      const row = statements.workspaceByUser.get(userId)
      return { version: Number(row.version), updatedAt: row.updated_at }
    },
  }

  function seedDemoUser() {
    if (users.findByEmail(DEMO_USER.email)) return false
    const { hash, salt } = hashPassword(DEMO_USER.password)
    try {
      users.create({
        name: DEMO_USER.name,
        email: DEMO_USER.email,
        passwordHash: hash,
        passwordSalt: salt,
      })
      return true
    } catch (error) {
      // Another process seeded concurrently: that is fine.
      if (isUniqueViolation(error)) return false
      throw error
    }
  }

  let seeded = false
  if (seedDemo) seeded = seedDemoUser()

  let closed = false

  return {
    db,
    path: databasePath,
    seededDemoUser: seeded,
    users,
    sessions,
    workspaces,
    close() {
      if (closed) return
      closed = true
      db.close()
    },
  }
}
