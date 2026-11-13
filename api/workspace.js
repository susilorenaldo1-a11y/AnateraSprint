import { getSql } from '../server/vercel-db.mjs'
import {
  JSON_BODY_LIMIT,
  isPlainObject,
  readJsonBody,
  requireUser,
  sendError,
  sendJson,
} from '../server/vercel-auth.mjs'

export default async function handler(req, res) {
  try {
    const sql = await getSql()
    const user = await requireUser(sql, req, res)
    if (!user) return

    if (req.method === 'GET') {
      const rows = await sql`
        SELECT data, version, updated_at
        FROM workspaces
        WHERE user_id = ${user.id}
        LIMIT 1
      `
      if (rows.length === 0) {
        return sendJson(res, 200, { data: null, version: 0, updatedAt: null })
      }
      return sendJson(res, 200, {
        data: rows[0].data,
        version: Number(rows[0].version),
        updatedAt: new Date(rows[0].updated_at).toISOString(),
      })
    }

    if (req.method === 'PUT') {
      const body = isPlainObject(req.body) ? req.body : await readJsonBody(req)
      if (!isPlainObject(body?.data)) {
        return sendError(res, 400, 'Request body must be a JSON object shaped like { data: object }', 'INVALID_DATA', {
          field: 'data',
        })
      }
      const json = JSON.stringify(body.data)
      if (Buffer.byteLength(json, 'utf8') > JSON_BODY_LIMIT) {
        return sendError(res, 413, 'Workspace snapshot is too large', 'PAYLOAD_TOO_LARGE')
      }
      const rows = await sql`
        INSERT INTO workspaces (user_id, data, version, updated_at)
        VALUES (${user.id}, ${json}::jsonb, 1, NOW())
        ON CONFLICT (user_id) DO UPDATE SET
          data = EXCLUDED.data,
          version = workspaces.version + 1,
          updated_at = NOW()
        RETURNING version, updated_at
      `
      return sendJson(res, 200, {
        saved: true,
        version: Number(rows[0].version),
        updatedAt: new Date(rows[0].updated_at).toISOString(),
      })
    }

    return sendError(res, 405, 'Method not allowed', 'METHOD_NOT_ALLOWED')
  } catch (error) {
    console.error('[anatera] workspace error:', error)
    if (error?.code === 'PAYLOAD_TOO_LARGE') {
      return sendError(res, 413, 'Workspace snapshot is too large', 'PAYLOAD_TOO_LARGE')
    }
    if (error instanceof SyntaxError) {
      return sendError(res, 400, 'Malformed JSON body', 'INVALID_JSON')
    }
    return sendError(res, 500, 'Internal server error', 'INTERNAL_ERROR')
  }
}

