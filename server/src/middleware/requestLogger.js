import crypto from 'crypto'
import { createLogger } from '../utils/logger.js'

export const requestLogger = (req, _res, next) => {
  const start = Date.now()
  const reqId = crypto.randomUUID()
  const userId = req.user?.id || 'anonymous'
  req.log = createLogger({ reqId, userId, route: req.originalUrl, method: req.method })
  req.log.info('request.start')
  _res.on('finish', () => {
    const duration = Date.now() - start
    const status = _res.statusCode
    const length = _res.getHeader('content-length') || undefined
    req.log.info('request.end', { status, duration_ms: duration, content_length: length })
  })
  next()
}

export default requestLogger
