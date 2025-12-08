import crypto from 'crypto'
import { createLogger } from '../utils/logger.js'

const INCLUDE_REQ = String(process.env.LOG_INCLUDE_REQ || 'true').toLowerCase() === 'true'
const INCLUDE_RESP = String(process.env.LOG_INCLUDE_RESP || 'true').toLowerCase() === 'true'
const HIDDEN = ['authorization','apikey','llm_api_key','password','secret','token']
const deepRedact = (obj) => {
  if (!obj || typeof obj !== 'object') return obj
  if (Array.isArray(obj)) return obj.map((v) => deepRedact(v))
  const out = {}
  for (const k of Object.keys(obj)) {
    const v = obj[k]
    if (HIDDEN.includes(k.toLowerCase())) out[k] = '******'
    else if (typeof v === 'string') out[k] = v
    else if (v && typeof v === 'object') out[k] = deepRedact(v)
    else out[k] = v
  }
  return out
}

export const requestLogger = (req, _res, next) => {
  const start = Date.now()
  const reqId = crypto.randomUUID()
  req.log = createLogger({ reqId, route: req.originalUrl, method: req.method })
  const originalSend = _res.send?.bind(_res)
  if (originalSend) {
    _res.send = (body) => {
      try {
        if (INCLUDE_RESP) {
          let preview
          if (Buffer.isBuffer(body)) preview = body.toString('utf8')
          else if (typeof body === 'string') preview = body
          else preview = JSON.stringify(body)
          _res.locals = _res.locals || {}
          if (req.method === 'GET' || req.method === 'DELETE') {
            try {
              let parsed
              if (typeof body === 'string') parsed = JSON.parse(preview)
              else parsed = body
              let summary = null
              if (parsed && typeof parsed === 'object') {
                const items = Array.isArray(parsed) ? parsed : Array.isArray(parsed.items) ? parsed.items : null
                if (items) {
                  const top = items.slice(0, 3)
                  const ids = top.map((it) => (typeof it === 'object' ? it.id : it))
                  summary = { count: Array.isArray(items) ? items.length : undefined, ids }
                }
              }
              _res.locals.__resp_preview = summary ? JSON.stringify(summary) : (preview.length > 200 ? `${preview.slice(0, 200)}...` : preview)
            } catch {
              _res.locals.__resp_preview = (preview.length > 200 ? `${preview.slice(0, 200)}...` : preview)
            }
          } else {
            _res.locals.__resp_preview = preview
          }
        }
      } catch {}
      return originalSend(body)
    }
  }
  _res.on('finish', () => {
    const duration = Date.now() - start
    const status = _res.statusCode
    const length = _res.getHeader('content-length') || undefined
    const uid = req.user?.id || 'anonymous'
    req.log = req.log.child({ userId: uid })
    const resp_preview = _res.locals?.__resp_preview
    const endMeta = { status, duration_ms: duration, content_length: length }
    if (INCLUDE_RESP && typeof resp_preview !== 'undefined') endMeta.resp_preview = resp_preview
    req.log.info('request.end', endMeta)
  })
  next()
  const uid = req.user?.id || 'anonymous'
  req.log = req.log.child({ userId: uid })
  const startMeta = {}
  if (INCLUDE_REQ) {
    startMeta.params = deepRedact(req.params || {})
    startMeta.query = deepRedact(req.query || {})
    startMeta.body = deepRedact(req.body || {})
  }
  req.log.info('request.start', startMeta)
}

export default requestLogger
