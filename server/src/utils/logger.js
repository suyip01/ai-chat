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
    else if (typeof v === 'string' && v.length > 200) out[k] = v.slice(0,200) + `...(${v.length})`
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

const fmtPrefix = (d) => {
  const pad = (n) => String(n).padStart(2, '0')
  const y = d.getFullYear()
  const m = pad(d.getMonth() + 1)
  const day = pad(d.getDate())
  const hh = pad(d.getHours())
  const mm = pad(d.getMinutes())
  const ss = pad(d.getSeconds())
  return `[${y}-${m}-${day} ${hh}:${mm}:${ss}]`
}

const write = (level, payload) => {
  const now = new Date()
  const ts = now.toISOString()
  const prefix = fmtPrefix(now)
  const line = { timestamp: ts, level, ...payload }
  if (PRETTY) {
    const msg = line.msg ? ` ${line.msg}` : ''
    const ctx = { ...line }
    delete ctx.timestamp; delete ctx.level; delete ctx.msg
    process.stdout.write(`${prefix} ${level.toUpperCase()}${msg} ${JSON.stringify(ctx)}\n`)
  } else {
    process.stdout.write(`${prefix} ${JSON.stringify(line)}\n`)
  }
  try {
    const cat = categoryOf(line)
    const s = streamFor(cat, level)
    s.write(`${prefix} ${JSON.stringify(line)}\n`)
  } catch {}
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
