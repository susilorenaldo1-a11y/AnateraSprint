/**
 * Production server: Express API + static `dist/` build + SPA fallback.
 *
 *   pnpm build && pnpm start
 *
 * Binds 0.0.0.0:PORT (default 5173) so the app works from another device on
 * the LAN. Set COOKIE_SECURE=true when serving over HTTPS.
 */
import fs from 'node:fs'
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'

import express from 'express'

import { createApp } from './app.mjs'
import { PROJECT_ROOT, createDatabase } from './db.mjs'

const PORT = Number.parseInt(process.env.PORT ?? '', 10) || 5173
const HOST = '0.0.0.0'
const DIST_DIR = path.join(PROJECT_ROOT, 'dist')
const INDEX_HTML = path.join(DIST_DIR, 'index.html')

function lanAddresses() {
  const addresses = []
  for (const interfaces of Object.values(os.networkInterfaces())) {
    for (const entry of interfaces ?? []) {
      if (entry.family === 'IPv4' && !entry.internal) addresses.push(entry.address)
    }
  }
  return addresses
}

const database = createDatabase()
console.log(`[anatera] database: ${database.path}`)
console.log(
  `[anatera] demo account: ${database.seededDemoUser ? 'seeded' : 'ready'} (demo@anatera.co)`,
)

const app = createApp(database)
const hasBuild = fs.existsSync(INDEX_HTML)

if (hasBuild) {
  app.use(
    '/assets',
    express.static(path.join(DIST_DIR, 'assets'), { immutable: true, maxAge: '1y' }),
  )
  app.use(express.static(DIST_DIR, { index: false, maxAge: '1h' }))
} else {
  console.warn('[anatera] dist/ build not found — run `pnpm build` before `pnpm start`')
}

// SPA fallback: every non-API GET serves the built index.html.
app.use((req, res, next) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') return next()
  if (req.path === '/api' || req.path.startsWith('/api/')) return next()
  if (!hasBuild) {
    return res
      .status(503)
      .type('text/plain')
      .send('Client build missing. Run `pnpm build` and restart the server.')
  }
  res.set('Cache-Control', 'no-cache')
  return res.sendFile(INDEX_HTML, (error) => {
    if (error && !res.headersSent) next(error)
  })
})

// Errors from static/sendFile land here; API errors are handled inside createApp.
// eslint-disable-next-line no-unused-vars
app.use((error, req, res, next) => {
  if (res.headersSent) return next(error)
  console.error('[anatera] server error:', error)
  res.status(500).type('text/plain').send('Internal Server Error')
})

const server = http.createServer(app)

await new Promise((resolve, reject) => {
  server.once('error', reject)
  server.listen(PORT, HOST, resolve)
})

console.log(`[anatera] production server listening on http://localhost:${PORT}`)
for (const address of lanAddresses()) {
  console.log(`[anatera] LAN: http://${address}:${PORT}`)
}
if (!hasBuild) {
  console.log('[anatera] API is live at /api/health; UI unavailable until `pnpm build` runs')
}
if (process.env.COOKIE_SECURE === 'true') {
  console.log('[anatera] COOKIE_SECURE=true — cookies require HTTPS')
}

let shuttingDown = false
function shutdown(signal) {
  if (shuttingDown) return
  shuttingDown = true
  console.log(`\n[anatera] ${signal} received, shutting down`)
  server.close(() => {
    try {
      database.close()
    } catch {
      // ignore close failures during shutdown
    }
    process.exit(0)
  })
  setTimeout(() => process.exit(0), 3000).unref()
}

process.once('SIGINT', () => shutdown('SIGINT'))
process.once('SIGTERM', () => shutdown('SIGTERM'))
