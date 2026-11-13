/**
 * Postgres persistence for the Vercel serverless deployment.
 *
 * The local development server uses SQLite (server/db.mjs). Production on
 * Vercel uses the Neon Postgres resource connected to the project; the schema
 * and API surface are intentionally the same.
 */
import { neon } from '@neondatabase/serverless'
import { randomUUID } from 'node:crypto'
import { hashPassword } from './auth.mjs'

export const DEMO_USER = Object.freeze({
  name: 'Alex Morgan',
  email: 'demo@anatera.co',
  password: 'Anatera2026!',
})

let readyPromise = null

function connectionString() {
  return process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL || ''
}

async function seedDemoUser(sql) {
  const existing = await sql`SELECT id FROM users WHERE email = ${DEMO_USER.email} LIMIT 1`
  if (existing.length > 0) return
  const { hash, salt } = hashPassword(DEMO_USER.password)
  await sql`
    INSERT INTO users (id, name, email, password_hash, password_salt)
    VALUES (${randomUUID()}, ${DEMO_USER.name}, ${DEMO_USER.email}, ${hash}, ${salt})
    ON CONFLICT (email) DO NOTHING
  `
}

async function initialize() {
  const url = connectionString()
  if (!url) {
    throw new Error('DATABASE_URL is not configured. Connect a Neon/Postgres resource to the Vercel project.')
  }

  const sql = neon(url)
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      password_salt TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `
  await sql`
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      expires_at TIMESTAMPTZ NOT NULL
    )
  `
  await sql`CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)`
  await sql`CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at)`
  await sql`
    CREATE TABLE IF NOT EXISTS workspaces (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      data JSONB NOT NULL,
      version INTEGER NOT NULL DEFAULT 0,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `
  await seedDemoUser(sql)
  return sql
}

export function getSql() {
  if (!readyPromise) readyPromise = initialize()
  return readyPromise
}

export function databaseIsConfigured() {
  return Boolean(connectionString())
}
