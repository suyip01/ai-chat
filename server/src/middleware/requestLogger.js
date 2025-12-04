import crypto from 'crypto'
import { createLogger } from '../utils/logger.js'

export const requestLogger = (req, _res, next) => {
  const start = Date.now()
  const reqId = crypto.randomUUID()
  req.log = createLogger({ reqId, route: req.originalUrl, method: req.method })
  _res.on('finish', () => {
    const duration = Date.now() - start
    const status = _res.statusCode
    const length = _res.getHeader('content-length') || undefined
    const uid = req.user?.id || 'anonymous'
    req.log = req.log.child({ userId: uid })
    req.log.info('request.end', { status, duration_ms: duration, content_length: length })
  })
  next()
  const uid = req.user?.id || 'anonymous'
  req.log = req.log.child({ userId: uid })
  req.log.info('request.start')
}

export default requestLogger
