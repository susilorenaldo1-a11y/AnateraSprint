# Anatera Sprint OS

An internal project management, commercial workflow and 2-week sprint tracking workspace for Anatera's 14-day delivery cadence. It combines a project health dashboard, proposal-to-kickoff workflow, drag-and-drop Kanban board, synchronized sprint calendar, and a permanent sprint archive in one account-backed app.

## Run it

```bash
pnpm install
pnpm dev
```

The full-stack dev server runs the Express API and Vite HMR on one origin:

- Local: `http://localhost:5173`
- LAN: `http://<your-lan-ip>:5173` (printed on startup)

```bash
pnpm build     # strict TypeScript check + production build
pnpm start     # Express API + dist/ static + SPA fallback
```

No external database server is required. Workspace snapshots are stored in SQLite at `data/anatera.db` using Node 24's built-in `node:sqlite`.

## Accounts & cross-device sync

The app opens on an account screen. Credentials are stored in SQLite with scrypt-hashed passwords and secure 30-day cookie sessions.

**Demo account**

```text
email:    demo@anatera.co
password: Anatera2026!
```

A new account starts with the Anatera demo workspace and automatically saves it to that account. Changes are debounced into the workspace database and other signed-in devices poll for updates, so the same account sees the current project state on another device. JSON export/import remains available for hard backups.

Cross-device sync requires the app server to be reachable from the other device. The dev and production servers bind `0.0.0.0`, so another phone/laptop on the same network can use the LAN URL. For internet access, deploy the app behind HTTPS and set `COOKIE_SECURE=true`.

## Vercel + Neon deployment

The repository is ready for Vercel:

- Static React build: `dist/`
- API: Vercel Node functions under `api/`
- Database: Neon Postgres (connected through the Vercel Neon integration, exposed as `DATABASE_URL`)
- Document storage: Vercel Blob (`BLOB_READ_WRITE_TOKEN`)
- `vercel.json` sets the Vite framework, build/output paths, API duration and SPA rewrites.

```bash
vercel link
vercel env pull .env.local
vercel deploy          # preview
vercel deploy --prod   # production
```

`COOKIE_SECURE=true` is set for Production and Preview. The local `pnpm dev` server remains SQLite-backed for zero-dependency development; the deployed app uses Neon and Blob automatically.


## What's included

- **Projects Overview** — active project count, cross-project sprint pulse, project health cards, blockers, team avatars, attention queue, upcoming handovers, and a compact delivery calendar.
- **Client & project records** — client company, main contact person, role, email, phone, address, project type, contract value, currency, start/target dates and delivery objectives.
- **Proposal-to-kickoff flow** — proposal upload and submission, signed agreement upload, 50% upfront → 40% after completion → 10% three-month retention payment schedule, and gated project kickoff.
- **Kanban Board** — Backlog, To Do, In Progress, Review/QA and Done lanes with `@dnd-kit` drag-and-drop, project/sprint/assignee/priority filters, search and rich task cards.
- **Task Drawer** — editable title, description, status, priority, assignee, story points, blocked state, start/due dates, checklists, account-aware comments and delete.
- **Sprint Calendar** — a default 14-day timeline with project swimlanes, Day 7 check-in and Day 14 handover milestones, plus a monthly calendar with sprint start/end markers and task deadlines. Drag deadline chips or timeline bars to reschedule.
- **Sprint Archive** — completed sprint history, velocity, story points shipped and per-project delivery groups.
- **Sprint engine** — new sprints default to start + 13 days, with manual override and a warning for non-standard windows.
- **Dark mode** — persisted light/dark/system themes with dark-specific tokens and component surface remapping.
- **Bahasa Indonesia** — persisted English/Indonesian interface with localized dates, statuses, priorities, navigation and workflow copy. Demo project/task content remains intact as editable data.
- **Command-first UI** — persistent sidebar, `C` to create a task, `⌘/Ctrl + K` command palette, project and sprint switchers, preferences menu and quick language toggle.

## Data model

The workspace snapshot contains:

- `projects` — identity, client contact, project details, and the proposal/agreement/payment/kickoff workflow.
- `sprints` — sequential 14-day windows with status, goal and dates.
- `tasks` — Kanban status, dates, points, checklists, comments, blockers and ordering.
- `members` — the delivery team plus the signed-in workspace owner.

Documents are stored as data URLs in the workspace snapshot (8 MB per file) and sync through the workspace API. The server accepts snapshots up to 30 MB.

## Structure

```text
api/                Vercel serverless endpoints backed by Neon Postgres and Vercel Blob
server/             Local Express API, SQLite schema/session auth, Vite and production servers
src/auth/           Session provider and account screen
src/components/     App shell, project workspace, Kanban, calendar, drawer and dialogs
src/data/seed.ts    Realistic Anatera 2-week sprint demo data
src/i18n/           English/Indonesian translation and language provider
src/lib/            Date, scope, progress, workflow and normalization logic
src/pages/          Overview, Board, Calendar, Archive
src/store/          Account-backed workspace store with local cache and live polling
src/theme/          Persisted theme provider
src/types.ts        Project, Sprint, Task, TeamMember and workflow interfaces
src/globals.css     Anatera design tokens, shared styles and dark theme remapping
```

## Brand tokens

All core brand values live in the `:root` block at the top of `src/globals.css`. Replacing the canvas, surface, border, ink, accent, semantic status, radius, shadow and motion variables updates the whole product. Dark values live in the adjacent `.dark` token block.
