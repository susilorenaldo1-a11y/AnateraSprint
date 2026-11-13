import { put } from '@vercel/blob'
import { getSql } from '../server/vercel-db.mjs'
import {
  MAX_UPLOAD_BYTES,
  readRawBody,
  requireUser,
  sendError,
  sendJson,
} from '../server/vercel-auth.mjs'

function safeFileName(name) {
  return String(name || 'document')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120) || 'document'
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return sendError(res, 405, 'Method not allowed', 'METHOD_NOT_ALLOWED')
  }
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return sendError(res, 501, 'Document storage is not configured', 'STORAGE_UNAVAILABLE')
  }

  try {
    const sql = await getSql()
    const user = await requireUser(sql, req, res)
    if (!user) return

    const raw = await readRawBody(req)
    if (raw.length === 0) {
      return sendError(res, 400, 'No file was provided', 'EMPTY_FILE')
    }
    if (raw.length > MAX_UPLOAD_BYTES) {
      return sendError(res, 413, 'File is larger than the 4 MB limit', 'FILE_TOO_LARGE')
    }

    const encodedName = req.headers['x-file-name']
    let fileName = 'document'
    try {
      fileName = decodeURIComponent(String(encodedName || 'document'))
    } catch {
      fileName = String(encodedName || 'document')
    }
    const cleanName = safeFileName(fileName)
    const contentType = String(req.headers['x-file-type'] || 'application/octet-stream')
    const blob = await put(`anatera/${user.id}/${Date.now()}-${cleanName}`, raw, {
      access: 'public',
      contentType,
      addRandomSuffix: true,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    })

    return sendJson(res, 200, {
      document: {
        name: fileName,
        mimeType: contentType,
        size: raw.length,
        url: blob.url,
        uploadedAt: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error('[anatera] upload error:', error)
    return sendError(res, 500, 'Upload failed', 'UPLOAD_FAILED')
  }
}

