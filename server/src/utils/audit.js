import { AsyncLocalStorage } from 'node:async_hooks'
import createLogger from './logger.js'

const als = new AsyncLocalStorage()
const baseLogger = createLogger({ area: 'admin', component: 'audit' })

export const runWithAdminContext = (adminId, fn) => {
  return als.run({ adminId }, fn)
}

export const getAdminContext = () => {
  return als.getStore() || { adminId: null }
}

export const audit = (action, meta = {}) => {
  const ctx = getAdminContext()
  const logger = baseLogger.child({ adminId: ctx.adminId })
  logger.info(action, meta)
}

export default { runWithAdminContext, getAdminContext, audit }
