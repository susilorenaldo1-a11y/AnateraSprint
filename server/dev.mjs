/**
 * Full-stack development server.
 *
 * Express serves `/api/*` on the same origin, then Vite runs in middleware mode
 * on the same HTTP server so page routes, HMR and the API share one port.
 * Bind to 0.0.0.0 so other devices on the LAN can reach the app.
 */
import http from 'node:http'
import os from 'node:os'

import { createServer as createViteServer } from 'vite'

import { createApp } from './app.mjs'
import { createDatabase } from './db.mjs'

const PORT = Number.parseInt(process.env.PORT ?? '', 10) || 5173
const HOST = '0.0.0.0'
const isProductionCookie = process.env.COOKIE_SECURE === 'true'

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
const server = http.createServer(app)

const vite = await createViteServer({
  server: {
    middlewareMode: true,
    hmr: { server },
    // The dev server is intentionally reachable by LAN hostname/IP.
    allowedHosts: true,
  },
  appType: 'spa',
})

// API routes are registered before this, so /api/* never reaches Vite.
app.use(vite.middlewares)

// Last-resort handler for anything Vite throws outside its own error handling.
app.use((error, req, res, next) => {
  if (res.headersSent) return next(error)
  console.error('[anatera] dev server error:', error)
  res.status(500).type('text/plain').send('Internal Server Error')
})

await new Promise((resolve, reject) => {
  server.once('error', reject)
  server.listen(PORT, HOST, resolve)
})

console.log(`[anatera] dev server listening on http://localhost:${PORT}`)
for (const address of lanAddresses()) {
  console.log(`[anatera] LAN: http://${address}:${PORT}`)
}
if (isProductionCookie) {
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
