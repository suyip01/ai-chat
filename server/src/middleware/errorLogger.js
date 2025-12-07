import { createLogger } from '../utils/logger.js'

export const errorLogger = (err, req, res, next) => {
  try {
    const logger = req?.log || createLogger({ route: req?.originalUrl, method: req?.method, userId: req?.user?.id })
    const ctx = {
      params: req?.params,
      query: req?.query,
      body: req?.body,
      status: res?.statusCode
    }
    logger.error('request.error', { message: err?.message, stack: err?.stack, ctx })
  } catch {}
  res.status(500).json({ error: 'server_error' })
}

export default errorLogger
