import fs from 'fs'
import path from 'path'

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
    else out[k] = v
  }
  return out
}

const LOG_DIR = process.env.LOG_DIR || path.join(process.cwd(), 'server', 'src', 'logs')
try { fs.mkdirSync(LOG_DIR, { recursive: true }) } catch {}
const streams = {}
const streamFor = (category, level) => {
  const key = `${category}-${level}`
  if (!streams[key]) {
    const file = path.join(LOG_DIR, `${category}-${level}.log`)
    streams[key] = fs.createWriteStream(file, { flags: 'a' })
  }
  return streams[key]
}
const categoryOf = (payload) => {
  const ctx = payload || {}
  const area = (ctx.area || ctx.component || '').toString().toLowerCase()
  if (area.includes('admin')) return 'admin'
  if (typeof ctx.adminId !== 'undefined' && ctx.adminId !== null) return 'admin'
  const msg = (ctx.msg || '').toString().toLowerCase()
  if (msg.startsWith('admin_')) return 'admin'
  return 'user'
}

const write = (level, payload) => {
  const now = new Date()
  const ts = now.toISOString()
  const line = { timestamp: ts, level, ...payload }
  if (PRETTY) {
    const msg = line.msg ? ` ${line.msg}` : ''
    const ctx = { ...line }
    delete ctx.timestamp; delete ctx.level; delete ctx.msg
    process.stdout.write(`${level.toUpperCase()}${msg} ${JSON.stringify(ctx)}\n`)
  } else {
    process.stdout.write(`${JSON.stringify(line)}\n`)
  }
  try {
    const cat = categoryOf(line)
    const s = streamFor(cat, level)
    s.write(`${JSON.stringify(line)}\n`)
  } catch {}
}

const pad = (n) => (n < 10 ? `0${n}` : `${n}`)
const fmtDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const rotateLogs = () => {
  const now = new Date()
  const prev = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
  const suffix = fmtDate(prev)
  const keys = Object.keys(streams)
  for (const key of keys) {
    const s = streams[key]
    const base = path.join(LOG_DIR, `${key}.log`)
    const rotated = path.join(LOG_DIR, `${key}.${suffix}.log`)
    try {
      s.end(() => {
        try {
          if (fs.existsSync(base)) fs.renameSync(base, rotated)
        } catch {}
      })
    } catch {}
    delete streams[key]
  }
}
const scheduleNextRotation = () => {
  const now = new Date()
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0)
  const ms = next.getTime() - now.getTime()
  setTimeout(() => { rotateLogs(); scheduleNextRotation() }, ms)
}
try { scheduleNextRotation() } catch {}

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
