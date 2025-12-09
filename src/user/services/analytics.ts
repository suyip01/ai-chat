// 防御式封装，统一中文事件/标签调用
declare global { interface Window { clarity?: (...args: any[]) => void } }

const safe = () => typeof window !== 'undefined' && typeof window.clarity === 'function'

export const identifyUser = (info: { userId?: string | number; sessionId?: string | null; pageId?: string | null; name?: string | null }) => {
  try {
    try { console.log('[analytics] identifyUser', String(info.userId ?? ''), info?.name ?? null); } catch {}
    if (!safe()) return;
    const uid = (info.userId !== undefined && info.userId !== null) ? String(info.userId) : ''
    const sid = info.sessionId ?? null
    const pid = info.pageId ?? null
    const fname = info.name ?? null
    window.clarity!('identify', uid, sid, pid, fname)
  } catch {}
}

export const setTag = (key: string, value: any) => { try { if (!safe()) return; window.clarity!('set', key, value) } catch {} }

export const trackEvent = (name: string, props?: Record<string, any>) => {
  try {
    if (!safe()) return
    window.clarity!('event', name)
    if (props) Object.entries(props).forEach(([k, v]) => { try { window.clarity!('set', k, v) } catch {} })
  } catch {}
}

export default { identifyUser, setTag, trackEvent }
