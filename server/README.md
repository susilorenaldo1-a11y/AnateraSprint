# Anatera backend

Self-hosted Node/Express API with SQLite persistence and cookie sessions. No
native modules: SQLite comes from Node 24's built-in `node:sqlite`.

## Run

```bash
pnpm install
pnpm dev      # Express API + Vite middleware (HMR) on http://0.0.0.0:5173
pnpm build    # tsc --noEmit && vite build
pnpm start    # Express API + dist/ static + SPA fallback on http://0.0.0.0:5173
```

The servers bind `0.0.0.0`, so a phone/laptop on the same LAN can open
`http://<your-lan-ip>:5173`. The app and API share one origin, so cookies are
same-origin and no CORS configuration is needed.

## Environment

| Variable        | Default            | Purpose                                                              |
| --------------- | ------------------ | -------------------------------------------------------------------- |
| `PORT`          | `5173`             | HTTP port.                                                           |
| `DATABASE_PATH` | `data/anatera.db`  | SQLite file (relative paths resolve from the repo root). Parent dirs are created. |
| `COOKIE_SECURE` | unset              | Set to `true` only behind HTTPS; adds `Secure` to the session cookie. |

`data/` is gitignored. Delete the file to reset all accounts and workspaces.

## Demo account

Seeded on startup when missing (no workspace is seeded — the client saves it on
first load):

```
email:    demo@anatera.co
password: Anatera2026!
name:     Alex Morgan
```

## API

All responses are JSON except `204` logout and static files.

| Method | Path                 | Auth | Success                        |
| ------ | -------------------- | ---- | ------------------------------ |
| GET    | `/api/health`        | no   | `200 { ok: true }`             |
| POST   | `/api/auth/signup`   | no   | `201 { user }` + session cookie |
| POST   | `/api/auth/login`    | no   | `200 { user }` + session cookie |
| GET    | `/api/auth/me`       | yes  | `200 { user }`                  |
| POST   | `/api/auth/logout`   | no   | `204` (clears cookie)           |
| GET    | `/api/workspace`     | yes  | `200 { data, version, updatedAt }` |
| PUT    | `/api/workspace`     | yes  | `200 { saved: true, version, updatedAt }` |

`user` is `{ id, name, email }`. A new account's workspace is
`{ data: null, version: 0, updatedAt: null }`.

`PUT /api/workspace` accepts `{ "data": { ... } }` (a JSON object), limits the
body to 30 MB (base64 proposal/agreement files fit), replaces the snapshot,
increments `version` and sets `updatedAt` to an ISO timestamp. Last write wins.

Error shape is `{ "error": "message", "code": "CODE" }`:

| Status | Code                 | When                                              |
| ------ | -------------------- | ------------------------------------------------- |
| 400    | `INVALID_NAME` / `INVALID_EMAIL` / `WEAK_PASSWORD` | Signup validation                |
| 400    | `INVALID_DATA`       | `PUT /api/workspace` body is not `{ data: object }` |
| 400    | `INVALID_JSON`       | Malformed JSON body                               |
| 401    | `INVALID_CREDENTIALS`| Wrong email/password                              |
| 401    | `UNAUTHORIZED`       | Missing/expired session on a protected route      |
| 404    | `NOT_FOUND`          | Unknown `/api/*` route                            |
| 409    | `EMAIL_TAKEN`        | Signup with an existing email                     |
| 413    | `PAYLOAD_TOO_LARGE`  | Body over 30 MB                                   |
| 500    | `INTERNAL_ERROR`     | Unexpected server error                           |

## Sessions

Cookie `anatera_session`: `HttpOnly`, `SameSite=Lax`, `Path=/`, 30-day expiry,
`Secure` only when `COOKIE_SECURE=true`. Tokens are 32 random bytes
(base64url); the database stores only their SHA-256 digest, with `expires_at`.
Expired sessions are pruned on startup and lazily on lookup. Passwords use
scrypt with a per-user 16-byte salt and `timingSafeEqual` verification.

## Files

```text
server/
  db.mjs     SQLite schema, prepared statements, demo user seeding
  auth.mjs   scrypt hashing, session tokens, cookie helpers, requireAuth
  app.mjs    createApp(database) -> Express app with /api routes
  dev.mjs    API + Vite middleware mode (HMR) on one HTTP server
  index.mjs  Production API + dist/ static + SPA fallback
```

## Frontend integration notes

- Call the API with same-origin relative URLs (`fetch('/api/workspace')`) and
  `credentials: 'same-origin'` (the default for same-origin requests).
- Bootstrap with `GET /api/auth/me`: `401` means show the auth screen.
- On first successful load with `data: null`, generate/save the demo workspace
  with `PUT /api/workspace`; it becomes version 1.
- `PUT` replaces the whole snapshot, so debounce saves or save on change.
- After signup/login the cookie is already set; there is no token to store.
- `GET /api/workspace` also works from a second browser/device after login,
  because snapshots are keyed by user id, not by localStorage.
