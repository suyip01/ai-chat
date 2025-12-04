import fs from 'fs'

const LEVELS = ['debug','info','warn','error']
const LEVEL_IDX = LEVELS.indexOf(process.env.LOG_LEVEL || 'info')
const PRETTY = String(process.env.LOG_PRETTY || '').toLowerCase() === 'true'

const redact = (obj) => {
  if (!obj || typeof obj !== 'object') return obj
  const hidden = ['authorization','apikey','llm_api_key','password','secret','token']
  const out = {}
  for (const k of Object.keys(obj)) {
    const v = obj[k]
    if (hidden.includes(k.toLowerCase())) out[k] = '******'
    else if (typeof v === 'string' && v.length > 200) out[k] = v.slice(0,200) + `...(${v.length})`
    else out[k] = v
  }
  return out
}

const write = (level, payload) => {
  const ts = new Date().toISOString()
  const line = { timestamp: ts, level, ...payload }
  if (PRETTY) {
    const msg = line.msg ? ` ${line.msg}` : ''
    const ctx = { ...line }
    delete ctx.timestamp; delete ctx.level; delete ctx.msg
    process.stdout.write(`[${ts}] ${level.toUpperCase()}${msg} ${JSON.stringify(ctx)}\n`)
  } else {
    process.stdout.write(JSON.stringify(line) + '\n')
  }
}

export const createLogger = (context = {}) => {
  const base = redact(context)
  const log = (level, msg, meta) => {
    const idx = LEVELS.indexOf(level)
    if (idx < 0 || idx < LEVEL_IDX) return
    const payload = { ...base, msg, ...(meta ? redact(meta) : {}) }
    write(level, payload)
  }
  return {
    child: (ctx) => createLogger({ ...base, ...(ctx || {}) }),
    debug: (msg, meta) => log('debug', msg, meta),
    info: (msg, meta) => log('info', msg, meta),
    warn: (msg, meta) => log('warn', msg, meta),
    error: (msg, meta) => log('error', msg, meta),
  }
}

export default createLogger
